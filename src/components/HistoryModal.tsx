import React from 'react';
import { X, Trash2, ArrowRight, Clock, Copy, Sparkles } from 'lucide-react';
import { TranslationHistoryItem } from '../types';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: TranslationHistoryItem[];
  onClearHistory: () => void;
  onRestoreItem: (item: TranslationHistoryItem) => void;
  onShowToast: (msg: string) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onClearHistory,
  onRestoreItem,
  onShowToast,
}) => {
  if (!isOpen) return null;

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      onShowToast(`${label} copied to clipboard!`);
    } catch {
      onShowToast('Could not copy.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#101726] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-[#0d131f]/90">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-100 dark:border-indigo-900/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">Translation History</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Past synchronized translation workflows</p>
            </div>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold">
              {history.length}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {history.length > 0 && (
              <button
                id="btn-clear-all-history"
                type="button"
                onClick={onClearHistory}
                className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 font-bold px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/60 border border-red-200 dark:border-red-900/80 transition-all flex items-center gap-1.5 uppercase tracking-wider font-mono cursor-pointer shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            )}
            <button
              id="btn-close-history-modal"
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-3.5 flex-1 bg-slate-50/50 dark:bg-[#090d16]">
          {history.length === 0 ? (
            <div className="py-16 text-center text-slate-400 dark:text-slate-500 font-mono">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6 text-slate-400 dark:text-slate-500" />
              </div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">No translations logged yet</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-sans">
                Your 3-stage conversions will automatically be logged and stored here.
              </p>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101726] hover:border-indigo-300 dark:hover:border-indigo-700/80 hover:shadow-xs transition-all space-y-3"
              >
                {/* Time & Target tags */}
                <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 font-mono">
                  <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 px-2.5 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900/60 uppercase tracking-wider text-[10px]">
                    {item.countryName} &bull; {item.languageName}
                  </span>
                </div>

                {/* Flow preview */}
                <div className="space-y-2 text-xs">
                  {/* Box 1 Input */}
                  <div className="flex items-start space-x-2">
                    <span className="font-bold text-slate-400 dark:text-slate-500 uppercase text-[10px] shrink-0 w-18 font-mono">01. Source:</span>
                    <span className="text-slate-900 dark:text-slate-100 font-sans line-clamp-2">{item.input}</span>
                  </div>

                  {/* Box 2 English */}
                  <div className="flex items-start space-x-2 text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-[#131c2e] p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 uppercase text-[10px] shrink-0 w-18 font-mono">02. Master:</span>
                    <span className="font-sans line-clamp-2">{item.english}</span>
                  </div>

                  {/* Box 3 Native */}
                  <div className="flex items-start space-x-2 text-slate-900 dark:text-white bg-indigo-50/40 dark:bg-indigo-950/40 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/60 font-medium">
                    <span className="font-bold text-indigo-700 dark:text-indigo-300 uppercase text-[10px] shrink-0 w-18 font-mono">03. Target:</span>
                    <span className="font-sans line-clamp-2">{item.targetOutput}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      onRestoreItem(item);
                      onClose();
                    }}
                    className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1.5 font-mono cursor-pointer"
                  >
                    <span>Load Flow</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopy(item.targetOutput, item.languageName)}
                    className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all font-mono cursor-pointer shadow-2xs"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Target</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
