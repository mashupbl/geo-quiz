import React from 'react';
import {
  PlusCircle,
  Sparkles,
  FileSpreadsheet,
  RefreshCw,
  Database,
  Clock,
  CheckCircle2,
  AlertCircle,
  Archive,
} from 'lucide-react';
import { QuestionAggregates } from '../types';

interface AdminHeaderProps {
  aggregates: QuestionAggregates | null;
  onOpenAddModal: () => void;
  onOpenAIModal: () => void;
  onOpenSheetModal: () => void;
  onResync: () => void;
  onSeedDefaults: () => void;
  isSyncing: boolean;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  aggregates,
  onOpenAddModal,
  onOpenAIModal,
  onOpenSheetModal,
  onResync,
  onSeedDefaults,
  isSyncing,
}) => {
  const publishedCount = aggregates?.totalPublished ?? 0;
  const draftCount = aggregates?.totalDraft ?? 0;
  const archivedCount = aggregates?.totalArchived ?? 0;
  const totalInBank = publishedCount + draftCount + archivedCount;

  // Format last sync time (Req 16)
  const formatSyncTime = (isoString?: string) => {
    if (!isoString) return 'Not yet synced';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
        ' on ' +
        d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return isoString;
    }
  };

  const targetCount = 500;
  const targetPercent = Math.min(100, Math.round((publishedCount / targetCount) * 100));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl mb-8">
      {/* Top row: Title and Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Question Bank Administration
              </h2>
              <p className="text-sm text-slate-400">
                Continuous expansion pipeline • Google Sheets sync • AI generation • Immutable audits
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenAddModal}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-all shadow-lg shadow-emerald-900/30 hover:scale-[1.02] active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add MCQ Manually</span>
          </button>

          <button
            onClick={onOpenAIModal}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-900/30 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4 text-purple-200" />
            <span>AI Question Studio</span>
          </button>

          <button
            onClick={onOpenSheetModal}
            className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-sm transition-all hover:scale-[1.02]"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Sheets / CSV Sync</span>
          </button>

          <button
            onClick={onResync}
            disabled={isSyncing}
            title="Recalculate all aggregates and verify Firestore synchronization"
            className="flex items-center space-x-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-sm transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
            <span className="hidden sm:inline">Recalculate</span>
          </button>
        </div>
      </div>

      {/* Metrics Row (Satisfies Req 9 & Req 16) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
        {/* Published Questions Card */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Published MCQs</span>
            </div>
            <div className="mt-1 flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-white">{publishedCount}</span>
              <span className="text-xs text-slate-400">of {totalInBank} in bank</span>
            </div>
            {/* Progress to 500 target */}
            <div className="mt-2.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                <span>Target: 500 MCQs</span>
                <span>{targetPercent}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${targetPercent}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Drafts Requiring Review */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
          <div className="flex items-center space-x-1.5 text-xs font-semibold uppercase tracking-wider text-amber-400">
            <AlertCircle className="w-4 h-4" />
            <span>Drafts / In Review</span>
          </div>
          <div className="mt-1 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white">{draftCount}</span>
            <span className="text-xs text-slate-400">pending publish</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            AI-generated and manual drafts. Kept separate from student quizzes until published.
          </p>
        </div>

        {/* Archived Questions */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
          <div className="flex items-center space-x-1.5 text-xs font-semibold uppercase tracking-wider text-purple-400">
            <Archive className="w-4 h-4" />
            <span>Archived Questions</span>
          </div>
          <div className="mt-1 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white">{archivedCount}</span>
            <span className="text-xs text-slate-400">retired</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Hidden from student quizzes while preserving all historical student attempt records.
          </p>
        </div>

        {/* Last Synchronisation Time (Req 16) */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-400">
              <Clock className="w-4 h-4" />
              <span>Last Bank Sync</span>
            </div>
            <div className="mt-2">
              <span className="text-sm font-semibold text-white block">
                {formatSyncTime(aggregates?.lastSyncedAt)}
              </span>
              <span className="text-xs text-emerald-400 flex items-center space-x-1 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                <span>Live Firestore Aggregates active</span>
              </span>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Quick seed starter pack:</span>
            <button
              onClick={onSeedDefaults}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium underline"
            >
              Seed 25+ MCQs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
