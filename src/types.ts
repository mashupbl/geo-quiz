export type Continent =
  | 'Africa'
  | 'Asia'
  | 'Europe'
  | 'North America'
  | 'Oceania'
  | 'South America'
  | 'Antarctica';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type QuestionStatus = 'draft' | 'published' | 'archived';

export type QuestionSource = 'manual' | 'ai_generated' | 'sheet_sync' | 'seed';

export interface Question {
  id: string; // Unique question ID (Req 5)
  continent: Continent;
  topic: string;
  difficulty: Difficulty;
  questionText: string;
  options: [string, string, string, string]; // exactly 4 options
  correctAnswer: string;
  explanation: string;
  imageUrl?: string | null;
  status: QuestionStatus; // Draft, Published, Archived (Req 7)
  source?: QuestionSource;
  reviewFlag?: string | null; // e.g. "Flagged for fact-check"
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string | null;
}

export interface QuestionAggregates {
  totalPublished: number;
  totalDraft: number;
  totalArchived: number;
  lastSyncedAt: string;
  byContinent: {
    [key in Continent]?: {
      total: number;
      byDifficulty: {
        easy: number;
        medium: number;
        hard: number;
      };
      byTopic: {
        [topic: string]: number;
      };
    };
  };
}

export interface QuestionSnapshot {
  questionId: string;
  questionText: string;
  options: string[]; // presented order (shuffled)
  correctAnswer: string;
  selectedAnswer: string | null;
  isCorrect: boolean;
  explanation: string;
  imageUrl?: string | null;
}

export interface QuizAttempt {
  id: string;
  studentId: string;
  studentName: string;
  startedAt: string;
  completedAt: string;
  category: {
    continent: string;
    topic: string;
    difficulty: string;
  };
  score: number;
  totalQuestions: number;
  percentage: number;
  questions: QuestionSnapshot[]; // Immutable snapshot
}

export interface QuizConfig {
  continent: Continent | 'All';
  topic: string | 'All';
  difficulty: Difficulty | 'All';
  questionCount: number;
  randomizeQuestionOrder: boolean;
  randomizeOptionOrder: boolean;
}

export interface SeedProgress {
  total: number;
  current: number;
  status: 'idle' | 'seeding' | 'completed' | 'error';
  message: string;
}
