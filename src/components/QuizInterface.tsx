import React, { useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  Compass,
  Trophy,
  AlertTriangle,
  Clock,
  Shuffle,
  Eye,
  Layers,
} from 'lucide-react';
import {
  Question,
  Continent,
  Difficulty,
  QuizConfig,
  QuizAttempt,
  QuestionSnapshot,
} from '../types';
import { generateQuiz, PreparedQuizQuestion, createSnapshotFromAttempt } from '../services/quizEngine';

interface QuizInterfaceProps {
  publishedQuestions: Question[];
  onSaveAttempt: (attempt: QuizAttempt) => Promise<void>;
  preselectedContinent?: Continent | 'All';
  preselectedTopic?: string | 'All';
  preselectedDifficulty?: Difficulty | 'All';
  onViewHistory: () => void;
}

export const QuizInterface: React.FC<QuizInterfaceProps> = ({
  publishedQuestions,
  onSaveAttempt,
  preselectedContinent = 'All',
  preselectedTopic = 'All',
  preselectedDifficulty = 'All',
  onViewHistory,
}) => {
  // Phase: 'config' | 'active' | 'results'
  const [phase, setPhase] = useState<'config' | 'active' | 'results'>('config');

  // Config State
  const [continent, setContinent] = useState<Continent | 'All'>(preselectedContinent);
  const [topic, setTopic] = useState<string | 'All'>(preselectedTopic);
  const [difficulty, setDifficulty] = useState<Difficulty | 'All'>(preselectedDifficulty);
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [randomizeQuestions, setRandomizeQuestions] = useState<boolean>(true);
  const [randomizeOptions, setRandomizeOptions] = useState<boolean>(true);
  const [instantFeedback, setInstantFeedback] = useState<boolean>(true);
  const [studentName, setStudentName] = useState<string>('Geography Student');

  // Active Quiz State
  const [quizQuestions, setQuizQuestions] = useState<PreparedQuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [index: number]: string }>({});
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<string>('');

  // Results State
  const [completedAttempt, setCompletedAttempt] = useState<QuizAttempt | null>(null);
  const [isSavingAttempt, setIsSavingAttempt] = useState<boolean>(false);

  // Topics available in currently selected continent
  const availableTopics = useMemo(() => {
    let pool = publishedQuestions;
    if (continent !== 'All') {
      pool = pool.filter((q) => q.continent === continent);
    }
    const topicsSet = new Set<string>();
    pool.forEach((q) => {
      if (q.topic) topicsSet.add(q.topic);
    });
    return Array.from(topicsSet).sort();
  }, [publishedQuestions, continent]);

  // Live count matching configuration (Req 9, 10, 12)
  const matchingQuestionsCount = useMemo(() => {
    return publishedQuestions.filter((q) => {
      if (continent !== 'All' && q.continent !== continent) return false;
      if (topic !== 'All' && q.topic.toLowerCase() !== topic.toLowerCase()) return false;
      if (difficulty !== 'All' && q.difficulty !== difficulty) return false;
      return true;
    }).length;
  }, [publishedQuestions, continent, topic, difficulty]);

  // Launch Quiz
  const handleStartQuiz = () => {
    const config: QuizConfig = {
      continent,
      topic,
      difficulty,
      questionCount,
      randomizeQuestionOrder: randomizeQuestions,
      randomizeOptionOrder: randomizeOptions,
    };

    const result = generateQuiz(publishedQuestions, config);
    if (result.questions.length === 0) {
      alert('No published questions are available for the selected category.');
      return;
    }

    setQuizQuestions(result.questions);
    setFallbackNotice(result.notice);
    setSelectedAnswers({});
    setCurrentIndex(0);
    setStartTime(new Date().toISOString());
    setPhase('active');
  };

  // Select Answer for Current Question
  const handleSelectOption = (option: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentIndex]: option,
    }));
  };

  // Submit Quiz and Freeze Snapshot (Req 14)
  const handleSubmitQuiz = async () => {
    const finishTime = new Date().toISOString();

    const snapshots: QuestionSnapshot[] = quizQuestions.map((q, idx) => {
      const studentAns = selectedAnswers[idx] || null;
      return createSnapshotFromAttempt(q, studentAns);
    });

    const correctCount = snapshots.filter((s) => s.isCorrect).length;
    const totalCount = snapshots.length;
    const percentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

    const attemptId = `ATTEMPT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const attemptRecord: QuizAttempt = {
      id: attemptId,
      studentId: 'guest-student',
      studentName: studentName.trim() || 'Anonymous Explorer',
      startedAt: startTime,
      completedAt: finishTime,
      category: {
        continent,
        topic,
        difficulty,
      },
      score: correctCount,
      totalQuestions: totalCount,
      percentage,
      questions: snapshots, // Frozen snapshot of questions, options, and explanations
    };

    setCompletedAttempt(attemptRecord);
    setPhase('results');

    // Trigger celebration if score >= 70%
    if (percentage >= 70) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore in non-browser env
      }
    }

    // Persist attempt to Firestore (Req 14)
    try {
      setIsSavingAttempt(true);
      await onSaveAttempt(attemptRecord);
      setIsSavingAttempt(false);
    } catch (err) {
      console.error('Failed to save attempt record snapshot:', err);
      setIsSavingAttempt(false);
    }
  };

  /* ------------------------------------------------------------- */
  /* PHASE 1: CONFIGURATION & SETUP                                */
  /* ------------------------------------------------------------- */
  if (phase === 'config') {
    return (
      <div className="max-w-3xl mx-auto space-y-8 py-4">
        {/* Intro Banner */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
            <Compass className="w-3.5 h-3.5" />
            <span>Dynamic MCQ Quiz Engine</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Configure Your Geography Quiz
          </h1>
          <p className="text-sm text-slate-400 max-w-lg mx-auto">
            Choose your continent, topic, and difficulty. Questions are pulled dynamically from the live
            published bank with automatic fallbacks and Fisher-Yates shuffling.
          </p>
        </div>

        {/* Configuration Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          {/* Student Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Learner Name / Student ID
            </label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="e.g. Alex Traveler"
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Grid 1: Continent & Topic */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Target Continent
              </label>
              <select
                value={continent}
                onChange={(e) => {
                  setContinent(e.target.value as Continent | 'All');
                  setTopic('All'); // Reset topic filter on continent change
                }}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="All">All Continents (World Wide)</option>
                <option value="Africa">Africa</option>
                <option value="Asia">Asia</option>
                <option value="Europe">Europe</option>
                <option value="North America">North America</option>
                <option value="Oceania">Oceania</option>
                <option value="South America">South America</option>
                <option value="Antarctica">Antarctica</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Specific Topic
              </label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="All">All Topics</option>
                {availableTopics.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid 2: Difficulty & Quiz Length */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Difficulty Level
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty | 'All')}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="All">Mixed / All Difficulties</option>
                <option value="easy">Easy (Foundational)</option>
                <option value="medium">Medium (Intermediate)</option>
                <option value="hard">Hard (Advanced)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Desired Question Count
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[3, 5, 10, 15].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setQuestionCount(cnt)}
                    className={`py-2 rounded-xl text-sm font-semibold transition-all border ${
                      questionCount === cnt
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-900/30'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {cnt} Qs
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Availability Status Card (Req 9, 10, 12) */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  matchingQuestionsCount > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                }`}
              ></div>
              <div>
                <span className="text-sm font-semibold text-white block">
                  {matchingQuestionsCount} Published Question
                  {matchingQuestionsCount === 1 ? '' : 's'} Currently Available
                </span>
                <span className="text-xs text-slate-400">
                  Matches: {continent} • {topic} • {difficulty}
                </span>
              </div>
            </div>

            {matchingQuestionsCount > 0 && matchingQuestionsCount < questionCount && (
              <span className="text-xs font-medium text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                Will serve all {matchingQuestionsCount} available
              </span>
            )}
          </div>

          {/* Engine Settings (Req 11: Shuffling options & order) */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Quiz Engine Options
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer p-2.5 bg-slate-800/40 rounded-xl border border-slate-800 hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={randomizeQuestions}
                  onChange={(e) => setRandomizeQuestions(e.target.checked)}
                  className="w-4 h-4 text-emerald-500 rounded border-slate-700 bg-slate-900"
                />
                <span>Randomize Question Order</span>
              </label>

              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer p-2.5 bg-slate-800/40 rounded-xl border border-slate-800 hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={randomizeOptions}
                  onChange={(e) => setRandomizeOptions(e.target.checked)}
                  className="w-4 h-4 text-emerald-500 rounded border-slate-700 bg-slate-900"
                />
                <span>Shuffle Answer Options (A-D)</span>
              </label>

              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer p-2.5 bg-slate-800/40 rounded-xl border border-slate-800 hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={instantFeedback}
                  onChange={(e) => setInstantFeedback(e.target.checked)}
                  className="w-4 h-4 text-emerald-500 rounded border-slate-700 bg-slate-900"
                />
                <span>Instant Explanation Mode</span>
              </label>
            </div>
          </div>

          {/* Launch Button */}
          <div className="pt-4">
            <button
              onClick={handleStartQuiz}
              disabled={matchingQuestionsCount === 0}
              className={`w-full py-4 rounded-xl font-bold text-base flex items-center justify-center space-x-2 shadow-xl transition-all ${
                matchingQuestionsCount > 0
                  ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-emerald-950/40 hover:scale-[1.01] active:scale-[0.99]'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <Sparkles className="w-5 h-5" />
              <span>
                {matchingQuestionsCount === 0
                  ? 'No Questions in Selected Category'
                  : `Start Quiz (${Math.min(matchingQuestionsCount, questionCount)} Questions)`}
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------- */
  /* PHASE 2: ACTIVE QUIZ TAKING                                   */
  /* ------------------------------------------------------------- */
  const currentQ = quizQuestions[currentIndex];
  const userChoice = selectedAnswers[currentIndex];
  const totalInQuiz = quizQuestions.length;
  const answeredCount = Object.keys(selectedAnswers).length;
  const isLastQuestion = currentIndex === totalInQuiz - 1;

  if (phase === 'active' && currentQ) {
    const isAnswered = Boolean(userChoice);
    const isCorrectChoice = userChoice === currentQ.correctAnswer;

    return (
      <div className="max-w-3xl mx-auto space-y-6 py-4">
        {/* Graceful Fallback Notice (Req 12) */}
        {fallbackNotice && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{fallbackNotice}</span>
          </div>
        )}

        {/* Progress Bar & Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span className="flex items-center space-x-2">
              <span className="text-white font-bold text-sm">
                Question {currentIndex + 1} of {totalInQuiz}
              </span>
              <span className="text-slate-600">•</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {currentQ.continent}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {currentQ.topic}
              </span>
            </span>

            <span className="capitalize px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {currentQ.difficulty}
            </span>
          </div>

          {/* Segmented/Fluid Progress Bar */}
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / totalInQuiz) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          {/* Optional illustration */}
          {currentQ.imageUrl && (
            <div className="w-full h-48 sm:h-64 rounded-xl overflow-hidden border border-slate-800 relative shadow-inner">
              <img
                src={currentQ.imageUrl}
                alt="Geography landmark"
                className="w-full h-full object-cover"
                onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
              />
            </div>
          )}

          {/* Prompt */}
          <h2 className="text-xl sm:text-2xl font-bold text-white leading-snug">
            {currentQ.questionText}
          </h2>

          {/* 4 Shuffled Options (Req 11) */}
          <div className="space-y-3">
            {currentQ.options.map((opt, idx) => {
              const letter = String.fromCharCode(65 + idx);
              const isSelected = userChoice === opt;
              const isCorrect = opt === currentQ.correctAnswer;

              let btnStyle = 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-200';

              if (instantFeedback && isAnswered) {
                if (isCorrect) {
                  btnStyle = 'bg-emerald-950/60 border-emerald-500 text-white font-semibold ring-1 ring-emerald-500';
                } else if (isSelected && !isCorrect) {
                  btnStyle = 'bg-rose-950/60 border-rose-500 text-white ring-1 ring-rose-500';
                } else {
                  btnStyle = 'bg-slate-800/40 border-slate-800 text-slate-500 opacity-60';
                }
              } else if (isSelected) {
                btnStyle = 'bg-emerald-600/30 border-emerald-500 text-white font-semibold ring-2 ring-emerald-500';
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(opt)}
                  className={`w-full p-4 rounded-xl border text-left flex items-center justify-between transition-all duration-150 text-sm sm:text-base ${btnStyle}`}
                >
                  <div className="flex items-center space-x-3.5">
                    <span className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center font-bold text-xs text-slate-300 border border-slate-700">
                      {letter}
                    </span>
                    <span>{opt}</span>
                  </div>

                  {instantFeedback && isAnswered && isCorrect && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  )}
                  {instantFeedback && isAnswered && isSelected && !isCorrect && (
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Instant Explanation Feedback (if enabled and answered) */}
          {instantFeedback && isAnswered && (
            <div
              className={`p-4 rounded-xl border transition-all ${
                isCorrectChoice
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                  : 'bg-rose-950/20 border-rose-500/30 text-rose-200'
              }`}
            >
              <div className="flex items-center space-x-2 font-bold text-sm mb-1">
                {isCorrectChoice ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Correct!</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-rose-400" />
                    <span className="text-rose-400">
                      Incorrect. The correct answer is: {currentQ.correctAnswer}
                    </span>
                  </>
                )}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mt-1">
                {currentQ.explanation}
              </p>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            {isLastQuestion ? (
              <button
                onClick={handleSubmitQuiz}
                disabled={!userChoice}
                className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-50"
              >
                <span>Submit Quiz & View Results</span>
                <Trophy className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setCurrentIndex((prev) => Math.min(totalInQuiz - 1, prev + 1))}
                className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-md shadow-emerald-900/20 transition-all"
              >
                <span>Next Question</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------- */
  /* PHASE 3: RESULTS & IMMUTABLE AUDIT SNAPSHOT REVIEW            */
  /* ------------------------------------------------------------- */
  if (phase === 'results' && completedAttempt) {
    const isPassing = completedAttempt.percentage >= 70;

    return (
      <div className="max-w-3xl mx-auto space-y-8 py-4">
        {/* Scorecard Hero */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center space-y-4">
          <div
            className={`w-20 h-20 mx-auto rounded-2xl flex items-center justify-center shadow-lg ${
              isPassing
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-emerald-900/30'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-amber-900/30'
            }`}
          >
            <Trophy className="w-10 h-10" />
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Quiz Completed • {completedAttempt.studentName}
            </span>
            <h1 className="text-4xl font-extrabold text-white mt-1">
              {completedAttempt.score} / {completedAttempt.totalQuestions} Correct
            </h1>
            <p className="text-lg font-bold text-emerald-400 mt-1">
              Score: {completedAttempt.percentage}%
            </p>
          </div>

          <p className="text-sm text-slate-300 max-w-md mx-auto">
            {isPassing
              ? 'Outstanding performance! You have mastered this geographical domain.'
              : 'Good effort! Review the detailed question snapshots below to reinforce key geographical concepts.'}
          </p>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-400 inline-block font-mono">
            Attempt Snapshot ID: {completedAttempt.id} • Frozen Audit Log Saved
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
            <button
              onClick={() => setPhase('config')}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Configure New Quiz</span>
            </button>

            <button
              onClick={onViewHistory}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-sm transition-colors"
            >
              <Clock className="w-4 h-4 text-purple-300" />
              <span>View Attempt History</span>
            </button>
          </div>
        </div>

        {/* Detailed Question-by-Question Snapshot Review (Req 14) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>Historical Question Review & Explanations</span>
            </h2>
            <span className="text-xs text-slate-400">Immutable snapshot state</span>
          </div>

          <div className="space-y-4">
            {completedAttempt.questions.map((qSnap, idx) => {
              return (
                <div
                  key={idx}
                  className={`p-6 rounded-2xl border transition-all ${
                    qSnap.isCorrect
                      ? 'bg-slate-900 border-slate-800'
                      : 'bg-slate-900 border-rose-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2 text-xs font-mono">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        Q{idx + 1}
                      </span>
                      <span className="text-slate-400">{qSnap.questionId}</span>
                    </div>

                    {qSnap.isCorrect ? (
                      <span className="flex items-center space-x-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Correct</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1 text-xs font-semibold text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Incorrect</span>
                      </span>
                    )}
                  </div>

                  <p className="text-base font-semibold text-white mt-2 leading-relaxed">
                    {qSnap.questionText}
                  </p>

                  {/* Options with student pick highlighted */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                    {qSnap.options.map((opt, oIdx) => {
                      const wasSelected = qSnap.selectedAnswer === opt;
                      const isTargetCorrect = opt === qSnap.correctAnswer;

                      let style = 'bg-slate-800/40 border-slate-800 text-slate-400';
                      if (isTargetCorrect) {
                        style = 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200 font-semibold';
                      } else if (wasSelected && !isTargetCorrect) {
                        style = 'bg-rose-950/40 border-rose-500/60 text-rose-200 font-medium';
                      }

                      return (
                        <div
                          key={oIdx}
                          className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${style}`}
                        >
                          <span>
                            {String.fromCharCode(65 + oIdx)}. {opt}
                          </span>
                          {wasSelected && (
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-800">
                              Your Answer
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  <div className="mt-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
                    <strong className="text-emerald-400 font-semibold">Educational Explanation: </strong>
                    <span>{qSnap.explanation}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return null;
};
