import React, { useState, useEffect, useCallback } from 'react';
import {
  listenToAggregates,
  listenToPublishedQuestions,
  listenToAttempts,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  batchImportQuestions,
  seedInitialQuestionsIfEmpty,
  seedQuestionsExplicitly,
  saveQuizAttempt,
  syncAggregatesToFirestore,
} from './services/questionService';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from './firebase';
import { Question, QuestionAggregates, QuizAttempt, Continent, Difficulty, QuestionStatus } from './types';
import { Navbar } from './components/Navbar';
import { AdminHeader } from './components/AdminHeader';
import { CategoryMetricsView } from './components/CategoryMetricsView';
import { QuestionBankTable } from './components/QuestionBankTable';
import { QuestionEditModal } from './components/QuestionEditModal';
import { AIQuestionGeneratorModal } from './components/AIQuestionGeneratorModal';
import { SheetSyncModal } from './components/SheetSyncModal';
import { QuizInterface } from './components/QuizInterface';
import { AttemptHistoryView } from './components/AttemptHistoryView';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'quiz' | 'categories' | 'bank' | 'history'>('quiz');

  // Question State
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [publishedQuestions, setPublishedQuestions] = useState<Question[]>([]);
  const [aggregates, setAggregates] = useState<QuestionAggregates | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);

  // Category filters passed across tabs
  const [filterContinent, setFilterContinent] = useState<Continent | 'All'>('All');
  const [filterTopic, setFilterTopic] = useState<string | 'All'>('All');
  const [filterDifficulty, setFilterDifficulty] = useState<Difficulty | 'All'>('All');
  const [filterStatus, setFilterStatus] = useState<QuestionStatus | 'All'>('All');

  // Modals
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);

  // Status & Syncing
  const [isSyncing, setIsSyncing] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // 1. Initial check & automatic seed if database is empty
  useEffect(() => {
    seedInitialQuestionsIfEmpty().then((seeded) => {
      if (seeded) {
        showNotification('Starter geography question bank seeded successfully!', 'info');
      }
    });
  }, []);

  // 2. Real-time Aggregates Listener (Req 4, 9, 16)
  useEffect(() => {
    const unsub = listenToAggregates((agg) => {
      setAggregates(agg);
    });
    return () => unsub?.();
  }, []);

  // 3. Real-time All Questions Listener
  useEffect(() => {
    try {
      const q = query(collection(db, 'questions'));
      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const list: Question[] = [];
          snapshot.forEach((d) => list.push(d.data() as Question));
          setAllQuestions(list);
          setPublishedQuestions(list.filter((q) => q.status === 'published'));
        },
        (err) => {
          console.warn('Realtime questions warning:', err);
        }
      );
      return () => unsub();
    } catch (e) {
      console.error(e);
    }
  }, []);

  // 4. Real-time Attempts Listener (Req 14)
  useEffect(() => {
    const unsub = listenToAttempts((attList) => {
      setAttempts(attList);
    });
    return () => unsub?.();
  }, []);

  // Manual Resync & Recalculate
  const handleResync = async () => {
    setIsSyncing(true);
    try {
      const agg = await syncAggregatesToFirestore();
      setAggregates(agg);
      showNotification('Question bank metrics recalculated and synchronized!', 'success');
    } catch (err: any) {
      showNotification(err.message || 'Failed to sync aggregates', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Re-seed Starter Pack
  const handleSeedDefaults = async () => {
    setIsSyncing(true);
    try {
      const res = await seedQuestionsExplicitly();
      await handleResync();
      showNotification(`Bank expanded with ${res.added} starter MCQs!`, 'success');
    } catch (err: any) {
      showNotification(err.message || 'Failed to seed starter questions', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Save/Update Question from Modal
  const handleSaveQuestion = async (question: Question) => {
    const isEdit = allQuestions.some((q) => q.id === question.id);
    if (isEdit) {
      await updateQuestion(question);
      showNotification(`Question ${question.id} updated successfully!`);
    } else {
      await createQuestion(question);
      showNotification(`Question ${question.id} created and added to bank!`);
    }
  };

  // Update Status directly (Publish / Draft / Archive)
  const handleUpdateStatus = async (question: Question, newStatus: QuestionStatus) => {
    try {
      await updateQuestion({ ...question, status: newStatus });
      showNotification(`Question ${question.id} status changed to ${newStatus}.`);
    } catch (err: any) {
      showNotification(err.message || 'Failed to update status', 'error');
    }
  };

  // Delete Question
  const handleDeleteQuestion = async (id: string) => {
    try {
      await deleteQuestion(id);
      showNotification(`Question ${id} removed from bank.`);
    } catch (err: any) {
      showNotification(err.message || 'Failed to delete question', 'error');
    }
  };

  // Batch Import (Sheets / CSV / AI)
  const handleImportBatch = async (newQuestions: Question[], overwrite = false) => {
    const result = await batchImportQuestions(newQuestions, overwrite);
    showNotification(`Imported ${result.added} questions successfully! (${result.skipped} skipped)`);
    return result;
  };

  // Save Quiz Attempt
  const handleSaveAttempt = async (attempt: QuizAttempt) => {
    await saveQuizAttempt(attempt);
    showNotification('Quiz attempt snapshot permanently recorded in audit history!', 'success');
  };

  // Launch quiz from Category Card
  const handleLaunchQuizWithCategory = (
    c: Continent | 'All',
    t: string | 'All',
    d: Difficulty | 'All'
  ) => {
    setFilterContinent(c);
    setFilterTopic(t);
    setFilterDifficulty(d);
    setCurrentTab('quiz');
  };

  // Jump to bank filtered by continent
  const handleGoToBankWithFilter = (c?: Continent) => {
    if (c) setFilterContinent(c);
    setCurrentTab('bank');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          // If switching to quiz cleanly, reset pre-filters if user clicks nav tab directly
          if (tab === 'quiz' && currentTab !== 'quiz') {
            setFilterContinent('All');
            setFilterTopic('All');
            setFilterDifficulty('All');
          }
        }}
        publishedCount={aggregates?.totalPublished ?? publishedQuestions.length}
        draftCount={aggregates?.totalDraft ?? allQuestions.filter((q) => q.status === 'draft').length}
        isSyncing={isSyncing}
        onRefresh={handleResync}
      />

      {/* Toast Notification Banner */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce duration-300">
          <div
            className={`flex items-center space-x-2.5 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium border ${
              notification.type === 'error'
                ? 'bg-rose-950 border-rose-500 text-rose-200'
                : notification.type === 'info'
                ? 'bg-cyan-950 border-cyan-500 text-cyan-200'
                : 'bg-emerald-950 border-emerald-500 text-emerald-200'
            }`}
          >
            {notification.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            ) : notification.type === 'info' ? (
              <Info className="w-4 h-4 text-cyan-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Admin Header is always accessible at top of Bank and Categories views */}
        {(currentTab === 'bank' || currentTab === 'categories') && (
          <AdminHeader
            aggregates={aggregates}
            onOpenAddModal={() => {
              setEditingQuestion(null);
              setIsAddEditModalOpen(true);
            }}
            onOpenAIModal={() => setIsAIModalOpen(true)}
            onOpenSheetModal={() => setIsSheetModalOpen(true)}
            onResync={handleResync}
            onSeedDefaults={handleSeedDefaults}
            isSyncing={isSyncing}
          />
        )}

        {/* Tab 1: Dynamic Student Quiz Engine */}
        {currentTab === 'quiz' && (
          <QuizInterface
            publishedQuestions={publishedQuestions}
            onSaveAttempt={handleSaveAttempt}
            preselectedContinent={filterContinent}
            preselectedTopic={filterTopic}
            preselectedDifficulty={filterDifficulty}
            onViewHistory={() => setCurrentTab('history')}
          />
        )}

        {/* Tab 2: Category Breakdown & Metrics View (Req 9 & Req 10) */}
        {currentTab === 'categories' && (
          <CategoryMetricsView
            aggregates={aggregates}
            onLaunchQuizWithCategory={handleLaunchQuizWithCategory}
            onGoToBankWithFilter={handleGoToBankWithFilter}
          />
        )}

        {/* Tab 3: Question Bank Manager & Table (Req 5, 6, 7, 8, 15) */}
        {currentTab === 'bank' && (
          <QuestionBankTable
            questions={allQuestions}
            onEditQuestion={(q) => {
              setEditingQuestion(q);
              setIsAddEditModalOpen(true);
            }}
            onDeleteQuestion={handleDeleteQuestion}
            onUpdateStatus={handleUpdateStatus}
            initialContinentFilter={filterContinent}
            initialStatusFilter={filterStatus}
          />
        )}

        {/* Tab 4: Immutable Attempt History & Audit Logs (Req 8 & Req 14) */}
        {currentTab === 'history' && (
          <AttemptHistoryView
            attempts={attempts}
            onTakeQuizAgain={() => setCurrentTab('quiz')}
          />
        )}
      </main>

      {/* Add / Edit Question Modal */}
      <QuestionEditModal
        isOpen={isAddEditModalOpen}
        onClose={() => {
          setIsAddEditModalOpen(false);
          setEditingQuestion(null);
        }}
        onSave={handleSaveQuestion}
        initialQuestion={editingQuestion}
        existingQuestions={allQuestions}
      />

      {/* AI Question Generation Studio Modal (Req 13) */}
      <AIQuestionGeneratorModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onSaveQuestions={async (newQs) => {
          await handleImportBatch(newQs, false);
        }}
        existingQuestions={allQuestions}
      />

      {/* Google Sheets / CSV Import & Export Modal (Req 2) */}
      <SheetSyncModal
        isOpen={isSheetModalOpen}
        onClose={() => setIsSheetModalOpen(false)}
        onImportQuestions={handleImportBatch}
        existingQuestions={allQuestions}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <p>GeoMaster • Dynamic Geography MCQ Bank & Real-time Quiz Engine</p>
        <p className="mt-1 text-slate-600">
          Firebase Firestore Continuous Expansion • Fisher-Yates Randomization • Immutable Historical Snapshots
        </p>
      </footer>
    </div>
  );
}
