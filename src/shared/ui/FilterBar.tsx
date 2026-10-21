import type { ReactNode } from 'react';

interface FilterBarProps {
  /** Names the search region for assistive technology, e.g. "Filter background jobs". */
  label: string;
  /** Narrow variant for drawers, where the search takes the full width. */
  drawer?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * The row that holds a page's search box and its filters (selects, chips, switches, Clear). Everything sits on
 * one line and wraps onto the next only when the screen is too narrow, so search and filters always read as one
 * control strip.
 */
export function FilterBar({ label, drawer, className, children }: FilterBarProps) {
  return (
    <div className={`mv-filter-bar${drawer ? ' mv-filter-bar--drawer' : ''}${className ? ` ${className}` : ''}`} role="search" aria-label={label}>
      {children}
    </div>
  );
}
