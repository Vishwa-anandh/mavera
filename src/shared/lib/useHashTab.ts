import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * The active tab of a tabbed page, kept in the URL hash (`/budgets#integrations`) so a tab can be linked to,
 * survives a refresh and works with the browser's back button. An unknown or missing hash falls back to
 * `fallback` (the first tab by default). Switching replaces the history entry, so Back leaves the page
 * rather than walking through every tab that was visited.
 */
export function useHashTab<T extends string>(ids: readonly T[], fallback: T = ids[0]): [T, (id: T) => void] {
  const { hash } = useLocation();
  const navigate = useNavigate();
  const candidate = hash.replace('#', '') as T;
  const active = ids.includes(candidate) ? candidate : fallback;
  const select = useCallback((id: T) => navigate({ hash: `#${id}` }, { replace: true, preventScrollReset: true }), [navigate]);
  return [active, select];
}
