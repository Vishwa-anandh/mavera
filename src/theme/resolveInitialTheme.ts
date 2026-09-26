export type ThemeMode = 'light' | 'dark';
export type Density = 'comfortable' | 'compact';

export const THEME_STORAGE_KEY = 'mavera.theme';
export const DENSITY_STORAGE_KEY = 'mavera.density';

export function resolveStoredMode(raw: string | null): ThemeMode {
  return raw === 'dark' ? 'dark' : 'light';
}

export function resolveStoredDensity(raw: string | null): Density {
  return raw === 'compact' ? 'compact' : 'comfortable';
}
