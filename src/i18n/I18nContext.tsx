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
  // 1. Check saved preference
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'zh') return saved;
  } catch { /* localStorage unavailable */ }

  // 2. Detect browser language
  const browserLang = navigator.language || (navigator as { userLanguage?: string }).userLanguage || '';
  if (browserLang.startsWith('zh')) return 'zh';

  // 3. Default to Chinese
  return 'zh';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(loadSavedLocale);

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
