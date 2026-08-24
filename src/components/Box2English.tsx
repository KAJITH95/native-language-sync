import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Copy, 
  Check, 
  Volume2, 
  Sparkles, 
  MessageSquareQuote, 
  HelpCircle,
  RefreshCw,
  Zap,
  Briefcase,
  Smile,
  Mail
} from 'lucide-react';
import { EnglishTone } from '../types';
import { speakText } from '../utils/speech';

interface Box2EnglishProps {
  englishText: string;
  tone: EnglishTone;
  onToneChange: (newTone: EnglishTone) => void;
  alternativePhasings?: string[];
  grammarNotes?: string;
  isLoading: boolean;
  onSelectAlternative: (text: string) => void;
  onRefreshTone: () => void;
  onShowToast: (msg: string) => void;
}

export const Box2English: React.FC<Box2EnglishProps> = ({
  englishText,
  tone,
  onToneChange,
  alternativePhasings = [],
  grammarNotes,
  isLoading,
  onSelectAlternative,
  onRefreshTone,
  onShowToast,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleCopy = async () => {
    if (!englishText) return;
    try {
      await navigator.clipboard.writeText(englishText);
      setCopied(true);
      onShowToast('English text copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onShowToast('Could not copy text.');
    }
  };

  const handleSpeak = async () => {
    if (!englishText || isSpeaking) return;
    setIsSpeaking(true);
    await speakText(englishText, 'en-US');
    setIsSpeaking(false);
  };

  const tones: { id: EnglishTone; label: string; icon: any; desc: string }[] = [
    { id: 'standard', label: 'Standard', icon: Zap, desc: 'Natural & Balanced English' },
    { id: 'formal', label: 'Formal', icon: Briefcase, desc: 'Executive & Business Grade' },
    { id: 'casual', label: 'Casual', icon: Smile, desc: 'Friendly & Conversational' },
    { id: 'email', label: 'Email', icon: Mail, desc: 'Complete Workplace Email' },
  ];

  // Strictly filter out any non-English/non-Latin scripts to ensure Box 2 contains only English
  const pureEnglishAlternatives = alternativePhasings.filter((alt) => {
    if (!alt || typeof alt !== 'string' || !alt.trim()) return false;
    const hasNonLatinScript = /[^\u0000-\u007F\u00C0-\u024F\u1E00-\u1EFF\s\p{P}]/u.test(alt);
    return !hasNonLatinScript;
  });

  return (
    <section id="box-2-english-refined" className="border-r border-slate-200/80 dark:border-slate-800/80 flex flex-col bg-white dark:bg-[#0d131f] shadow-xs z-10 h-full transition-colors">
      {/* Box Header */}
      <div className="px-5 py-3.5 border-b border-indigo-100/80 dark:border-slate-800/80 bg-indigo-50/40 dark:bg-[#101726]/60 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-mono">02. English Refinement</span>
        </div>

        {/* Tone Selector Segmented Control */}
        <div className="flex items-center space-x-1 bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-lg border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
          {tones.map((t) => {
            const IconComponent = t.icon;
            const isActive = tone === t.id;
            return (
              <button
                key={t.id}
                id={`btn-tone-${t.id}`}
                onClick={() => onToneChange(t.id)}
                title={t.desc}
                className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all font-mono flex items-center gap-1 cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs scale-102'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                }`}
              >
                <IconComponent className="w-3 h-3 shrink-0" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Output Content Area */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between min-h-[220px]">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500 space-y-3 font-mono">
            <div className="w-9 h-9 rounded-full border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent animate-spin" />
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Refining grammar, tone &amp; clarity...
            </p>
          </div>
        ) : englishText ? (
          <div className="space-y-4 flex-1 flex flex-col">
            {/* Primary Polished English Output Box */}
            <div className="flex-1 p-4 sm:p-5 border border-indigo-100 dark:border-slate-700/80 rounded-xl bg-slate-50/70 dark:bg-[#131c2e]/60 relative flex flex-col justify-between min-h-[140px] shadow-2xs">
              <p className="text-sm sm:text-base text-slate-900 dark:text-slate-100 leading-relaxed font-sans font-medium select-text whitespace-pre-line">
                {englishText}
              </p>

              {grammarNotes && (
                <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <Sparkles className="w-3 h-3 text-indigo-500 shrink-0" />
                  <span className="italic">{grammarNotes}</span>
                </div>
              )}
            </div>

            {/* Alternative Phrasings (Strictly English styles) */}
            {pureEnglishAlternatives.length > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono flex items-center gap-1 mb-2">
                  <MessageSquareQuote className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
                  Alternative English Styles:
                </span>
                <div className="space-y-1.5">
                  {pureEnglishAlternatives.map((alt, i) => (
                    <button
                      key={i}
                      id={`btn-alt-phrasing-${i}`}
                      type="button"
                      onClick={() => onSelectAlternative(alt)}
                      className="w-full text-left p-2.5 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-slate-50/80 dark:bg-[#131c2e]/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-900 dark:hover:text-indigo-200 border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all flex items-center justify-between group cursor-pointer shadow-2xs"
                    >
                      <span className="truncate pr-2 font-mono text-[11px]">"{alt}"</span>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 uppercase font-bold font-mono opacity-0 group-hover:opacity-100 shrink-0 transition-opacity">
                        Use &rarr;
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-10 text-slate-400 dark:text-slate-500 font-mono text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3 shadow-2xs">
              <Sparkles className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Awaiting Input</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-xs mt-1">
              Start typing in Box 1 for automatic real-time English refinement.
            </p>
          </div>
        )}
      </div>

      {/* Box Footer Controls */}
      <div className="px-4 py-3 bg-slate-50/50 dark:bg-[#101726]/60 border-t border-slate-200/70 dark:border-slate-800/70 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center space-x-1.5">
          <button
            id="btn-copy-english"
            type="button"
            disabled={!englishText || isLoading}
            onClick={handleCopy}
            title="Copy English translation"
            className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            id="btn-speak-english"
            type="button"
            disabled={!englishText || isLoading}
            onClick={handleSpeak}
            title="Listen to English pronunciation"
            className={`px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
              isSpeaking ? 'text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500' : ''
            }`}
          >
            <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'animate-pulse' : ''}`} />
            <span>Audio</span>
          </button>
        </div>

        {englishText && (
          <button
            id="btn-refresh-box2"
            type="button"
            onClick={onRefreshTone}
            disabled={isLoading}
            title="Re-translate with current tone"
            className="flex items-center space-x-1.5 text-xs font-mono font-bold uppercase text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 px-2.5 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Re-evaluate</span>
          </button>
        )}
      </div>
    </section>
  );
};
