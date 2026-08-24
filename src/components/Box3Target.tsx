import React, { useState, useMemo, useEffect } from 'react';
import { 
  Globe2, 
  Search, 
  ChevronDown, 
  Copy, 
  Check, 
  Volume2, 
  Languages, 
  Sparkles, 
  BookOpen,
  Info,
  RefreshCw
} from 'lucide-react';
import { COUNTRIES } from '../data/countries';
import { CountryInfo, LanguageInfo } from '../types';
import { speakText } from '../utils/speech';

interface Box3TargetProps {
  selectedCountryCode: string;
  selectedLanguageCode: string;
  onCountryChange: (countryCode: string) => void;
  onLanguageChange: (langCode: string) => void;
  targetOutputText: string;
  pronunciation?: string;
  usageNote?: string;
  isLoading: boolean;
  onManualTranslate: () => void;
  onShowToast: (msg: string) => void;
}

export const Box3Target: React.FC<Box3TargetProps> = ({
  selectedCountryCode,
  selectedLanguageCode,
  onCountryChange,
  onLanguageChange,
  targetOutputText,
  pronunciation,
  usageNote,
  isLoading,
  onManualTranslate,
  onShowToast,
}) => {
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Find current country object
  const currentCountry = useMemo<CountryInfo>(() => {
    return COUNTRIES.find((c) => c.code === selectedCountryCode) || COUNTRIES[0];
  }, [selectedCountryCode]);

  // Find current language object
  const currentLanguage = useMemo<LanguageInfo>(() => {
    const lang = currentCountry.languages.find((l) => l.code === selectedLanguageCode);
    return lang || currentCountry.languages[0] || { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' };
  }, [currentCountry, selectedLanguageCode]);

  // Filtered countries for search
  const filteredCountries = useMemo(() => {
    if (!countrySearchQuery.trim()) return COUNTRIES;
    const q = countrySearchQuery.toLowerCase();
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.region.toLowerCase().includes(q) ||
        c.languages.some((l) => l.name.toLowerCase().includes(q) || l.nativeName.toLowerCase().includes(q))
    );
  }, [countrySearchQuery]);

  const handleSelectCountry = (country: CountryInfo) => {
    onCountryChange(country.code);
    setIsCountryDropdownOpen(false);
    setCountrySearchQuery('');
  };

  const handleCopy = async () => {
    if (!targetOutputText) return;
    try {
      await navigator.clipboard.writeText(targetOutputText);
      setCopied(true);
      onShowToast(`${currentLanguage.name} text copied to clipboard!`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onShowToast('Could not copy text.');
    }
  };

  const handleSpeak = async () => {
    if (!targetOutputText || isSpeaking) return;
    setIsSpeaking(true);
    await speakText(targetOutputText, currentLanguage.code);
    setIsSpeaking(false);
  };

  return (
    <section id="box-3-country-native" className="flex flex-col bg-white dark:bg-[#0d131f] h-full transition-colors">
      {/* Box Header */}
      <div className="px-5 py-3.5 border-b border-slate-200/70 dark:border-slate-800/70 bg-slate-50/50 dark:bg-[#101726]/60 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-mono">03. Localization</span>
        </div>

        {/* Selected target summary badge */}
        <div className="flex items-center space-x-1.5 text-xs font-mono font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 shadow-2xs">
          <span>{currentCountry.flag}</span>
          <span className="uppercase text-[11px] tracking-wider font-semibold">{currentCountry.name} &bull; {currentLanguage.name}</span>
        </div>
      </div>

      {/* Main Selection & Output Area */}
      <div className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto flex flex-col justify-between">
        <div className="space-y-3">
          {/* Country Selection */}
          <div className="relative">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5 font-mono">
              Target Country
            </label>
            <button
              id="btn-select-country"
              type="button"
              onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
              className="w-full flex items-center justify-between p-3 bg-slate-50/80 dark:bg-[#131c2e]/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 hover:border-indigo-400 dark:hover:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40 shadow-2xs transition-all cursor-pointer"
            >
              <span className="flex items-center space-x-2.5 truncate">
                <span className="text-lg">{currentCountry.flag}</span>
                <span className="font-bold text-slate-900 dark:text-white">{currentCountry.name}</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">({currentCountry.region})</span>
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${isCountryDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Country Dropdown Menu */}
            {isCountryDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-full bg-white dark:bg-[#101726] rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-[#131c2e]">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      id="input-search-country"
                      type="text"
                      value={countrySearchQuery}
                      onChange={(e) => setCountrySearchQuery(e.target.value)}
                      placeholder="Search country or language..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-[#0d131f] border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40 font-mono text-slate-800 dark:text-slate-100"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 p-1">
                  {filteredCountries.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-500 font-mono">No countries found</div>
                  ) : (
                    filteredCountries.map((country) => (
                      <button
                        key={country.code}
                        id={`country-item-${country.code}`}
                        type="button"
                        onClick={() => handleSelectCountry(country)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-xs flex items-center justify-between transition-all cursor-pointer ${
                          country.code === selectedCountryCode
                            ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-200 font-bold'
                            : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="flex items-center space-x-2.5 truncate">
                          <span className="text-base">{country.flag}</span>
                          <span>{country.name}</span>
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate max-w-[100px]">
                          {country.languages[0]?.name}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Native Language Selection Dropdown */}
          <div className="relative">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5 font-mono">
              Target Language
            </label>
            <button
              id="btn-select-language"
              type="button"
              onClick={() => {
                setIsLanguageDropdownOpen(!isLanguageDropdownOpen);
                setIsCountryDropdownOpen(false);
              }}
              className="w-full flex items-center justify-between p-3 bg-slate-50/80 dark:bg-[#131c2e]/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 hover:border-indigo-400 dark:hover:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40 shadow-2xs transition-all cursor-pointer"
            >
              <span className="flex items-center space-x-2.5 truncate">
                <Languages className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="font-bold text-slate-900 dark:text-white">{currentLanguage.name}</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">({currentLanguage.nativeName})</span>
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${isLanguageDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Language Dropdown Menu */}
            {isLanguageDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-full bg-white dark:bg-[#101726] rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-40 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 p-1">
                  {currentCountry.languages.map((l) => (
                    <button
                      key={l.code}
                      id={`lang-item-${l.code}`}
                      type="button"
                      onClick={() => {
                        onLanguageChange(l.code);
                        setIsLanguageDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-xs flex items-center justify-between transition-all cursor-pointer ${
                        selectedLanguageCode === l.code
                          ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-200 font-bold'
                          : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="font-semibold">{l.name}</span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">{l.nativeName}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Output Window Container */}
        <div className="flex-1 flex flex-col bg-slate-50/60 dark:bg-[#131c2e]/60 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-2xs overflow-hidden min-h-[160px] justify-between">
          <div className="px-4 py-2.5 border-b border-slate-200/70 dark:border-slate-700/70 flex justify-between items-center bg-slate-100/70 dark:bg-[#101726]/70">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase font-mono">Authentic Script Output</span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 rounded-md uppercase border border-indigo-200/60 dark:border-indigo-800">
              {currentCountry.code}-{currentLanguage.code}
            </span>
          </div>

          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500 space-y-3 font-mono">
              <div className="w-9 h-9 rounded-full border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent animate-spin" />
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Translating to {currentLanguage.name}...
              </p>
            </div>
          ) : targetOutputText ? (
            <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between space-y-4">
              <p className="text-sm sm:text-base text-slate-900 dark:text-white leading-relaxed select-text font-medium whitespace-pre-line">
                {targetOutputText}
              </p>

              {/* Pronunciation & Usage Notes */}
              <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                {pronunciation && (
                  <div className="flex items-start space-x-2.5 text-xs bg-amber-50/80 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200/80 dark:border-amber-900/60 font-mono shadow-2xs">
                    <BookOpen className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1 text-[11px]">
                      <span className="font-bold text-amber-900 dark:text-amber-300 uppercase text-[9px] block">
                        Phonetic Pronunciation / Transliteration
                      </span>
                      <span className="italic text-slate-800 dark:text-slate-200">{pronunciation}</span>
                    </div>
                  </div>
                )}

                {usageNote && (
                  <div className="flex items-start space-x-2.5 text-xs bg-slate-100/80 dark:bg-slate-800/80 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                    <Info className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <div className="flex-1 text-[11px] text-slate-600 dark:text-slate-400">
                      <span className="font-bold text-slate-700 dark:text-slate-300 uppercase text-[9px] font-mono block">Context &amp; Cultural Note</span>
                      <span>{usageNote}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center text-slate-400 dark:text-slate-500 font-mono p-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3 shadow-2xs">
                <Languages className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Awaiting Translation</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-xs mt-1">
                Target: {currentLanguage.name} ({currentCountry.name})
              </p>
            </div>
          )}

          {/* Action Row */}
          <div className="px-4 py-3 bg-slate-100/70 dark:bg-[#101726]/70 border-t border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <button
                id="btn-speak-target"
                type="button"
                disabled={!targetOutputText || isLoading}
                onClick={handleSpeak}
                title={`Listen to ${currentLanguage.name} speech`}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider border flex items-center gap-1.5 transition-all font-mono cursor-pointer shadow-2xs ${
                  !targetOutputText || isLoading
                    ? 'opacity-40 cursor-not-allowed border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 bg-white dark:bg-slate-800'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'text-indigo-600 dark:text-indigo-400 animate-pulse' : ''}`} />
                <span>Audio</span>
              </button>

              {targetOutputText && (
                <button
                  id="btn-refresh-target"
                  type="button"
                  onClick={onManualTranslate}
                  disabled={isLoading}
                  title="Re-translate into current language"
                  className="px-2.5 py-1.5 text-xs font-mono font-bold uppercase text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              )}
            </div>

            <button
              id="btn-copy-target"
              type="button"
              disabled={!targetOutputText || isLoading}
              onClick={handleCopy}
              className={`px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 transition-all font-mono shadow-sm shadow-indigo-500/25 hover:shadow-md cursor-pointer ${
                !targetOutputText || isLoading ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Result'}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
