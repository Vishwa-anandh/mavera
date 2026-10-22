import { useEffect, useState } from 'react';

/** The width at and below which the step rail becomes a horizontal stepper plus a drawer. */
export const COMPACT_QUERY = '(max-width: 1024px)';

/** True at the compact widths; false where matchMedia does not exist (isolated tests). */
export function useCompactLayout(): boolean {
  const read = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(COMPACT_QUERY).matches;
  const [compact, setCompact] = useState(read);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(COMPACT_QUERY);
    const onChange = () => setCompact(query.matches);
    onChange();
    query.addEventListener?.('change', onChange);
    return () => query.removeEventListener?.('change', onChange);
  }, []);
  return compact;
}
