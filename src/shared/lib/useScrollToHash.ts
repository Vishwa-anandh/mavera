import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Scrolls to the element whose id matches the URL hash (e.g. `/sap/jobs#dumps`) once the page has
 * rendered. Merged pages use it so links to a former page land on the matching section.
 */
export function useScrollToHash(): void {
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    target?.scrollIntoView({ block: 'start' });
  }, [hash]);
}
