'use client';

import { useEffect, useState } from 'react';

const THEME_KEY = 'lovcore_theme';

export const useTheme = () => {
  const [isDark, setIsDark] = useState(false);

  // Read saved theme from localStorage after mount to avoid SSR hydration mismatch
  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) {
      setIsDark(saved === 'dark');
    } else {
      setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
  }, [isDark]);

  return {
    isDark,
    toggleTheme: () => setIsDark((current) => !current),
  };
};
