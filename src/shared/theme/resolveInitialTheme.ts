export type ThemeMode = 'light' | 'dark';
/** What the person chose: a fixed mode, or whatever the device prefers (re-evaluated live). */
export type ThemePreference = ThemeMode | 'system';

export const THEME_STORAGE_KEY = 'mavera.theme';

export function prefersDarkSystemTheme(): boolean {
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

/** The stored choice; nothing stored, or anything unrecognised, means "follow the device". */
export function resolveStoredPreference(raw: string | null): ThemePreference {
  return raw === 'dark' || raw === 'light' ? raw : 'system';
}

export function resolveMode(preference: ThemePreference, systemDark: boolean): ThemeMode {
  if (preference === 'system') return systemDark ? 'dark' : 'light';
  return preference;
}
