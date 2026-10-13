export type ThemeMode = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'mavera.theme';

function prefersDarkSystemTheme(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Falls back to the OS/browser's colour-scheme preference only when the
 * user has never made an explicit choice (nothing stored yet); an explicit
 * 'light'/'dark' choice always wins once made. */
export function resolveStoredMode(raw: string | null): ThemeMode {
  if (raw === 'dark') return 'dark';
  if (raw === 'light') return 'light';
  return prefersDarkSystemTheme() ? 'dark' : 'light';
}
