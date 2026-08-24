import React from 'react';
import { Sparkles, History, RotateCcw, Sun, Moon, Globe } from 'lucide-react';

interface HeaderProps {
  onOpenHistory: () => void;
  historyCount: number;
  onResetAll: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenHistory,
  historyCount,
  onResetAll,
  isDarkMode,
  onToggleTheme,
}) => {
  return (
    <header id="app-header" className="flex items-center justify-between px-4 sm:px-8 py-3 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#0d131f]/95 backdrop-blur-md sticky top-0 z-30 shrink-0 transition-colors shadow-xs">
      {/* Brand & Identity */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center">
          <div className="w-9 h-9 bg-linear-to-br from-indigo-600 via-indigo-700 to-violet-700 rounded-xl flex items-center justify-center text-white font-extrabold text-xs shadow-md shadow-indigo-500/20 tracking-wider">
            NLS
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-[#0d131f] rounded-full animate-pulse" />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5 font-sans">
              Native Language Sync
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
              <Sparkles className="w-2.5 h-2.5" />
              AI Studio Pro
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block font-medium">
            Phonetic / Native &rarr; Refined English &rarr; Global Cultural Localization
          </p>
        </div>
      </div>

      {/* Quick Controls */}
      <div className="flex items-center gap-2">
        {/* Dark / Light Mode Toggle Button */}
        <button
          id="btn-toggle-theme"
          onClick={onToggleTheme}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-2 bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 hover:scale-105 transition-all flex items-center justify-center shadow-2xs cursor-pointer"
        >
          {isDarkMode ? (
            <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180 duration-300" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600 animate-in spin-in-180 duration-300" />
          )}
        </button>

        <button
          id="btn-reset-workspace"
          onClick={onResetAll}
          title="Clear all translation boxes"
          className="px-3 py-1.5 bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span className="hidden sm:inline">Reset</span>
        </button>

        <button
          id="btn-open-history"
          onClick={onOpenHistory}
          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm shadow-indigo-500/25 hover:shadow-md hover:shadow-indigo-500/35 cursor-pointer"
        >
          <History className="w-3.5 h-3.5" />
          <span>Logs</span>
          {historyCount > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold bg-white/20 text-white rounded-full">
              {historyCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
