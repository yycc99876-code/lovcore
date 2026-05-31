'use client';

/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import en from './locales/en';
import zh from './locales/zh';

export type Locale = 'en' | 'zh';
export type Translations = typeof en;

const STORAGE_KEY = 'lovcore_locale';

const localeMap: Record<Locale, Translations> = { en, zh };

interface I18nContextValue {
  locale: Locale;
  t: Translations;
  toggleLocale: () => void;
}

export const I18nContext = createContext<I18nContextValue>({
  locale: 'en',
  t: en,
  toggleLocale: () => {},
});

function loadSavedLocale(): Locale {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'zh' || saved === 'en') return saved;
  return navigator.language.startsWith('zh') ? 'zh' : 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en');

  useEffect(() => {
    setLocale(loadSavedLocale());
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const toggleLocale = useCallback(() => {
    setLocale((prev) => (prev === 'en' ? 'zh' : 'en'));
  }, []);

  return (
    <I18nContext.Provider value={{ locale, t: localeMap[locale], toggleLocale }}>
      {children}
    </I18nContext.Provider>
  );
}
