import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Sparkles, 
  Clipboard, 
  Volume2,
  Trash2,
  CornerDownLeft
} from 'lucide-react';
import { createSpeechRecognizer, isSpeechRecognitionSupported, speakText } from '../utils/speech';

interface Box1InputProps {
  value: string;
  onChange: (val: string) => void;
  onTranslate: () => void;
  isLoading: boolean;
  detectedLanguage?: string;
  onShowToast: (msg: string) => void;
}

export const Box1Input: React.FC<Box1InputProps> = ({
  value,
  onChange,
  onTranslate,
  isLoading,
  detectedLanguage,
  onShowToast,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recognitionSupported, setRecognitionSupported] = useState(false);
  const recognizerRef = useRef<any>(null);

  useEffect(() => {
    setRecognitionSupported(isSpeechRecognitionSupported());
  }, []);

  const handleToggleVoice = () => {
    if (!recognitionSupported) {
      onShowToast('Voice recognition is not supported on this browser.');
      return;
    }

    if (isRecording) {
      if (recognizerRef.current) {
        recognizerRef.current.stop();
      }
      setIsRecording(false);
    } else {
      try {
        const recognizer = createSpeechRecognizer(
          (transcript) => {
            onChange(value ? `${value} ${transcript}` : transcript);
          },
          (err) => {
            console.error('Speech error:', err);
            onShowToast(`Voice recognition notice: ${err}`);
            setIsRecording(false);
          },
          () => {
            setIsRecording(false);
          }
        );
        if (recognizer) {
          recognizerRef.current = recognizer;
          recognizer.start();
          setIsRecording(true);
          onShowToast('Listening... Speak in your native language');
        }
      } catch (e: any) {
        onShowToast('Could not start voice recognition.');
        setIsRecording(false);
      }
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onChange(text);
        onShowToast('Pasted from clipboard!');
      }
    } catch {
      onShowToast('Unable to read clipboard. Please paste manually.');
    }
  };

  const handleClear = () => {
    onChange('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (value.trim() && !isLoading) {
        onTranslate();
      }
    }
  };

  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const charCount = value.length;

  return (
    <section id="box-1-native-input" className="border-r border-slate-200/80 dark:border-slate-800/80 flex flex-col bg-white dark:bg-[#0d131f] h-full transition-colors">
      {/* Box Header */}
      <div className="px-5 py-3.5 border-b border-slate-200/70 dark:border-slate-800/70 bg-slate-50/50 dark:bg-[#101726]/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-mono">01. Native Input</span>
        </div>

        {/* Status / Detected Badge */}
        {detectedLanguage && (
          <div className="flex items-center space-x-1.5 text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" />
            <span className="truncate max-w-[130px]">{detectedLanguage}</span>
          </div>
        )}
      </div>

      {/* Main Textarea Area */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col min-h-[220px]">
        <textarea
          id="input-native-text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your native language text here... (e.g., Tamil script, Tanglish like 'Enakku romba pasikuthu', Hindi, Spanish, or any colloquial phrasing)"
          className="w-full flex-1 p-4 border border-slate-200 dark:border-slate-700/80 rounded-xl resize-none focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 bg-slate-50/60 dark:bg-[#131c2e]/60 font-mono text-sm leading-relaxed text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all shadow-inner"
        />
      </div>

      {/* Box Footer Controls */}
      <div className="px-4 py-3 border-t border-slate-200/70 dark:border-slate-800/70 flex justify-between items-center bg-slate-50/50 dark:bg-[#101726]/60 flex-wrap gap-2">
        {/* Left Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            id="btn-voice-input"
            type="button"
            onClick={handleToggleVoice}
            title={isRecording ? 'Stop voice recording' : 'Speak using microphone'}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
              isRecording
                ? 'bg-rose-600 text-white animate-pulse shadow-rose-500/30'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            <span>{isRecording ? 'Listening...' : 'Mic'}</span>
          </button>

          <button
            id="btn-paste-input"
            type="button"
            onClick={handlePaste}
            title="Paste text from clipboard"
            className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
          >
            <Clipboard className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="hidden sm:inline">Paste</span>
          </button>

          {value && (
            <>
              <button
                id="btn-clear-box1"
                type="button"
                onClick={handleClear}
                title="Clear input"
                className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-800 transition-all shadow-2xs cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span className="hidden sm:inline">Clear</span>
              </button>

              <button
                id="btn-speak-box1"
                type="button"
                onClick={() => speakText(value, 'ta-IN')}
                title="Listen to input text"
                className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-2xs cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        {/* Right: Counter & Real-Time Sync Status */}
        <div className="flex items-center space-x-3">
          <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 font-medium">
            {charCount} chars &bull; {wordCount} words
          </span>

          <div
            className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center space-x-1.5 font-mono border transition-all ${
              isLoading
                ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                : value.trim()
                ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'
            }`}
          >
            {isLoading ? (
              <>
                <Sparkles className="w-3 h-3 animate-spin text-indigo-600 dark:text-indigo-400" />
                <span>Syncing</span>
              </>
            ) : (
              <>
                <span className={`w-1.5 h-1.5 rounded-full ${value.trim() ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-600'}`} />
                <span>{value.trim() ? 'Live' : 'Ready'}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
