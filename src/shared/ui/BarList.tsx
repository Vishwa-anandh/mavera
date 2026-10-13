import type { ReactNode } from 'react';

export interface BarListItem {
  key: string;
  label: ReactNode;
  value: number;
  /** Shown at the end of the row; defaults to the value. */
  display?: ReactNode;
  /** Extra detail under the label, e.g. a share or change. */
  meta?: ReactNode;
  tone?: 'primary' | 'danger' | 'warning' | 'success';
  onSelect?: () => void;
  selected?: boolean;
}

/**
 * Sorted horizontal bars for a categorical breakdown (MAVERA_DESIGN_SYSTEM.md: "sorted bars for
 * categorical breakdown"). Bars are relative to the largest value. Rows become buttons when
 * `onSelect` is given, so a breakdown can refine the page's scope.
 */
export function BarList({ items, label }: { items: BarListItem[]; label: string }) {
  const max = Math.max(0, ...items.map((item) => item.value));
  return (
    <ul className="mv-bar-list" aria-label={label}>
      {items.map((item) => {
        const width = max > 0 ? Math.max(2, (item.value / max) * 100) : 0;
        const body = (
          <>
            <span className="mv-bar-list-row">
              <span className="mv-bar-list-label">{item.label}</span>
              <span className="mv-bar-list-value">{item.display ?? item.value.toLocaleString()}</span>
            </span>
            <span className="mv-bar-list-track" aria-hidden="true">
              <span className={`mv-bar-list-fill mv-bar-list-fill--${item.tone ?? 'primary'}`} style={{ width: `${width}%` }} />
            </span>
            {item.meta && <span className="mv-bar-list-meta">{item.meta}</span>}
          </>
        );
        return (
          <li key={item.key}>
            {item.onSelect ? (
              <button type="button" className={`mv-bar-list-item${item.selected ? ' is-selected' : ''}`} aria-pressed={item.selected} onClick={item.onSelect}>
                {body}
              </button>
            ) : (
              <div className="mv-bar-list-item">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
