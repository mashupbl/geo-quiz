import React, { useState, useEffect } from 'react';
import { X, Sparkles, Check, AlertCircle, Image as ImageIcon, HelpCircle } from 'lucide-react';
import { Question, Continent, Difficulty, QuestionStatus } from '../types';

interface QuestionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (question: Question) => Promise<void>;
  initialQuestion?: Question | null;
  existingQuestions: Question[];
}

const PRESET_TOPICS = [
  'Physical Geography',
  'Capitals & Cities',
  'Rivers & Lakes',
  'Mountains & Landforms',
  'Climate & Biomes',
  'Borders & Territories',
  'Famous Landmarks',
  'Oceans & Straits',
  'Islands & Archipelagos',
];

export const QuestionEditModal: React.FC<QuestionEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialQuestion,
  existingQuestions,
}) => {
  const isEditing = Boolean(initialQuestion);

  const [id, setId] = useState('');
  const [continent, setContinent] = useState<Continent>('Africa');
  const [topic, setTopic] = useState('Physical Geography');
  const [customTopic, setCustomTopic] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [questionText, setQuestionText] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState<number>(0);
  const [explanation, setExplanation] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState<QuestionStatus>('published');
  const [reviewFlag, setReviewFlag] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize or reset form state
  useEffect(() => {
    if (initialQuestion) {
      setId(initialQuestion.id);
      setContinent(initialQuestion.continent);
      if (PRESET_TOPICS.includes(initialQuestion.topic)) {
        setTopic(initialQuestion.topic);
        setCustomTopic('');
      } else {
        setTopic('Other');
        setCustomTopic(initialQuestion.topic);
      }
      setDifficulty(initialQuestion.difficulty);
      setQuestionText(initialQuestion.questionText);
      setOptionA(initialQuestion.options[0] || '');
      setOptionB(initialQuestion.options[1] || '');
      setOptionC(initialQuestion.options[2] || '');
      setOptionD(initialQuestion.options[3] || '');

      const cIdx = initialQuestion.options.findIndex(
        (o) => o.trim().toLowerCase() === initialQuestion.correctAnswer.trim().toLowerCase()
      );
      setCorrectAnswerIndex(cIdx !== -1 ? cIdx : 0);
      setExplanation(initialQuestion.explanation || '');
      setImageUrl(initialQuestion.imageUrl || '');
      setStatus(initialQuestion.status);
      setReviewFlag(initialQuestion.reviewFlag || '');
    } else {
      // Auto-generate fresh unique ID
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      setId(`GEO-AFR-${randomSuffix}`);
      setContinent('Africa');
      setTopic('Physical Geography');
      setCustomTopic('');
      setDifficulty('medium');
      setQuestionText('');
      setOptionA('');
      setOptionB('');
      setOptionC('');
      setOptionD('');
      setCorrectAnswerIndex(0);
      setExplanation('');
      setImageUrl('');
      setStatus('published');
      setReviewFlag('');
    }
    setErrorMsg(null);
  }, [initialQuestion, isOpen]);

  if (!isOpen) return null;

  const handleGenerateId = () => {
    const code = continent.slice(0, 3).toUpperCase();
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const newId = `GEO-${code}-${randomSuffix}`;
    setId(newId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanId = id.trim();
    if (!cleanId) {
      setErrorMsg('Question ID cannot be empty.');
      return;
    }

    // Duplicate check for new questions (Req 5)
    if (!isEditing || cleanId !== initialQuestion?.id) {
      const exists = existingQuestions.some(
        (q) => q.id.toLowerCase() === cleanId.toLowerCase()
      );
      if (exists) {
        setErrorMsg(`Question ID "${cleanId}" already exists. Please choose a unique ID.`);
        return;
      }
    }

    if (!questionText.trim()) {
      setErrorMsg('Question text is required.');
      return;
    }

    const opts: [string, string, string, string] = [
      optionA.trim(),
      optionB.trim(),
      optionC.trim(),
      optionD.trim(),
    ];

    if (opts.some((o) => !o)) {
      setErrorMsg('All four options must be provided.');
      return;
    }

    const finalTopic = topic === 'Other' ? (customTopic.trim() || 'General Geography') : topic;
    const finalCorrectAnswer = opts[correctAnswerIndex];

    const payload: Question = {
      id: cleanId,
      continent,
      topic: finalTopic,
      difficulty,
      questionText: questionText.trim(),
      options: opts,
      correctAnswer: finalCorrectAnswer,
      explanation: explanation.trim() || `The correct answer is ${finalCorrectAnswer}.`,
      imageUrl: imageUrl.trim() || null,
      status,
      reviewFlag: reviewFlag.trim() || null,
      source: initialQuestion?.source || 'manual',
      createdAt: initialQuestion?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: status === 'published' ? (initialQuestion?.publishedAt || new Date().toISOString()) : null,
    };

    try {
      setIsSubmitting(true);
      await onSave(payload);
      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err.message || 'Failed to save question.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 sticky top-0 bg-slate-900/95 backdrop-blur z-10">
          <div>
            <h2 className="text-xl font-bold text-white">
              {isEditing ? `Edit Question (${initialQuestion?.id})` : 'Add New Geography MCQ'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Unique ID • 4 Options • Explanation • Lifecycle Status (Draft / Published / Archived)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Row 1: ID & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Unique Question ID <span className="text-rose-400">*</span>
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  required
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  placeholder="e.g. GEO-AFR-042"
                  className="flex-1 px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleGenerateId}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700"
                  title="Generate a unique ID based on continent"
                >
                  Gen ID
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Publication Status <span className="text-rose-400">*</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as QuestionStatus)}
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="published">Published (Visible in student quizzes)</option>
                <option value="draft">Draft (Held for review/editing)</option>
                <option value="archived">Archived (Retired; preserves past audits)</option>
              </select>
            </div>
          </div>

          {/* Row 2: Continent, Topic, Difficulty */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Continent <span className="text-rose-400">*</span>
              </label>
              <select
                value={continent}
                onChange={(e) => setContinent(e.target.value as Continent)}
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                Topic <span className="text-rose-400">*</span>
              </label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {PRESET_TOPICS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
                <option value="Other">Other (Custom Topic)...</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Difficulty <span className="text-rose-400">*</span>
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          {topic === 'Other' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Custom Topic Name
              </label>
              <input
                type="text"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="e.g. Geopolitics & Demographics"
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          {/* Question Text */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Question Prompt <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="e.g. What is the longest river in South America by volume and length?"
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
            />
          </div>

          {/* 4 Options & Correct Answer Radio Indicator */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Four Options (Select radio for Correct Answer) <span className="text-rose-400">*</span>
              </label>
              <span className="text-xs text-emerald-400 font-medium">
                Radio marks the official answer
              </span>
            </div>

            <div className="space-y-2.5">
              {[
                { label: 'A', val: optionA, setVal: setOptionA, idx: 0 },
                { label: 'B', val: optionB, setVal: setOptionB, idx: 1 },
                { label: 'C', val: optionC, setVal: setOptionC, idx: 2 },
                { label: 'D', val: optionD, setVal: setOptionD, idx: 3 },
              ].map((opt) => (
                <div
                  key={opt.label}
                  className={`flex items-center space-x-3 p-2.5 rounded-xl border transition-all ${
                    correctAnswerIndex === opt.idx
                      ? 'bg-emerald-950/30 border-emerald-500/50'
                      : 'bg-slate-800/60 border-slate-700'
                  }`}
                >
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="correctOption"
                      checked={correctAnswerIndex === opt.idx}
                      onChange={() => setCorrectAnswerIndex(opt.idx)}
                      className="w-4 h-4 text-emerald-500 focus:ring-emerald-500 bg-slate-900 border-slate-700 cursor-pointer"
                    />
                    <span className="ml-2 font-bold text-sm text-slate-300">
                      Option {opt.label}:
                    </span>
                  </label>

                  <input
                    type="text"
                    required
                    value={opt.val}
                    onChange={(e) => opt.setVal(e.target.value)}
                    placeholder={`Enter option ${opt.label}...`}
                    className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />

                  {correctAnswerIndex === opt.idx && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                      Correct Answer
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Explanation */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Educational Explanation & Fact Rationale
            </label>
            <textarea
              rows={2}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Explain why this answer is correct and why other options are incorrect..."
              className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Optional Image URL */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Optional Image / Map URL
            </label>
            <div className="flex space-x-2">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
                className="flex-1 px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            {imageUrl && (
              <div className="mt-2 flex items-center space-x-3 p-2 bg-slate-800/60 rounded-xl border border-slate-700">
                <img
                  src={imageUrl}
                  alt="Preview"
                  onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                  className="w-16 h-12 object-cover rounded-lg border border-slate-700"
                />
                <span className="text-xs text-slate-400">Image thumbnail preview</span>
              </div>
            )}
          </div>

          {/* Review Flag (for flagged facts) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Review Notes / Ambiguity Flag (Optional)
            </label>
            <input
              type="text"
              value={reviewFlag}
              onChange={(e) => setReviewFlag(e.target.value)}
              placeholder="e.g. Disputed territorial border; water level variance"
              className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving to Database...' : isEditing ? 'Save Changes' : 'Create Question'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
