import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/** The query as the last filter change left it, shared by every filter on the page (see `useUrlFilter`). */
let latestSearch = '';

/**
 * One filter or period of a page, kept in the URL query (`/smart-alerts?status=resolved#alerts`) so a link
 * restores it, it survives a refresh, and it sits next to the tab in the hash instead of replacing it. A
 * missing or unknown value falls back to `fallback`, and the fallback is left out of the URL so an
 * unfiltered page keeps a clean address. Changing it replaces the history entry (Back leaves the page rather
 * than walking through every filter tried).
 */
export function useUrlFilter<T extends string>(key: string, allowed: readonly T[], fallback: T): [T, (value: T) => void] {
  const { search, hash } = useLocation();
  const navigate = useNavigate();
  // Several filters can change in one click (Clear filters): each change builds on the one before it, not on the
  // query this render started with.
  useEffect(() => { latestSearch = search; }, [search]);
  const raw = new URLSearchParams(search).get(key) as T | null;
  const value = raw !== null && allowed.includes(raw) ? raw : fallback;
  const set = useCallback((next: T) => {
    const params = new URLSearchParams(latestSearch);
    if (next === fallback) params.delete(key); else params.set(key, next);
    const query = params.toString();
    latestSearch = query ? `?${query}` : '';
    navigate({ search: latestSearch, hash }, { replace: true, preventScrollReset: true });
  }, [fallback, hash, key, navigate]);
  return [value, set];
}
