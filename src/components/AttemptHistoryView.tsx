import React, { useState } from 'react';
import {
  History,
  Calendar,
  CheckCircle2,
  XCircle,
  Eye,
  ChevronRight,
  X,
  FileCheck,
  ShieldCheck,
  Trophy,
  Layers,
} from 'lucide-react';
import { QuizAttempt } from '../types';

interface AttemptHistoryViewProps {
  attempts: QuizAttempt[];
  onTakeQuizAgain: () => void;
}

export const AttemptHistoryView: React.FC<AttemptHistoryViewProps> = ({
  attempts,
  onTakeQuizAgain,
}) => {
  const [selectedAttempt, setSelectedAttempt] = useState<QuizAttempt | null>(null);

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return (
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
        ' • ' +
        d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
      );
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-purple-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Immutable Historical Records (Req 8 & Req 14)</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Historical Quiz Attempts & Snapshots
          </h1>
          <p className="text-slate-400 mt-1 max-w-2xl text-sm">
            Every completed quiz freezes an immutable copy of question prompts, shuffled options, and
            explanations. Even if a question in the bank is subsequently edited or archived, previous
            attempts remain completely interpretable and authentic.
          </p>
        </div>

        <button
          onClick={onTakeQuizAgain}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md transition-colors self-start"
        >
          <Trophy className="w-4 h-4" />
          <span>Take New Quiz</span>
        </button>
      </div>

      {/* Attempts List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {attempts.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <History className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="text-base font-semibold text-slate-300">No quiz attempts recorded yet.</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Launch a quiz from the "Take Quiz" tab to create your first historical snapshot record.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {attempts.map((att) => {
              const isPassing = att.percentage >= 70;

              return (
                <div
                  key={att.id}
                  onClick={() => setSelectedAttempt(att)}
                  className="p-5 hover:bg-slate-800/50 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-semibold text-slate-300">
                        {att.id}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-xs font-medium text-slate-300">
                        {att.studentName}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{formatDate(att.completedAt)}</span>
                      </span>
                      <span>•</span>
                      <span>Category: {att.category.continent}</span>
                      {att.category.topic !== 'All' && <span>/ {att.category.topic}</span>}
                      {att.category.difficulty !== 'All' && <span>/ {att.category.difficulty}</span>}
                    </div>
                  </div>

                  {/* Score & Badge */}
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="flex items-baseline space-x-2">
                        <span className="text-xl font-extrabold text-white">
                          {att.score}/{att.totalQuestions}
                        </span>
                        <span
                          className={`text-sm font-bold ${
                            isPassing ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          ({att.percentage}%)
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {att.questions.length} questions snapshot
                      </span>
                    </div>

                    <button
                      className="p-2 rounded-xl bg-slate-800 group-hover:bg-slate-700 text-slate-300 group-hover:text-white transition-colors"
                      title="Inspect attempt snapshot"
                    >
                      <ChevronRight className="w-5 h-5 text-emerald-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Snapshot Inspector Modal */}
      {selectedAttempt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800 sticky top-0 bg-slate-900/95 backdrop-blur z-10">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    {selectedAttempt.id}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Completed {formatDate(selectedAttempt.completedAt)}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white mt-1">
                  Attempt Snapshot: {selectedAttempt.score}/{selectedAttempt.totalQuestions} (
                  {selectedAttempt.percentage}%)
                </h2>
              </div>
              <button
                onClick={() => setSelectedAttempt(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 text-xs text-slate-300 flex items-center justify-between">
                <span>
                  <strong>Student:</strong> {selectedAttempt.studentName} •{' '}
                  <strong>Category:</strong> {selectedAttempt.category.continent} ({selectedAttempt.category.topic})
                </span>
                <span className="text-emerald-400 font-medium">Frozen Historical Snapshot</span>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                {selectedAttempt.questions.map((snap, i) => (
                  <div
                    key={i}
                    className={`p-5 rounded-xl border ${
                      snap.isCorrect ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-950/40 border-rose-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono mb-2">
                      <span className="font-bold text-slate-300">
                        Question #{i + 1} ({snap.questionId})
                      </span>
                      {snap.isCorrect ? (
                        <span className="flex items-center space-x-1 text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Answered Correctly</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-1 text-rose-400 font-semibold">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Answered Incorrectly</span>
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-semibold text-white leading-relaxed">
                      {snap.questionText}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                      {snap.options.map((opt, oIdx) => {
                        const wasChosen = snap.selectedAnswer === opt;
                        const isAnswer = opt === snap.correctAnswer;

                        let style = 'bg-slate-900 border-slate-800 text-slate-400';
                        if (isAnswer) {
                          style = 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300 font-semibold';
                        } else if (wasChosen && !isAnswer) {
                          style = 'bg-rose-950/60 border-rose-500/60 text-rose-300';
                        }

                        return (
                          <div
                            key={oIdx}
                            className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${style}`}
                          >
                            <span>
                              {String.fromCharCode(65 + oIdx)}. {opt}
                            </span>
                            {wasChosen && (
                              <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-800">
                                Chosen
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <p className="text-xs text-slate-400 mt-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                      <strong className="text-slate-300">Explanation at time of attempt: </strong>
                      {snap.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
