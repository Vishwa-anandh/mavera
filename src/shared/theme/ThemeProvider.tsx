import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { THEME_STORAGE_KEY, prefersDarkSystemTheme, resolveMode, resolveStoredPreference, type ThemeMode, type ThemePreference } from './resolveInitialTheme';
import { lightColors, darkColors } from './tokens';

interface MaveraThemeContextValue {
  /** The theme in force (never 'system'): the preference resolved against the device. */
  mode: ThemeMode;
  /** What was chosen: light, dark, or follow the device. */
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const MaveraThemeContext = createContext<MaveraThemeContextValue | undefined>(undefined);

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage unavailable (private browsing, quota) — in-memory state still works
  }
}

function applyCssVariables(mode: ThemeMode) {
  const colors = mode === 'dark' ? darkColors : lightColors;
  const root = document.documentElement;
  Object.entries(colors).forEach(([key, value]) => {
    const cssKey = `--mv-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    root.style.setProperty(cssKey, value);
  });
  root.setAttribute('data-theme', mode);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => resolveStoredPreference(readStorage(THEME_STORAGE_KEY)));
  const [systemDark, setSystemDark] = useState<boolean>(prefersDarkSystemTheme);
  const mode = resolveMode(preference, systemDark);

  // "System" follows the device live, including when it switches at sunset.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    query.addEventListener?.('change', onChange);
    return () => query.removeEventListener?.('change', onChange);
  }, []);

  useEffect(() => {
    applyCssVariables(mode);
  }, [mode]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    writeStorage(THEME_STORAGE_KEY, next);
  }, []);

  const setMode = useCallback((next: ThemeMode) => setPreference(next), [setPreference]);

  const toggleMode = useCallback(() => setMode(mode === 'dark' ? 'light' : 'dark'), [mode, setMode]);

  const value = useMemo<MaveraThemeContextValue>(
    () => ({ mode, preference, setPreference, setMode, toggleMode }),
    [mode, preference, setPreference, setMode, toggleMode],
  );

  return <MaveraThemeContext.Provider value={value}>{children}</MaveraThemeContext.Provider>;
}

export function useMaveraTheme(): MaveraThemeContextValue {
  const ctx = useContext(MaveraThemeContext);
  if (!ctx) throw new Error('useMaveraTheme must be used within a ThemeProvider');
  return ctx;
}
