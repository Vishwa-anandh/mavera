import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { THEME_STORAGE_KEY, resolveStoredMode, type ThemeMode } from './resolveInitialTheme';
import { lightColors, darkColors } from './tokens';

interface MaveraThemeContextValue {
  mode: ThemeMode;
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
  const [mode, setModeState] = useState<ThemeMode>(() => resolveStoredMode(readStorage(THEME_STORAGE_KEY)));

  useEffect(() => {
    applyCssVariables(mode);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    writeStorage(THEME_STORAGE_KEY, next);
  }, []);

  const toggleMode = useCallback(() => setMode(mode === 'dark' ? 'light' : 'dark'), [mode, setMode]);

  const value = useMemo<MaveraThemeContextValue>(
    () => ({ mode, setMode, toggleMode }),
    [mode, setMode, toggleMode],
  );

  return <MaveraThemeContext.Provider value={value}>{children}</MaveraThemeContext.Provider>;
}

export function useMaveraTheme(): MaveraThemeContextValue {
  const ctx = useContext(MaveraThemeContext);
  if (!ctx) throw new Error('useMaveraTheme must be used within a ThemeProvider');
  return ctx;
}
