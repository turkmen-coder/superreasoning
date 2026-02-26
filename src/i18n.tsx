import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { translations, Translation } from './locales';
import { Language } from './types';

export const LANGUAGE_STORAGE_KEY = 'sr-language';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translation;
  toggleLanguage: () => void;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function detectLanguage(): Language {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === 'tr' || stored === 'en') return stored;
  } catch {} // eslint-disable-line no-empty
  try {
    if (navigator.language?.startsWith('tr')) return 'tr';
  } catch {} // eslint-disable-line no-empty
  return 'en';
}

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(detectLanguage);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try { localStorage.setItem(LANGUAGE_STORAGE_KEY, lang); } catch {} // eslint-disable-line no-empty
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState(prev => {
      const next = prev === 'tr' ? 'en' : 'tr';
      try { localStorage.setItem(LANGUAGE_STORAGE_KEY, next); } catch {} // eslint-disable-line no-empty
      return next;
    });
  }, []);

  const value = {
    language,
    setLanguage,
    t: translations[language],
    toggleLanguage
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
};
