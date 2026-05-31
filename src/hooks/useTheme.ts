import { useEffect, useState } from 'react';

const THEME_KEY = 'lovcore_theme';

export const useTheme = () => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
  }, [isDark]);

  return {
    isDark,
    toggleTheme: () => setIsDark((current) => !current),
  };
};
