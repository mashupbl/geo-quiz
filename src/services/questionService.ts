import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  writeBatch,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Question, QuestionAggregates, QuizAttempt, Continent } from '../types';
import { INITIAL_SEED_QUESTIONS } from '../data/seedQuestions';

const QUESTIONS_COL = 'questions';
const AGGREGATES_DOC = 'question_metadata/aggregates';
const ATTEMPTS_COL = 'quiz_attempts';

/**
 * Calculates aggregates in-memory from a list of questions
 */
export function calculateAggregatesFromQuestions(questions: Question[]): QuestionAggregates {
  const publishedList = questions.filter((q) => q.status === 'published');
  const draftList = questions.filter((q) => q.status === 'draft');
  const archivedList = questions.filter((q) => q.status === 'archived');

  const continents: Continent[] = [
    'Africa',
    'Asia',
    'Europe',
    'North America',
    'Oceania',
    'South America',
    'Antarctica',
  ];

  const byContinent: QuestionAggregates['byContinent'] = {};
  for (const c of continents) {
    byContinent[c] = {
      total: 0,
      byDifficulty: { easy: 0, medium: 0, hard: 0 },
      byTopic: {},
    };
  }

  for (const q of publishedList) {
    if (!byContinent[q.continent]) {
      byContinent[q.continent] = {
        total: 0,
        byDifficulty: { easy: 0, medium: 0, hard: 0 },
        byTopic: {},
      };
    }
    const cObj = byContinent[q.continent]!;
    cObj.total += 1;
    if (q.difficulty in cObj.byDifficulty) {
      cObj.byDifficulty[q.difficulty] += 1;
    }
    const topic = q.topic || 'General';
    cObj.byTopic[topic] = (cObj.byTopic[topic] || 0) + 1;
  }

  return {
    totalPublished: publishedList.length,
    totalDraft: draftList.length,
    totalArchived: archivedList.length,
    lastSyncedAt: new Date().toISOString(),
    byContinent,
  };
}

/**
 * Recalculate and persist aggregates to Firestore
 */
export async function syncAggregatesToFirestore(): Promise<QuestionAggregates> {
  try {
    const qSnap = await getDocs(collection(db, QUESTIONS_COL));
    const allQuestions: Question[] = [];
    qSnap.forEach((d) => allQuestions.push(d.data() as Question));

    const aggregates = calculateAggregatesFromQuestions(allQuestions);
    await setDoc(doc(db, AGGREGATES_DOC), aggregates, { merge: true });
    return aggregates;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, AGGREGATES_DOC);
  }
}

/**
 * Real-time listener for question aggregates
 */
export function listenToAggregates(callback: (agg: QuestionAggregates | null) => void) {
  try {
    const aggRef = doc(db, AGGREGATES_DOC);
    return onSnapshot(
      aggRef,
      (snapshot) => {
        if (snapshot.exists()) {
          callback(snapshot.data() as QuestionAggregates);
        } else {
          callback(null);
        }
      },
      (error) => {
        console.warn('Aggregates listener note:', error);
        callback(null);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, AGGREGATES_DOC);
  }
}

/**
 * Real-time listener for published questions (Req 4, 7, 9)
 */
export function listenToPublishedQuestions(callback: (questions: Question[]) => void) {
  try {
    const q = query(
      collection(db, QUESTIONS_COL),
      where('status', '==', 'published')
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const list: Question[] = [];
        snapshot.forEach((d) => list.push(d.data() as Question));
        callback(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, QUESTIONS_COL);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, QUESTIONS_COL);
  }
}

/**
 * Check if a question ID already exists in the database (Req 5)
 */
export async function checkQuestionIdExists(id: string): Promise<boolean> {
  try {
    const docRef = doc(db, QUESTIONS_COL, id);
    const snap = await getDoc(docRef);
    return snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${QUESTIONS_COL}/${id}`);
  }
}

/**
 * Create a new question with uniqueness verification
 */
export async function createQuestion(question: Question): Promise<void> {
  try {
    const docRef = doc(db, QUESTIONS_COL, question.id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      throw new Error(`Question ID "${question.id}" already exists. Please choose a unique ID.`);
    }

    const payload: Question = {
      ...question,
      createdAt: question.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: question.status === 'published' ? (question.publishedAt || new Date().toISOString()) : null,
    };

    await setDoc(docRef, payload);
    await syncAggregatesToFirestore();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${QUESTIONS_COL}/${question.id}`);
  }
}

/**
 * Update existing question (status, text, options, etc.)
 */
export async function updateQuestion(question: Question): Promise<void> {
  try {
    const docRef = doc(db, QUESTIONS_COL, question.id);
    const payload: Question = {
      ...question,
      updatedAt: new Date().toISOString(),
      publishedAt: question.status === 'published' && !question.publishedAt
        ? new Date().toISOString()
        : question.publishedAt,
    };

    await setDoc(docRef, payload, { merge: true });
    await syncAggregatesToFirestore();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${QUESTIONS_COL}/${question.id}`);
  }
}

/**
 * Delete a question
 */
export async function deleteQuestion(questionId: string): Promise<void> {
  try {
    const docRef = doc(db, QUESTIONS_COL, questionId);
    await deleteDoc(docRef);
    await syncAggregatesToFirestore();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${QUESTIONS_COL}/${questionId}`);
  }
}

/**
 * Batch import questions (from Sheets, CSV, or AI batch)
 */
export async function batchImportQuestions(
  questions: Question[],
  overwriteExisting = false
): Promise<{ added: number; skipped: number; errors: string[] }> {
  try {
    let added = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Firestore batch limit is 500 operations
    const BATCH_SIZE = 400;
    for (let i = 0; i < questions.length; i += BATCH_SIZE) {
      const chunk = questions.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);

      for (const q of chunk) {
        if (!q.id || !q.questionText || !q.correctAnswer || !q.options || q.options.length !== 4) {
          skipped += 1;
          errors.push(`Invalid format for question "${q.id || 'Unknown ID'}"`);
          continue;
        }

        const docRef = doc(db, QUESTIONS_COL, q.id);
        if (!overwriteExisting) {
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            skipped += 1;
            continue;
          }
        }

        const payload: Question = {
          ...q,
          createdAt: q.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          publishedAt: q.status === 'published' ? (q.publishedAt || new Date().toISOString()) : null,
        };

        batch.set(docRef, payload);
        added += 1;
      }

      await batch.commit();
    }

    await syncAggregatesToFirestore();
    return { added, skipped, errors };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, QUESTIONS_COL);
  }
}

/**
 * Initialize database with curated seed questions if empty
 */
export async function seedInitialQuestionsIfEmpty(): Promise<boolean> {
  try {
    const qSnap = await getDocs(query(collection(db, QUESTIONS_COL), limit(1)));
    if (qSnap.empty) {
      console.log('Seeding initial geography question bank...');
      await batchImportQuestions(INITIAL_SEED_QUESTIONS, true);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Seeding check warning:', err);
    return false;
  }
}

/**
 * Force re-seed or expand with initial bank
 */
export async function seedQuestionsExplicitly(): Promise<{ added: number; skipped: number }> {
  return await batchImportQuestions(INITIAL_SEED_QUESTIONS, true);
}

/**
 * Save immutable historical quiz attempt snapshot (Req 14)
 */
export async function saveQuizAttempt(attempt: QuizAttempt): Promise<void> {
  try {
    const docRef = doc(db, ATTEMPTS_COL, attempt.id);
    await setDoc(docRef, attempt);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${ATTEMPTS_COL}/${attempt.id}`);
  }
}

/**
 * Fetch past quiz attempts
 */
export function listenToAttempts(callback: (attempts: QuizAttempt[]) => void) {
  try {
    const q = query(collection(db, ATTEMPTS_COL), limit(50));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: QuizAttempt[] = [];
        snapshot.forEach((d) => list.push(d.data() as QuizAttempt));
        // Sort descending by completion date
        list.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
        callback(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, ATTEMPTS_COL);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, ATTEMPTS_COL);
  }
}
