import type { ReactNode } from 'react';
import { AlertTriangleIcon } from './icons';

/** Placeholder rows while a table's data loads; keeps the table's width so nothing jumps when it arrives. */
export function TableSkeleton({ columns = 5, rows = 6, label = 'Loading' }: { columns?: number; rows?: number; label?: string }) {
  return (
    <div className="mv-table-wrap" role="status" aria-live="polite" aria-label={label}>
      <table className="mv-table mv-skeleton-table" aria-hidden>
        <thead>
          <tr>
            {Array.from({ length: columns }, (_, c) => <th key={c}><span className="mv-skeleton mv-skeleton--head" /></th>)}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, r) => (
            <tr key={r}>
              {Array.from({ length: columns }, (_, c) => (
                <td key={c}><span className="mv-skeleton" style={{ width: `${c === 0 ? 70 : 45 + ((r * 7 + c * 13) % 40)}%` }} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <span className="mv-sr-only">{label}…</span>
    </div>
  );
}

/** Something failed to load: says what happened and offers the retry. */
export function ErrorState({ heading = 'Couldn’t load this data', explanation, onRetry }: { heading?: string; explanation?: ReactNode; onRetry?: () => void }) {
  return (
    <section className="mv-empty mv-empty--error" role="alert">
      <div className="mv-empty-icon" aria-hidden><AlertTriangleIcon size={28} /></div>
      <h2>{heading}</h2>
      <p>{explanation ?? 'Something went wrong while fetching it. Your data is safe — try again in a moment.'}</p>
      {onRetry && <button type="button" className="mv-secondary-button" onClick={onRetry}>Try again</button>}
    </section>
  );
}
