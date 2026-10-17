import React, { useState } from 'react';
import {
  X,
  Sparkles,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Trash2,
  Edit2,
  RefreshCw,
  Eye,
  CheckSquare,
  ShieldAlert,
} from 'lucide-react';
import { Question, Continent, Difficulty, QuestionStatus } from '../types';

interface AIQuestionGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveQuestions: (questions: Question[]) => Promise<void>;
  existingQuestions: Question[];
}

export const AIQuestionGeneratorModal: React.FC<AIQuestionGeneratorModalProps> = ({
  isOpen,
  onClose,
  onSaveQuestions,
  existingQuestions,
}) => {
  const [continent, setContinent] = useState<Continent>('Africa');
  const [topic, setTopic] = useState('Physical Geography');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [count, setCount] = useState<number>(3);
  const [specificNotes, setSpecificNotes] = useState('');
  const [autoPublish, setAutoPublish] = useState<boolean>(false); // Req 13: Must not publish automatically unless explicitly enabled

  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generatedList, setGeneratedList] = useState<Question[]>([]);
  const [similarityWarnings, setSimilarityWarnings] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  // Simple string similarity helper (Jaccard on words) to detect similar questions
  const checkSimilarity = (text1: string, text2: string): number => {
    const words1 = new Set(text1.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/));
    const words2 = new Set(text2.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/));
    const intersection = new Set([...words1].filter((w) => words2.has(w) && w.length > 3));
    const union = new Set([...words1, ...words2]);
    if (union.size === 0) return 0;
    return intersection.size / union.size;
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    setSimilarityWarnings([]);

    try {
      const existingPrompts = existingQuestions
        .filter((q) => q.continent === continent)
        .map((q) => q.questionText);

      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          continent,
          topic,
          difficulty,
          count,
          specificNotes,
          existingQuestions: existingPrompts,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate questions with AI.');
      }

      const rawQuestions: Question[] = data.questions || [];

      // Validate & deduplicate against existing bank
      const warnings: string[] = [];
      const validated = rawQuestions.map((q, idx) => {
        // Check for duplicate ID
        let safeId = q.id;
        while (existingQuestions.some((eq) => eq.id.toLowerCase() === safeId.toLowerCase())) {
          safeId = `${q.id}-r${Math.floor(Math.random() * 90 + 10)}`;
        }

        // Substantially similar check (Req 13)
        for (const existing of existingQuestions) {
          const sim = checkSimilarity(q.questionText, existing.questionText);
          if (sim > 0.45) {
            warnings.push(
              `Question "${q.questionText.slice(0, 45)}..." is substantially similar to existing question ID ${existing.id}.`
            );
          }
        }

        return {
          ...q,
          id: safeId,
          status: (autoPublish ? 'published' : 'draft') as QuestionStatus, // Req 13
          publishedAt: autoPublish ? new Date().toISOString() : null,
        };
      });

      setGeneratedList(validated);
      setSimilarityWarnings(warnings);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error communicating with AI service.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRemoveItem = (id: string) => {
    setGeneratedList((prev) => prev.filter((q) => q.id !== id));
  };

  const handleSaveAll = async () => {
    if (generatedList.length === 0) return;
    setIsSaving(true);
    try {
      await onSaveQuestions(generatedList);
      setIsSaving(false);
      onClose();
    } catch (err: any) {
      setIsSaving(false);
      setErrorMsg(err.message || 'Failed to save generated questions.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 sticky top-0 bg-slate-900/95 backdrop-blur z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">AI Question Generation Studio</h2>
              <p className="text-xs text-slate-400">
                Powered by Gemini • Automated 4-option validation • Deduplication & Fact uncertainty flags
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Configuration Form */}
          <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Continent
                </label>
                <select
                  value={continent}
                  onChange={(e) => setContinent(e.target.value as Continent)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
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
                  Topic
                </label>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Physical Geography">Physical Geography</option>
                  <option value="Capitals & Cities">Capitals & Cities</option>
                  <option value="Rivers & Lakes">Rivers & Lakes</option>
                  <option value="Mountains & Landforms">Mountains & Landforms</option>
                  <option value="Climate & Biomes">Climate & Biomes</option>
                  <option value="Borders & Territories">Borders & Territories</option>
                  <option value="Famous Landmarks">Famous Landmarks</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Quantity
                </label>
                <select
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold"
                >
                  <option value={1}>1 Question</option>
                  <option value={3}>3 Questions</option>
                  <option value={5}>5 Questions</option>
                  <option value={10}>10 Questions</option>
                </select>
              </div>
            </div>

            {/* Custom focus instructions */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Specific Curriculum Focus / Teacher Guidance (Optional)
              </label>
              <input
                type="text"
                value={specificNotes}
                onChange={(e) => setSpecificNotes(e.target.value)}
                placeholder="e.g. Focus on endorheic lake basins, rain shadow deserts, or tectonic plate junctions"
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Auto-publish toggle with mandatory default-OFF (Req 13) */}
            <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/30 flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="autoPublishCheck"
                    checked={autoPublish}
                    onChange={(e) => setAutoPublish(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded border-slate-700 focus:ring-purple-500 bg-slate-900 cursor-pointer"
                  />
                  <label htmlFor="autoPublishCheck" className="text-sm font-semibold text-white cursor-pointer">
                    Auto-publish directly to student quizzes
                  </label>
                </div>
                <p className="text-xs text-slate-400 mt-1 pl-6">
                  {autoPublish
                    ? '⚠️ Auto-publish ENABLED: Generated questions will immediately appear in student quizzes.'
                    : '✓ Recommended Default: Generated questions will be saved as Drafts for human fact review.'}
                </p>
              </div>
            </div>

            {/* Generate Trigger Button */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-purple-900/30 transition-all disabled:opacity-50"
              >
                <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>{isGenerating ? 'Generating with Gemini...' : `Generate ${count} MCQ(s)`}</span>
              </button>
            </div>
          </div>

          {/* Similarity & Deduplication Warnings (Req 13) */}
          {similarityWarnings.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
              <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4" />
                <span>Deduplication & Similarity Notice ({similarityWarnings.length} detected)</span>
              </div>
              <ul className="text-xs text-amber-200/90 list-disc list-inside space-y-1">
                {similarityWarnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Generated Questions Review Section */}
          {generatedList.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>
                    Generated Questions ({generatedList.length}) - Ready for Review & Ingestion
                  </span>
                </h3>
                <span className="text-xs text-purple-300">
                  Target Status: {autoPublish ? 'Published' : 'Draft (In Review)'}
                </span>
              </div>

              <div className="space-y-3">
                {generatedList.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 hover:border-purple-500/40 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-purple-300 border border-slate-800">
                          {q.id}
                        </span>
                        <span className="text-xs text-slate-400">
                          {q.continent} • {q.topic} • {q.difficulty}
                        </span>
                        {q.reviewFlag && (
                          <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            ⚠ {q.reviewFlag}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveItem(q.id)}
                        className="text-slate-400 hover:text-rose-400 p-1 rounded"
                        title="Discard this question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-sm font-semibold text-white mt-2 leading-relaxed">
                      {q.questionText}
                    </p>

                    {/* 4 Options Preview */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                      {q.options.map((opt, oIdx) => {
                        const isCorrect = opt === q.correctAnswer;
                        return (
                          <div
                            key={oIdx}
                            className={`p-2 rounded-lg text-xs flex items-center justify-between ${
                              isCorrect
                                ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 font-medium'
                                : 'bg-slate-900/60 text-slate-300 border border-slate-800'
                            }`}
                          >
                            <span>
                              {String.fromCharCode(65 + oIdx)}. {opt}
                            </span>
                            {isCorrect && (
                              <span className="text-[10px] text-emerald-400 font-bold">✓ CORRECT</span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <p className="text-xs text-slate-400 mt-2 bg-slate-900/40 p-2 rounded-lg border border-slate-800">
                      <strong className="text-slate-300">Explanation: </strong> {q.explanation}
                    </p>
                  </div>
                ))}
              </div>

              {/* Bottom Ingest Action */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setGeneratedList([])}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs"
                >
                  Discard All
                </button>
                <button
                  type="button"
                  onClick={handleSaveAll}
                  disabled={isSaving}
                  className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>
                    {isSaving
                      ? 'Saving to Question Bank...'
                      : `Approve & Add ${generatedList.length} Questions to Bank`}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
