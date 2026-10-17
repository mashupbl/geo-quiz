import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle,
  AlertCircle,
  Copy,
  ExternalLink,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Question, Continent } from '../types';
import {
  parseSheetDataToQuestions,
  exportQuestionsToCSV,
  SAMPLE_SHEET_CSV,
} from '../utils/sheetParser';

interface SheetSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportQuestions: (questions: Question[], overwrite: boolean) => Promise<{ added: number; skipped: number; errors: string[] }>;
  existingQuestions: Question[];
}

export const SheetSyncModal: React.FC<SheetSyncModalProps> = ({
  isOpen,
  onClose,
  onImportQuestions,
  existingQuestions,
}) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'url'>('paste');
  const [pastedData, setPastedData] = useState('');
  const [sheetUrl, setSheetUrl] = useState('');
  const [defaultContinent, setDefaultContinent] = useState<Continent>('Africa');
  const [overwriteExisting, setOverwriteExisting] = useState(false);

  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<Question[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<{ added: number; skipped: number } | null>(null);
  const [copiedTemplate, setCopiedTemplate] = useState(false);

  if (!isOpen) return null;

  const handleParsePasted = () => {
    setIsParsing(true);
    setImportResult(null);

    const { questions, errors } = parseSheetDataToQuestions(pastedData, defaultContinent);
    setParsedPreview(questions);
    setParseErrors(errors);
    setIsParsing(false);
  };

  const handleFetchFromUrl = async () => {
    if (!sheetUrl.trim()) return;
    setIsParsing(true);
    setImportResult(null);
    setParseErrors([]);

    try {
      // In Google Sheets, a published sheet URL is typically:
      // https://docs.google.com/spreadsheets/d/e/.../pub?output=csv
      const res = await fetch(sheetUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch sheet data. Status: ${res.status}`);
      }
      const text = await res.text();
      const { questions, errors } = parseSheetDataToQuestions(text, defaultContinent);
      setParsedPreview(questions);
      setParseErrors(errors);
    } catch (err: any) {
      setParseErrors([err.message || 'Error fetching sheet from URL. Ensure the sheet is published as CSV.']);
    } finally {
      setIsParsing(false);
    }
  };

  const handleRunImport = async () => {
    if (parsedPreview.length === 0) return;
    setIsImporting(true);

    try {
      const result = await onImportQuestions(parsedPreview, overwriteExisting);
      setImportResult({ added: result.added, skipped: result.skipped });
      if (result.errors.length > 0) {
        setParseErrors((prev) => [...prev, ...result.errors]);
      }
    } catch (err: any) {
      setParseErrors((prev) => [...prev, err.message || 'Import failed']);
    } finally {
      setIsImporting(false);
    }
  };

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(SAMPLE_SHEET_CSV);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2500);
  };

  const handleDownloadCurrentBankCSV = () => {
    const csvContent = exportQuestionsToCSV(existingQuestions);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `geomaster-question-bank-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 sticky top-0 bg-slate-900/95 backdrop-blur z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Google Sheets & CSV Synchronizer</h2>
              <p className="text-xs text-slate-400">
                Continuous expansion • Bulk import/export • Unlimited capacity subject to performance limits
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
          {/* Quick Tools Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <div>
              <span className="text-sm font-semibold text-white block">Template & Export Utilities</span>
              <span className="text-xs text-slate-400">
                Ensure your columns match: ID, Continent, Topic, Difficulty, Prompt, 4 Options, Answer, Explanation
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleCopyTemplate}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium border border-slate-600 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedTemplate ? 'Copied Template!' : 'Copy CSV Template'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadCurrentBankCSV}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Current Bank ({existingQuestions.length} MCQs)</span>
              </button>
            </div>
          </div>

          {/* Import Modes Switcher */}
          <div className="flex border-b border-slate-800 space-x-4">
            <button
              onClick={() => setActiveTab('paste')}
              className={`pb-2.5 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'paste'
                  ? 'border-emerald-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Option 1: Paste CSV / TSV (from Google Sheets)
            </button>
            <button
              onClick={() => setActiveTab('url')}
              className={`pb-2.5 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'url'
                  ? 'border-emerald-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Option 2: Published Google Sheets CSV Link
            </button>
          </div>

          {/* Tab 1: Paste content */}
          {activeTab === 'paste' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Paste rows directly from Google Sheets or Excel (Ctrl+V)
                </label>
                <textarea
                  rows={6}
                  value={pastedData}
                  onChange={(e) => setPastedData(e.target.value)}
                  placeholder="Paste your copied spreadsheet table here..."
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400">Fallback Continent:</span>
                  <select
                    value={defaultContinent}
                    onChange={(e) => setDefaultContinent(e.target.value as Continent)}
                    className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
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

                <button
                  type="button"
                  onClick={handleParsePasted}
                  disabled={!pastedData.trim() || isParsing}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  <span>Parse Spreadsheet Rows</span>
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: URL */}
          {activeTab === 'url' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Published Google Sheet CSV Webhook / Link
                </label>
                <div className="flex space-x-2">
                  <input
                    type="url"
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
                    className="flex-1 px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleFetchFromUrl}
                    disabled={!sheetUrl.trim() || isParsing}
                    className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center space-x-1.5"
                  >
                    <span>Fetch & Parse</span>
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1.5">
                  In Google Sheets: Click <em>File → Share → Publish to web</em>, select format "Comma-separated values (.csv)", and paste the link here.
                </p>
              </div>
            </div>
          )}

          {/* Parse Errors Notification */}
          {parseErrors.length > 0 && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
              <div className="font-bold flex items-center space-x-1">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>Found {parseErrors.length} Issue(s) during parsing:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5">
                {parseErrors.slice(0, 5).map((e, idx) => (
                  <li key={idx}>{e}</li>
                ))}
                {parseErrors.length > 5 && <li>...and {parseErrors.length - 5} more</li>}
              </ul>
            </div>
          )}

          {/* Import Success Status */}
          {importResult && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span>
                  Successfully imported <strong>{importResult.added}</strong> questions to Firestore!
                  {importResult.skipped > 0 && ` (${importResult.skipped} skipped/duplicate)`}
                </span>
              </div>
              <button
                onClick={onClose}
                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium"
              >
                Close & View Bank
              </button>
            </div>
          )}

          {/* Preview of Parsed Questions */}
          {parsedPreview.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-bold text-white">
                    Preview: {parsedPreview.length} valid questions ready to import
                  </span>
                </div>

                <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overwriteExisting}
                    onChange={(e) => setOverwriteExisting(e.target.checked)}
                    className="w-4 h-4 text-emerald-500 rounded border-slate-700 bg-slate-900"
                  />
                  <span>Overwrite existing questions if matching ID found</span>
                </label>
              </div>

              {/* Sample list preview */}
              <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-800 rounded-xl p-3 bg-slate-950/40 divide-y divide-slate-800">
                {parsedPreview.slice(0, 10).map((q, i) => (
                  <div key={i} className="pt-2 first:pt-0 text-xs">
                    <div className="flex items-center space-x-2 font-mono text-[11px] text-slate-400">
                      <span className="text-white font-semibold">{q.id}</span>
                      <span>•</span>
                      <span>{q.continent}</span>
                      <span>•</span>
                      <span>{q.topic}</span>
                      <span>•</span>
                      <span className="capitalize">{q.difficulty}</span>
                    </div>
                    <p className="text-slate-200 mt-1 font-medium">{q.questionText}</p>
                    <p className="text-emerald-400 mt-0.5">Answer: {q.correctAnswer}</p>
                  </div>
                ))}
                {parsedPreview.length > 10 && (
                  <div className="pt-2 text-xs text-slate-500 text-center">
                    + {parsedPreview.length - 10} additional questions ready...
                  </div>
                )}
              </div>

              {/* Import Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleRunImport}
                  disabled={isImporting}
                  className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  <span>
                    {isImporting
                      ? 'Writing to Firebase Firestore...'
                      : `Sync & Import ${parsedPreview.length} Questions`}
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
