import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { CURRENCIES } from '../utils/money.js';
import { storage } from '../utils/storage.js';

const SettingsContext = createContext(null);
export const useSettings = () => useContext(SettingsContext);

const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;
const validOr = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback);

/** Currency and light/dark theme, remembered between visits. */
export function SettingsProvider({ children }) {
  const [currency, setCurrency] = useState(() => validOr(storage.get('currency'), CURRENCIES, 'USD'));
  const [theme, setTheme] = useState(() => validOr(storage.get('theme'), ['light', 'dark'], prefersDark() ? 'dark' : 'light'));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    storage.set('theme', theme);
  }, [theme]);
  useEffect(() => storage.set('currency', currency), [currency]);

  const value = useMemo(
    () => ({ currency, setCurrency, theme, toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) }),
    [currency, theme],
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
