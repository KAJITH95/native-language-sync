import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  X
} from 'lucide-react';
import { Header } from './components/Header';
import { Box1Input } from './components/Box1Input';
import { Box2English } from './components/Box2English';
import { Box3Target } from './components/Box3Target';
import { HistoryModal } from './components/HistoryModal';
import { COUNTRIES } from './data/countries';
import { EnglishTone, TranslationHistoryItem } from './types';

const STORAGE_KEY_HISTORY = 'polyglot_history_v1';
const STORAGE_KEY_COUNTRY = 'polyglot_country_v1';
const STORAGE_KEY_LANG = 'polyglot_lang_v1';
const STORAGE_KEY_THEME = 'polyglot_theme_v1';

export default function App() {
  // Theme State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    if (saved !== null) return saved === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.classList.add('dark');
      localStorage.setItem(STORAGE_KEY_THEME, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
      document.body.classList.remove('dark');
      localStorage.setItem(STORAGE_KEY_THEME, 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Box 1 State
  const [inputText, setInputText] = useState<string>('');
  const [detectedLanguage, setDetectedLanguage] = useState<string>('');

  // Box 2 State
  const [englishText, setEnglishText] = useState<string>('');
  const [tone, setTone] = useState<EnglishTone>('standard');
  const [alternativePhasings, setAlternativePhasings] = useState<string[]>([]);
  const [grammarNotes, setGrammarNotes] = useState<string>('');
  const [isBox2Loading, setIsBox2Loading] = useState<boolean>(false);

  // Box 3 State
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_COUNTRY) || 'IN';
  });
  const [selectedLanguageCode, setSelectedLanguageCode] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_LANG) || 'ta';
  });
  const [targetOutputText, setTargetOutputText] = useState<string>('');
  const [pronunciation, setPronunciation] = useState<string>('');
  const [usageNote, setUsageNote] = useState<string>('');
  const [isBox3Loading, setIsBox3Loading] = useState<boolean>(false);
  const [rateLimitCooldown, setRateLimitCooldown] = useState<number>(0);

  // Global UI State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<TranslationHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const activeAbortRef = useRef<AbortController | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  // Maintain refs for country and language so debounced input translates to current target without re-triggering Box 2
  const selectedCountryCodeRef = useRef(selectedCountryCode);
  selectedCountryCodeRef.current = selectedCountryCode;
  const selectedLanguageCodeRef = useRef(selectedLanguageCode);
  selectedLanguageCodeRef.current = selectedLanguageCode;
  const englishTextRef = useRef(englishText);
  englishTextRef.current = englishText;

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }, []);

  // Rate limit cooldown timer
  useEffect(() => {
    if (rateLimitCooldown <= 0) return;
    const interval = setInterval(() => {
      setRateLimitCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [rateLimitCooldown]);

  // Save preferences
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_COUNTRY, selectedCountryCode);
  }, [selectedCountryCode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LANG, selectedLanguageCode);
  }, [selectedLanguageCode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history.slice(0, 30)));
    } catch (e) {
      console.warn('Could not save history to localStorage', e);
    }
  }, [history]);

  // Current Country & Language Helpers
  const currentCountry = COUNTRIES.find((c) => c.code === selectedCountryCode) || COUNTRIES[0];
  const currentLanguage = currentCountry.languages.find((l) => l.code === selectedLanguageCode) || currentCountry.languages[0];

  // Box 3 translation function
  const translateBox3FromEnglish = useCallback(
    async (engText: string, countryCode: string, langCode: string, sourceInput: string) => {
      if (!engText || !engText.trim()) {
        setTargetOutputText('');
        setPronunciation('');
        setUsageNote('');
        return;
      }

      const country = COUNTRIES.find((c) => c.code === countryCode) || COUNTRIES[0];
      const lang = country.languages.find((l) => l.code === langCode) || country.languages[0];

      setIsBox3Loading(true);
      try {
        const res = await fetch('/api/translate-box3', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            englishText: engText,
            countryName: country.name,
            languageName: lang.name,
            languageCode: lang.code,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          if (res.status === 429 || data.isQuota) {
            const delay = data.retryDelay || 25;
            setRateLimitCooldown(delay);
            showToast(`API limit reached. Auto-retrying in ${delay}s...`);
            return;
          }
          throw new Error(data.error || 'Failed to translate to target country language.');
        }

        setRateLimitCooldown(0);
        setTargetOutputText(data.translatedText);
        setPronunciation(data.pronunciation || '');
        setUsageNote(data.usageNote || '');

        // Add to history
        if (sourceInput && sourceInput.trim()) {
          const newItem: TranslationHistoryItem = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            timestamp: Date.now(),
            input: sourceInput,
            english: engText,
            countryName: country.name,
            languageName: lang.name,
            targetOutput: data.translatedText,
          };
          setHistory((prev) => [newItem, ...prev.filter((h) => h.input !== sourceInput)].slice(0, 30));
        }
      } catch (err: any) {
        console.error('Box 3 translation error:', err);
      } finally {
        setIsBox3Loading(false);
      }
    },
    [showToast]
  );

  // Core Fast Dual-Step Pipeline (Single API Call for Box 2 & Box 3)
  const executePipeline = useCallback(
    async (text: string, toneToUse: EnglishTone, countryCode: string, langCode: string) => {
      if (!text || !text.trim()) {
        setEnglishText('');
        setTargetOutputText('');
        setPronunciation('');
        setUsageNote('');
        setAlternativePhasings([]);
        setGrammarNotes('');
        setIsBox2Loading(false);
        setIsBox3Loading(false);
        return;
      }

      // Abort previous inflight request to conserve quota
      if (activeAbortRef.current) {
        activeAbortRef.current.abort();
      }
      activeAbortRef.current = new AbortController();

      const country = COUNTRIES.find((c) => c.code === countryCode) || COUNTRIES[0];
      const lang = country.languages.find((l) => l.code === langCode) || country.languages[0];

      setIsBox2Loading(true);
      setIsBox3Loading(true);

      try {
        const res = await fetch('/api/translate-all', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: activeAbortRef.current.signal,
          body: JSON.stringify({
            text: text.trim(),
            tone: toneToUse,
            countryName: country.name,
            languageName: lang.name,
            languageCode: lang.code,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          if (res.status === 429 || data.isQuota) {
            const delay = data.retryDelay || 25;
            setRateLimitCooldown(delay);
            showToast(`API limit reached. Auto-retrying in ${delay}s...`);
            return;
          }
          throw new Error(data.error || 'Failed to process translation.');
        }

        setRateLimitCooldown(0);
        setDetectedLanguage(data.detectedLanguage || 'Auto-detected');
        setEnglishText(data.englishOutput || '');
        setAlternativePhasings(data.alternativePhasings || []);
        setGrammarNotes(data.grammarNotes || '');
        setTargetOutputText(data.targetOutput || '');
        setPronunciation(data.targetPronunciation || '');
        setUsageNote(data.usageNote || '');

        // Add to history
        const newItem: TranslationHistoryItem = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          timestamp: Date.now(),
          input: text.trim(),
          english: data.englishOutput,
          countryName: country.name,
          languageName: lang.name,
          targetOutput: data.targetOutput,
        };
        setHistory((prev) => [newItem, ...prev.filter((h) => h.input !== text.trim())].slice(0, 30));
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error('Translation error:', err);
        const errMsg = err?.message || 'Translation failed. Please try again.';
        showToast(errMsg);
      } finally {
        setIsBox2Loading(false);
        setIsBox3Loading(false);
      }
    },
    [showToast]
  );

  // Debounced auto-translate when typing in Box 1 or changing tone
  useEffect(() => {
    if (!inputText.trim()) {
      setEnglishText('');
      setTargetOutputText('');
      setPronunciation('');
      setUsageNote('');
      setAlternativePhasings([]);
      setGrammarNotes('');
      setIsBox2Loading(false);
      setIsBox3Loading(false);
      return;
    }

    const timer = setTimeout(() => {
      executePipeline(inputText, tone, selectedCountryCodeRef.current, selectedLanguageCodeRef.current);
    }, 650);

    return () => clearTimeout(timer);
  }, [inputText, tone, executePipeline]);

  // Instant Tone Change Handler in Box 2 (No debounce delay!)
  const handleToneChange = (newTone: EnglishTone) => {
    setTone(newTone);
    if (inputText.trim()) {
      executePipeline(inputText, newTone, selectedCountryCodeRef.current, selectedLanguageCodeRef.current);
    }
  };

  // Alternative Phrasing Selection
  const handleSelectAlternative = (selectedAlt: string) => {
    setEnglishText(selectedAlt);
    showToast('Applied alternative phrasing to Box 2');
    translateBox3FromEnglish(selectedAlt, selectedCountryCode, selectedLanguageCode, inputText);
  };

  // Country Change Handler in Box 3 (Updates Box 3 only, leaves Box 2 untouched)
  const handleCountryChange = (countryCode: string) => {
    setSelectedCountryCode(countryCode);
    const country = COUNTRIES.find((c) => c.code === countryCode) || COUNTRIES[0];
    const defaultLang = country.defaultLanguageCode || country.languages[0]?.code || 'en';
    setSelectedLanguageCode(defaultLang);

    if (englishText && englishText.trim()) {
      translateBox3FromEnglish(englishText, countryCode, defaultLang, inputText);
    }
  };

  // Language Change Handler in Box 3 (Updates Box 3 only, leaves Box 2 untouched)
  const handleLanguageChange = (langCode: string) => {
    setSelectedLanguageCode(langCode);
    if (englishText && englishText.trim()) {
      translateBox3FromEnglish(englishText, selectedCountryCode, langCode, inputText);
    }
  };

  // Reset workspace
  const handleResetAll = () => {
    setInputText('');
    setDetectedLanguage('');
    setEnglishText('');
    setAlternativePhasings([]);
    setGrammarNotes('');
    setTargetOutputText('');
    setPronunciation('');
    setUsageNote('');
    showToast('Workspace reset.');
  };

  // Restore from history
  const handleRestoreHistoryItem = (item: TranslationHistoryItem) => {
    setInputText(item.input);
    setEnglishText(item.english);
    setTargetOutputText(item.targetOutput);
    showToast('Restored translation from history.');
  };

  const isAnyLoading = isBox2Loading || isBox3Loading;

  return (
    <div className="h-screen w-full flex flex-col bg-[#F8F9FA] dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans overflow-hidden select-none transition-colors">
      {/* App Header */}
      <Header
        onOpenHistory={() => setIsHistoryOpen(true)}
        historyCount={history.length}
        onResetAll={handleResetAll}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />

      {/* Main 3-Column High Density Workspace */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-0 overflow-y-auto lg:overflow-hidden bg-white dark:bg-[#0d131f] border-b border-slate-200/80 dark:border-slate-800/80">
        {/* BOX 1: Native Language Input */}
        <Box1Input
          value={inputText}
          onChange={setInputText}
          onTranslate={() => {}}
          isLoading={isBox2Loading}
          detectedLanguage={detectedLanguage}
          onShowToast={showToast}
        />

        {/* BOX 2: Polished English Output */}
        <Box2English
          englishText={englishText}
          tone={tone}
          onToneChange={handleToneChange}
          alternativePhasings={alternativePhasings}
          grammarNotes={grammarNotes}
          isLoading={isBox2Loading}
          onSelectAlternative={handleSelectAlternative}
          onRefreshTone={() => handleToneChange(tone)}
          onShowToast={showToast}
        />

        {/* BOX 3: Country & Native Language Output */}
        <Box3Target
          selectedCountryCode={selectedCountryCode}
          selectedLanguageCode={selectedLanguageCode}
          onCountryChange={handleCountryChange}
          onLanguageChange={handleLanguageChange}
          targetOutputText={targetOutputText}
          pronunciation={pronunciation}
          usageNote={usageNote}
          isLoading={isBox3Loading}
          onManualTranslate={() => translateBox3FromEnglish(englishText, selectedCountryCode, selectedLanguageCode, inputText)}
          onShowToast={showToast}
        />
      </main>

      {/* Professional Footer */}
      <footer className="h-10 bg-slate-900 dark:bg-[#080c14] border-t border-slate-800 text-slate-300 dark:text-slate-400 flex items-center justify-between px-4 sm:px-8 text-xs font-sans tracking-normal shrink-0">
        <div className="flex items-center gap-2 font-medium">
          <span className="text-white font-semibold">&copy; 2026 KMK Labs</span>
        </div>
        <div className="text-[11px] text-slate-400 dark:text-slate-500">
          <span>Concept &amp; product direction by KMK Labs &middot; Developed with AI</span>
        </div>
      </footer>

      {/* History Modal */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onClearHistory={() => {
          setHistory([]);
          showToast('History cleared.');
        }}
        onRestoreItem={handleRestoreHistoryItem}
        onShowToast={showToast}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-14 right-6 z-50 bg-slate-900 dark:bg-slate-800 text-white border border-slate-700/80 px-4 py-3 rounded-xl shadow-2xl text-xs font-mono font-medium flex items-center space-x-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <span className="text-slate-100">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
