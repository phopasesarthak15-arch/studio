'use client';

import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback, useEffect } from 'react';

// Assuming these files exist in src/locales/
import en from '@/locales/en.json';
import hi from '@/locales/hi.json';
import mr from '@/locales/mr.json';
import te from '@/locales/te.json';
import pa from '@/locales/pa.json';
import gu from '@/locales/gu.json';

const translations: Record<string, any> = { en, hi, mr, te, pa, gu };

export type Language = 'en' | 'hi' | 'mr' | 'te' | 'pa' | 'gu';
const supportedLanguages = ['en', 'hi', 'mr', 'te', 'pa', 'gu'];

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, options?: { [key: string]: string | number }) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en'); // Always default to 'en' on server & initial client render
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // This effect runs only on the client, after hydration
    const storedLang = localStorage.getItem('app-language');
    if (storedLang && supportedLanguages.includes(storedLang)) {
      setLanguageState(storedLang as Language);
    }
    setIsHydrated(true);
  }, []);


  const setLanguage = (lang: Language) => {
    if (supportedLanguages.includes(lang)) {
        setLanguageState(lang);
        if(typeof window !== 'undefined') {
            localStorage.setItem('app-language', lang);
        }
    }
  };

  const t = useCallback((key: string, options?: { [key: string]: string | number }): string => {
    // Use english during server-side rendering and initial client render to avoid hydration mismatch
    const lang = isHydrated ? language : 'en';
    let template = translations[lang]?.[key] || translations['en']?.[key] || key;

    if (options) {
      Object.keys(options).forEach(placeholder => {
        template = template.replace(new RegExp(`\\{${placeholder}\\}`, 'g'), options[placeholder]);
      });
    }

    return template;
  }, [language, isHydrated]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    t
  }), [language, setLanguage, t]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
