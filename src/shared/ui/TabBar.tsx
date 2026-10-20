import { useRef, type KeyboardEvent, type ReactNode } from 'react';

export interface TabBarItem {
  id: string;
  label: string;
  /** Small count shown after the label, e.g. the number of members. */
  count?: number;
}

interface TabBarProps {
  items: TabBarItem[];
  activeId: string;
  onChange: (id: string) => void;
  /** Names the tab list for assistive tech, e.g. "User management sections". */
  label: string;
  /** Prefix for the ids that tie each tab to its panel: tab `${idPrefix}-tab-x`, panel `${idPrefix}-panel-x`. */
  idPrefix: string;
  children?: ReactNode;
}

/** The attributes a tab's panel needs to be tied to its tab (see TabBar). */
export function tabPanelProps(idPrefix: string, id: string) {
  return { role: 'tabpanel' as const, id: `${idPrefix}-panel-${id}`, 'aria-labelledby': `${idPrefix}-tab-${id}` };
}

/**
 * Underlined tabs for a page that splits into a few parts (WAI-ARIA tabs pattern: arrow keys move between
 * tabs, Home/End jump to the ends, only the active tab is in the tab order). The page renders the panel itself
 * with role="tabpanel", id `${idPrefix}-panel-${id}` and aria-labelledby `${idPrefix}-tab-${id}`.
 */
export function TabBar({ items, activeId, onChange, label, idPrefix, children }: TabBarProps) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = items.findIndex((item) => item.id === activeId);
    const move = (to: number) => {
      const next = items[(to + items.length) % items.length];
      onChange(next.id);
      refs.current[next.id]?.focus();
    };
    if (event.key === 'ArrowRight') { event.preventDefault(); move(index + 1); }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); move(index - 1); }
    else if (event.key === 'Home') { event.preventDefault(); move(0); }
    else if (event.key === 'End') { event.preventDefault(); move(items.length - 1); }
  };

  return (
    <div className="mv-tabbar">
      <div className="mv-tabbar-list" role="tablist" aria-label={label} onKeyDown={onKeyDown}>
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <button
              key={item.id}
              ref={(el) => { refs.current[item.id] = el; }}
              type="button"
              role="tab"
              id={`${idPrefix}-tab-${item.id}`}
              aria-selected={active}
              aria-controls={`${idPrefix}-panel-${item.id}`}
              tabIndex={active ? 0 : -1}
              className={`mv-tabbar-tab${active ? ' is-active' : ''}`}
              onClick={() => onChange(item.id)}
            >
              {item.label}
              {item.count !== undefined && <span className="mv-tabbar-count">{item.count}</span>}
            </button>
          );
        })}
      </div>
      {children}
    </div>
  );
}
