import { Question, QuizConfig, QuestionSnapshot } from '../types';

/**
 * Fisher-Yates array shuffling
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export interface PreparedQuizQuestion {
  questionId: string;
  continent: string;
  topic: string;
  difficulty: string;
  questionText: string;
  options: string[]; // shuffled options
  correctAnswer: string;
  explanation: string;
  imageUrl?: string | null;
}

export interface GeneratedQuizResult {
  questions: PreparedQuizQuestion[];
  totalAvailable: number;
  totalDelivered: number;
  notice: string | null;
}

/**
 * Generates dynamic quiz questions adhering to Req 10, 11, 12
 */
export function generateQuiz(
  publishedQuestions: Question[],
  config: QuizConfig
): GeneratedQuizResult {
  // Filter by category
  let pool = publishedQuestions.filter((q) => q.status === 'published');

  if (config.continent !== 'All') {
    pool = pool.filter((q) => q.continent === config.continent);
  }

  if (config.topic !== 'All' && config.topic) {
    pool = pool.filter((q) => q.topic.toLowerCase() === config.topic.toLowerCase());
  }

  if (config.difficulty !== 'All') {
    pool = pool.filter((q) => q.difficulty === config.difficulty);
  }

  const availableCount = pool.length;

  if (availableCount === 0) {
    return {
      questions: [],
      totalAvailable: 0,
      totalDelivered: 0,
      notice: `No published questions match the selected category (${config.continent} - ${config.topic} - ${config.difficulty}).`,
    };
  }

  const requested = Math.max(1, config.questionCount);
  const countToServe = Math.min(availableCount, requested);

  let notice: string | null = null;
  if (availableCount < requested) {
    notice = `Requested ${requested} questions, but only ${availableCount} published question${
      availableCount === 1 ? '' : 's'
    } are available for this specific selection. Serving all ${availableCount} questions.`;
  }

  // Shuffle questions if configured (Req 11)
  const orderedPool = config.randomizeQuestionOrder ? shuffleArray(pool) : [...pool];
  const selected = orderedPool.slice(0, countToServe);

  // Prepare questions with option shuffling
  const prepared: PreparedQuizQuestion[] = selected.map((q) => {
    const options = config.randomizeOptionOrder ? shuffleArray(q.options) : [...q.options];

    return {
      questionId: q.id,
      continent: q.continent,
      topic: q.topic,
      difficulty: q.difficulty,
      questionText: q.questionText,
      options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      imageUrl: q.imageUrl || null,
    };
  });

  return {
    questions: prepared,
    totalAvailable: availableCount,
    totalDelivered: countToServe,
    notice,
  };
}

/**
 * Creates an immutable snapshot from an answered quiz question (Req 14)
 */
export function createSnapshotFromAttempt(
  prepared: PreparedQuizQuestion,
  selectedAnswer: string | null
): QuestionSnapshot {
  return {
    questionId: prepared.questionId,
    questionText: prepared.questionText,
    options: [...prepared.options],
    correctAnswer: prepared.correctAnswer,
    selectedAnswer,
    isCorrect: selectedAnswer !== null && selectedAnswer.trim() === prepared.correctAnswer.trim(),
    explanation: prepared.explanation,
    imageUrl: prepared.imageUrl || null,
  };
}
