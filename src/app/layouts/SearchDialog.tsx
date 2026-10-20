import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LockIcon, SearchIcon } from '../../shared/ui/icons';
import { useAccess } from '../../features/access';
import { useResolvedNav } from '../router/useResolvedNav';
import { buildPageIndex, searchPages, type PageResult } from './pageSearch';
import { useModalOverlay } from '../../shared/ui/useOverlay';

const SUGGESTED_KEYS = ['dashboard', 'alerts', 'sap-systems', 'cloud-overview', 'cloud-analytics'];

/**
 * MAVERA_DESIGN_SYSTEM.md §11.4: shared search dialog, opened from the header or with
 * Ctrl/⌘+K. It finds pages (and only the pages the user's menus offer); searching systems,
 * resources and alerts needs the search API and is not wired yet.
 */
export function SearchDialog({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();
  const entries = useResolvedNav();
  const { can, enforced } = useAccess();
  const panelRef = useModalOverlay<HTMLElement>(onClose);

  const index = useMemo(() => buildPageIndex(entries, enforced ? (module) => can(module, 'VIEW') : undefined), [entries, can, enforced]);
  const hasQuery = query.trim().length > 0;
  const results = useMemo(() => {
    if (hasQuery) return searchPages(index, query);
    return SUGGESTED_KEYS.map((key) => index.find((page) => page.key === key)).filter((page): page is PageResult => Boolean(page));
  }, [hasQuery, index, query]);
  const active = Math.min(activeIndex, Math.max(0, results.length - 1));

  const open = (page: PageResult) => {
    onClose();
    navigate(page.path);
  };

  return (
    <div className="mv-dialog-backdrop mv-search-backdrop" onClick={onClose}>
      <section ref={panelRef} className="mv-dialog mv-search-dialog" role="dialog" aria-modal="true" aria-label="Search pages" onClick={(event) => event.stopPropagation()}>
        <div className="mv-search-field">
          <SearchIcon size={18} aria-hidden />
          <input
            data-autofocus
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="mv-search-results"
            aria-activedescendant={results[active] ? `mv-search-${results[active].key}` : undefined}
            aria-autocomplete="list"
            aria-label="Search pages"
            placeholder="Find a page — try “budgets”, “invoices” or “ST22”"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex((active + 1) % Math.max(1, results.length)); }
              else if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex((active - 1 + results.length) % Math.max(1, results.length)); }
              else if (event.key === 'Enter' && results[active]) { event.preventDefault(); open(results[active]); }
            }}
          />
          <kbd className="mv-kbd">Esc</kbd>
        </div>
        <p className="mv-search-group-label" id="mv-search-label">{hasQuery ? `${results.length} ${results.length === 1 ? 'page' : 'pages'}` : 'Suggested pages'}</p>
        {results.length > 0 ? (
          <ul className="mv-search-results" id="mv-search-results" role="listbox" aria-labelledby="mv-search-label">
            {results.map((page, i) => (
              <li
                key={page.key}
                id={`mv-search-${page.key}`}
                role="option"
                aria-selected={i === active}
                className="mv-search-result"
                onMouseMove={() => i !== active && setActiveIndex(i)}
                onClick={() => open(page)}
              >
                <span className="mv-search-result-label">{page.label}</span>
                <span className="mv-search-result-where">{page.where}</span>
                {page.locked && <span className="mv-nav-lock"><LockIcon size={14} />Upgrade</span>}
              </li>
            ))}
          </ul>
        ) : (
          <div className="mv-search-empty">
            <p>No pages match “{query.trim()}”.</p>
            <p className="mv-muted">Check the spelling, or browse the SAP Monitoring and Cloud Cost menus.</p>
          </div>
        )}
        <p className="mv-search-hint" aria-hidden="true">
          <span><kbd className="mv-kbd">↑</kbd><kbd className="mv-kbd">↓</kbd> to move</span>
          <span><kbd className="mv-kbd">Enter</kbd> to open</span>
          <span><kbd className="mv-kbd">Ctrl</kbd><kbd className="mv-kbd">K</kbd> to search from anywhere</span>
        </p>
      </section>
    </div>
  );
}
