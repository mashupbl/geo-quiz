import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Edit3,
  Trash2,
  CheckCircle,
  Clock,
  Archive,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Sparkles,
  Layers,
} from 'lucide-react';
import { Question, Continent, Difficulty, QuestionStatus } from '../types';

interface QuestionBankTableProps {
  questions: Question[];
  onEditQuestion: (question: Question) => void;
  onDeleteQuestion: (id: string) => void;
  onUpdateStatus: (question: Question, newStatus: QuestionStatus) => void;
  initialContinentFilter?: Continent | 'All';
  initialStatusFilter?: QuestionStatus | 'All';
}

export const QuestionBankTable: React.FC<QuestionBankTableProps> = ({
  questions,
  onEditQuestion,
  onDeleteQuestion,
  onUpdateStatus,
  initialContinentFilter = 'All',
  initialStatusFilter = 'All',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContinent, setSelectedContinent] = useState<Continent | 'All'>(initialContinentFilter);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | 'All'>('All');
  const [selectedStatus, setSelectedStatus] = useState<QuestionStatus | 'All'>(initialStatusFilter);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Pagination (Req 15)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filtered dataset
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      // Search filter
      if (searchTerm.trim()) {
        const s = searchTerm.toLowerCase();
        const matchesId = q.id.toLowerCase().includes(s);
        const matchesText = q.questionText.toLowerCase().includes(s);
        const matchesTopic = q.topic.toLowerCase().includes(s);
        const matchesAnswer = q.correctAnswer.toLowerCase().includes(s);
        const matchesOptions = q.options.some((opt) => opt.toLowerCase().includes(s));
        if (!matchesId && !matchesText && !matchesTopic && !matchesAnswer && !matchesOptions) {
          return false;
        }
      }

      // Continent filter
      if (selectedContinent !== 'All' && q.continent !== selectedContinent) {
        return false;
      }

      // Difficulty filter
      if (selectedDifficulty !== 'All' && q.difficulty !== selectedDifficulty) {
        return false;
      }

      // Status filter (Draft, Published, Archived)
      if (selectedStatus !== 'All' && q.status !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [questions, searchTerm, selectedContinent, selectedDifficulty, selectedStatus]);

  // Pagination calculations
  const totalItems = filteredQuestions.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(currentPage, totalPages);
  const paginatedQuestions = useMemo(() => {
    const start = (validPage - 1) * pageSize;
    return filteredQuestions.slice(start, start + pageSize);
  }, [filteredQuestions, validPage, pageSize]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const getStatusBadge = (status: QuestionStatus) => {
    switch (status) {
      case 'published':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
            <CheckCircle className="w-3 h-3 mr-1 text-emerald-400" />
            Published
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
            <Clock className="w-3 h-3 mr-1 text-amber-400" />
            Draft
          </span>
        );
      case 'archived':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30">
            <Archive className="w-3 h-3 mr-1 text-purple-400" />
            Archived
          </span>
        );
    }
  };

  const getDifficultyBadge = (difficulty: Difficulty) => {
    switch (difficulty) {
      case 'easy':
        return (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Easy
          </span>
        );
      case 'medium':
        return (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Medium
          </span>
        );
      case 'hard':
        return (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
            Hard
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Top Filter and Controls Bar */}
      <div className="p-5 border-b border-slate-800 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ID, prompt, topic, or options..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value as QuestionStatus | 'All');
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="All">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft (In Review)</option>
              <option value="archived">Archived</option>
            </select>

            {/* Continent Filter */}
            <select
              value={selectedContinent}
              onChange={(e) => {
                setSelectedContinent(e.target.value as Continent | 'All');
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="All">All Continents</option>
              <option value="Africa">Africa</option>
              <option value="Asia">Asia</option>
              <option value="Europe">Europe</option>
              <option value="North America">North America</option>
              <option value="Oceania">Oceania</option>
              <option value="South America">South America</option>
              <option value="Antarctica">Antarctica</option>
            </select>

            {/* Difficulty Filter */}
            <select
              value={selectedDifficulty}
              onChange={(e) => {
                setSelectedDifficulty(e.target.value as Difficulty | 'All');
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="All">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>

            {/* Page Size */}
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </div>

        {/* Filter Summary Stats */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
          <div>
            Showing <span className="font-semibold text-slate-200">{paginatedQuestions.length}</span> of{' '}
            <span className="font-semibold text-slate-200">{filteredQuestions.length}</span> matching questions
            {filteredQuestions.length !== questions.length && (
              <span className="ml-1 text-slate-500"> (filtered from {questions.length} total)</span>
            )}
          </div>

          {(searchTerm || selectedContinent !== 'All' || selectedDifficulty !== 'All' || selectedStatus !== 'All') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedContinent('All');
                setSelectedDifficulty('All');
                setSelectedStatus('All');
                setCurrentPage(1);
              }}
              className="text-emerald-400 hover:text-emerald-300 font-medium underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="py-3.5 px-4">Question ID</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Continent / Topic</th>
              <th className="py-3.5 px-4">Level</th>
              <th className="py-3.5 px-4">Prompt & Answer</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-sm">
            {paginatedQuestions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <AlertTriangle className="w-8 h-8 text-amber-400/80" />
                    <p className="font-medium text-slate-300">No questions match the current filter criteria.</p>
                    <p className="text-xs text-slate-500">
                      Try adjusting the search terms or filters above, or add new questions.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedQuestions.map((q) => {
                const isExpanded = expandedId === q.id;

                return (
                  <React.Fragment key={q.id}>
                    <tr className="hover:bg-slate-800/40 transition-colors">
                      {/* ID & source */}
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                        <div className="font-semibold text-white">{q.id}</div>
                        {q.source === 'ai_generated' && (
                          <span className="inline-flex items-center text-[10px] text-purple-300 mt-0.5">
                            <Sparkles className="w-2.5 h-2.5 mr-1 text-purple-400" />
                            AI Gen
                          </span>
                        )}
                        {q.source === 'sheet_sync' && (
                          <span className="text-[10px] text-cyan-300 mt-0.5 block">Sheet Sync</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          {getStatusBadge(q.status)}
                          {q.reviewFlag && (
                            <span className="block text-[10px] text-amber-300 max-w-[150px] truncate" title={q.reviewFlag}>
                              ⚠ {q.reviewFlag}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Continent & Topic */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-200">{q.continent}</div>
                        <div className="text-xs text-slate-400 truncate max-w-[180px]">{q.topic}</div>
                      </td>

                      {/* Difficulty */}
                      <td className="py-3.5 px-4">{getDifficultyBadge(q.difficulty)}</td>

                      {/* Prompt & Answer */}
                      <td className="py-3.5 px-4 max-w-md">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-slate-200 font-medium line-clamp-2 leading-snug">
                              {q.questionText}
                            </p>
                            <p className="text-xs text-emerald-400 font-semibold mt-1">
                              ✓ {q.correctAnswer}
                            </p>
                          </div>
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : q.id)}
                            className="ml-2 text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
                            title="Expand options and explanation"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Quick Status Toggles (Req 7 & 8) */}
                          {q.status !== 'published' ? (
                            <button
                              onClick={() => onUpdateStatus(q, 'published')}
                              title="Publish question for student quizzes"
                              className="px-2 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition-colors"
                            >
                              Publish
                            </button>
                          ) : (
                            <button
                              onClick={() => onUpdateStatus(q, 'draft')}
                              title="Unpublish to Draft"
                              className="px-2 py-1 rounded bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-medium transition-colors"
                            >
                              To Draft
                            </button>
                          )}

                          {q.status !== 'archived' && (
                            <button
                              onClick={() => onUpdateStatus(q, 'archived')}
                              title="Archive question (safe retirement without deleting historical results)"
                              className="p-1.5 rounded text-slate-400 hover:text-purple-300 hover:bg-slate-800 transition-colors"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          )}

                          {/* Full Edit Modal */}
                          <button
                            onClick={() => onEditQuestion(q)}
                            title="Edit Question details"
                            className="p-1.5 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Delete Question */}
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete question ${q.id}? Note: Historical quiz attempts will remain completely preserved.`)) {
                                onDeleteQuestion(q.id);
                              }
                            }}
                            title="Delete Question"
                            className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Options and Explanation Details */}
                    {isExpanded && (
                      <tr className="bg-slate-950/60 border-b border-slate-800">
                        <td colSpan={6} className="p-4 pl-8">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Options List */}
                            <div className="space-y-1.5">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                                4 Options (MCQ):
                              </span>
                              <div className="space-y-1">
                                {q.options.map((opt, idx) => {
                                  const isCorrect = opt.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
                                  return (
                                    <div
                                      key={idx}
                                      className={`px-3 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                                        isCorrect
                                          ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 font-semibold'
                                          : 'bg-slate-800 text-slate-300'
                                      }`}
                                    >
                                      <span>
                                        {String.fromCharCode(65 + idx)}. {opt}
                                      </span>
                                      {isCorrect && (
                                        <span className="text-[10px] uppercase font-bold text-emerald-400">
                                          ✓ Correct Answer
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Explanation & Image Preview */}
                            <div className="space-y-2">
                              <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                                  Educational Explanation:
                                </span>
                                <p className="text-xs text-slate-300 mt-1 leading-relaxed bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                                  {q.explanation || 'No explanation provided.'}
                                </p>
                              </div>

                              {q.imageUrl && (
                                <div className="flex items-center space-x-3 pt-1">
                                  <img
                                    src={q.imageUrl}
                                    alt="Question illustration"
                                    className="w-16 h-12 object-cover rounded-md border border-slate-700"
                                  />
                                  <a
                                    href={q.imageUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
                                  >
                                    <span>View Full Image</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer (Req 15) */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-slate-400">
          Page <span className="font-semibold text-white">{validPage}</span> of{' '}
          <span className="font-semibold text-white">{totalPages}</span> ({totalItems} total items)
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => handlePageChange(validPage - 1)}
            disabled={validPage <= 1}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Quick page buttons */}
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (validPage <= 3) {
                pageNum = i + 1;
              } else if (validPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = validPage - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                    validPage === pageNum
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => handlePageChange(validPage + 1)}
            disabled={validPage >= totalPages}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
