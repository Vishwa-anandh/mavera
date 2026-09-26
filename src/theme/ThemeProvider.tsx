import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ConfigProvider } from 'antd';
import { buildThemeConfig } from './themeConfig';
import {
  THEME_STORAGE_KEY,
  DENSITY_STORAGE_KEY,
  resolveStoredMode,
  resolveStoredDensity,
  type ThemeMode,
  type Density,
} from './resolveInitialTheme';
import { lightColors, darkColors } from './tokens';

interface MaveraThemeContextValue {
  mode: ThemeMode;
  density: Density;
  setMode: (mode: ThemeMode) => void;
  setDensity: (density: Density) => void;
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
  const [density, setDensityState] = useState<Density>(() =>
    resolveStoredDensity(readStorage(DENSITY_STORAGE_KEY)),
  );

  useEffect(() => {
    applyCssVariables(mode);
  }, [mode]);

  useEffect(() => {
    document.documentElement.setAttribute('data-density', density);
  }, [density]);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    writeStorage(THEME_STORAGE_KEY, next);
  };

  const setDensity = (next: Density) => {
    setDensityState(next);
    writeStorage(DENSITY_STORAGE_KEY, next);
  };

  const toggleMode = () => setMode(mode === 'dark' ? 'light' : 'dark');

  const themeConfig = useMemo(() => buildThemeConfig(mode, density), [mode, density]);

  const value = useMemo<MaveraThemeContextValue>(
    () => ({ mode, density, setMode, setDensity, toggleMode }),
    [mode, density],
  );

  return (
    <MaveraThemeContext.Provider value={value}>
      <ConfigProvider theme={themeConfig}>{children}</ConfigProvider>
    </MaveraThemeContext.Provider>
  );
}

export function useMaveraTheme(): MaveraThemeContextValue {
  const ctx = useContext(MaveraThemeContext);
  if (!ctx) throw new Error('useMaveraTheme must be used within a ThemeProvider');
  return ctx;
}
