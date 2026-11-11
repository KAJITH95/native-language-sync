export interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  script?: string;
  isPrimary?: boolean;
}

export interface CountryInfo {
  code: string;
  name: string;
  flag: string;
  region: string;
  languages: LanguageInfo[];
  defaultLanguageCode: string;
}

export type EnglishTone = 'standard' | 'formal' | 'casual' | 'email';

export interface Box1State {
  text: string;
  detectedLanguage?: string;
}

export interface Box2State {
  text: string;
  tone: EnglishTone;
  alternativePhasings?: string[];
  explanation?: string;
  isLoading: boolean;
  error?: string | null;
}

export interface Box3State {
  selectedCountryCode: string;
  selectedLanguageCode: string;
  text: string;
  pronunciation?: string;
  notes?: string;
  isLoading: boolean;
  error?: string | null;
}

export interface TranslationHistoryItem {
  id: string;
  timestamp: number;
  input: string;
  english: string;
  countryName: string;
  languageName: string;
  targetOutput: string;
}
