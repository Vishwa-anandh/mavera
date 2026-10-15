import type { ReactNode } from 'react';

/**
 * Appears above a table while rows are selected: how many, a way to clear them, and the bulk
 * actions. Renders nothing when nothing is selected.
 */
export function SelectionBar({ count, noun = 'selected', onClear, children }: { count: number; noun?: string; onClear: () => void; children: ReactNode }) {
  if (count === 0) return null;
  return (
    <div className="mv-selection-bar" role="region" aria-label="Bulk actions">
      <strong>{count} {noun}</strong>
      <button type="button" className="mv-link-button" onClick={onClear}>Clear</button>
      <div className="mv-selection-bar-actions">{children}</div>
    </div>
  );
}
