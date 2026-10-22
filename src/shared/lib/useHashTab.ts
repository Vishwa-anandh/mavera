import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const REMEMBER_PREFIX = 'mv-remembered:tab';

function readRemembered(key: string): string | null {
  try {
    return sessionStorage.getItem(`${REMEMBER_PREFIX}:${key}`);
  } catch {
    return null;
  }
}

function writeRemembered(key: string, id: string) {
  try {
    sessionStorage.setItem(`${REMEMBER_PREFIX}:${key}`, id);
  } catch {
    // storage unavailable: the URL still carries the tab
  }
}

interface HashTabOptions {
  /**
   * Remember the chosen tab for the rest of the browser session under this key (for example `hana` or
   * `cost-view:azure:az-acc-1`), so coming back to the page without a hash in the URL reopens the tab
   * last used instead of the first one. A hash in the URL always wins; a stored tab that is no longer
   * one of the ids is ignored.
   */
  remember?: string;
}

/**
 * The active tab of a tabbed page, kept in the URL hash (`/budgets#integrations`) so a tab can be linked to,
 * survives a refresh and works with the browser's back button. An unknown or missing hash falls back to
 * the remembered tab (when `remember` is given), then to `fallback` (the first tab by default). Switching
 * replaces the history entry, so Back leaves the page rather than walking through every tab that was visited.
 */
export function useHashTab<T extends string>(ids: readonly T[], fallback: T = ids[0], options: HashTabOptions = {}): [T, (id: T) => void] {
  const { hash, search } = useLocation();
  const navigate = useNavigate();
  const { remember } = options;
  const candidate = hash.replace('#', '') as T;
  const stored = remember ? (readRemembered(remember) as T | null) : null;
  const active = ids.includes(candidate) ? candidate : stored && ids.includes(stored) ? stored : fallback;
  const select = useCallback((id: T) => {
    if (remember) writeRemembered(remember, id);
    navigate({ search, hash: `#${id}` }, { replace: true, preventScrollReset: true });
  }, [navigate, remember, search]);
  return [active, select];
}
