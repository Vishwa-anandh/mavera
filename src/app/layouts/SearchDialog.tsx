import { Fragment, useEffect, useMemo, useState, type ComponentType } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FileTextIcon, LockIcon, SearchIcon } from '../../shared/ui/icons';
import { useAccess } from '../../features/access';
import { useAuth } from '../../features/auth';
import { hasPageTour, requestOpenAssistant, requestPageTour } from '../../features/assistant';
import { openConnectDialog } from '../../features/workspace';
import { derivePermissions } from '../../shared/lib/permissions';
import { useMaveraTheme } from '../../shared/theme/ThemeProvider';
import { useResolvedNav } from '../router/useResolvedNav';
import { buildPageIndex, rankItems, type PageResult } from './pageSearch';
import { buildCommandIndex, recentIdForAction, recentIdForPage, SUGGESTED_ACTION_IDS, type CommandAction } from './commandActions';
import { readRecents, rememberRecent } from './commandRecents';
import { useModalOverlay } from '../../shared/ui/useOverlay';

/** How many rows the palette shows before anything is typed. */
const EMPTY_STATE_ROWS = 8;
const SUGGESTED_PAGE_KEYS = ['dashboard', 'alerts', 'sap-systems', 'cloud-overview', 'cloud-analytics'];

type Icon = ComponentType<{ size?: number; className?: string }>;

/** One selectable row, whether it is a command or a page. */
interface Entry {
  /** Unique within the list; also what recents remember. */
  id: string;
  domId: string;
  type: 'action' | 'page';
  label: string;
  where: string;
  icon: Icon;
  locked: boolean;
  action?: CommandAction;
  page?: PageResult;
}

interface Group {
  key: string;
  label: string;
  entries: Entry[];
}

const actionEntry = (action: CommandAction): Entry => ({
  id: recentIdForAction(action.id), domId: `mv-search-action-${action.id}`, type: 'action', label: action.label, where: action.where, icon: action.icon, locked: false, action,
});
const pageEntry = (page: PageResult): Entry => ({
  id: recentIdForPage(page.key), domId: `mv-search-page-${page.key}`, type: 'page', label: page.label, where: page.where, icon: FileTextIcon, locked: page.locked, page,
});

const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

/** What a screen reader hears when the results change. */
function announcement(query: string, actions: number, pages: number, recent: number): string {
  if (!query) return recent > 0 ? `${plural(recent, 'recent item')} and suggestions. Type to search.` : 'Suggested commands and pages. Type to search.';
  const total = actions + pages;
  if (total === 0) return `No results for ${query}.`;
  return `${plural(total, 'result')}: ${plural(actions, 'command')}, ${plural(pages, 'page')}.`;
}

/**
 * MAVERA_DESIGN_SYSTEM.md §11.4: the command palette, opened from the header or with Ctrl/⌘+K. It runs
 * commands (connect an account, add a budget, upload an invoice, add a user...) and finds pages, offering
 * only what the user's menus and role allow. Commands are listed above pages; with nothing typed it shows
 * the last five things used. Searching systems, resources and alerts needs the search API and is not wired yet.
 */
export function SearchDialog({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const entries = useResolvedNav();
  const { can, enforced } = useAccess();
  const { user, cloudAccess, invoiceOnly } = useAuth();
  const { mode, toggleMode } = useMaveraTheme();
  const panelRef = useModalOverlay<HTMLElement>(onClose);
  const [recentIds, setRecentIds] = useState(() => readRecents(user?.id));

  const pages = useMemo(() => buildPageIndex(entries, enforced ? (module) => can(module, 'VIEW') : undefined), [entries, can, enforced]);
  const actions = useMemo(
    () => buildCommandIndex({ pages, can, permissions: derivePermissions(user, cloudAccess, invoiceOnly), pathname, pageHasTour: hasPageTour(pathname), themeMode: mode }),
    [pages, can, user, cloudAccess, invoiceOnly, pathname, mode],
  );

  const trimmed = query.trim();
  const hasQuery = trimmed.length > 0;

  const { groups, counts } = useMemo(() => {
    const all = [...actions.map(actionEntry), ...pages.map(pageEntry)];
    const byId = new Map(all.map((entry) => [entry.id, entry]));
    if (hasQuery) {
      const actionHits = rankItems(actions, trimmed, { matchWhere: false }).map(actionEntry);
      const pageHits = rankItems(pages, trimmed).map(pageEntry);
      return {
        groups: [{ key: 'actions', label: 'Actions', entries: actionHits }, { key: 'pages', label: 'Pages', entries: pageHits }].filter((group) => group.entries.length > 0) as Group[],
        counts: { actions: actionHits.length, pages: pageHits.length, recent: 0 },
      };
    }
    const recent = recentIds.map((id) => byId.get(id)).filter((entry): entry is Entry => Boolean(entry));
    const taken = new Set(recent.map((entry) => entry.id));
    // The empty palette stays short enough to show without scrolling: recents first, suggestions fill the rest.
    const room = Math.max(0, EMPTY_STATE_ROWS - recent.length);
    const suggest = (ids: string[], limit: number) => ids.flatMap((id) => { const entry = byId.get(id); return entry && !taken.has(entry.id) ? [entry] : []; }).slice(0, limit);
    const suggestedActions = suggest(SUGGESTED_ACTION_IDS.map(recentIdForAction), Math.ceil(room / 2));
    const suggestedPages = suggest(SUGGESTED_PAGE_KEYS.map(recentIdForPage), room - suggestedActions.length);
    const list: Group[] = [
      { key: 'recent', label: 'Recent', entries: recent },
      { key: 'suggested-actions', label: 'Suggested actions', entries: suggestedActions },
      { key: 'suggested-pages', label: 'Suggested pages', entries: suggestedPages },
    ];
    return { groups: list.filter((group) => group.entries.length > 0), counts: { actions: suggestedActions.length, pages: suggestedPages.length, recent: recent.length } };
  }, [actions, pages, hasQuery, trimmed, recentIds]);

  const flat = useMemo(() => groups.flatMap((group) => group.entries), [groups]);
  const positions = useMemo(() => new Map(flat.map((entry, i) => [entry.id, i])), [flat]);
  const active = Math.min(activeIndex, Math.max(0, flat.length - 1));
  const activeEntry = flat[active];

  useEffect(() => {
    if (activeEntry) document.getElementById(activeEntry.domId)?.scrollIntoView?.({ block: 'nearest' });
  }, [activeEntry]);

  const run = (entry: Entry) => {
    setRecentIds(rememberRecent(user?.id, entry.id));
    onClose();
    if (entry.page) { navigate(entry.page.path); return; }
    const command = entry.action?.run;
    if (!command) return;
    if (command.kind === 'navigate') navigate(command.to);
    else if (command.kind === 'theme') toggleMode();
    // Connect commands open the shared dialog where the user already is, once the palette has handed focus back.
    else if (command.kind === 'connect') window.setTimeout(() => openConnectDialog(command.provider), 0);
    // Let the palette finish closing (and hand focus back) before the assistant takes over.
    else if (command.kind === 'assistant') window.setTimeout(requestOpenAssistant, 0);
    else window.setTimeout(requestPageTour, 0);
  };

  const move = (delta: number) => setActiveIndex((active + delta + flat.length) % Math.max(1, flat.length));

  return (
    <div className="mv-dialog-backdrop mv-search-backdrop" onClick={onClose}>
      <section ref={panelRef} className="mv-dialog mv-search-dialog" role="dialog" aria-modal="true" aria-label="Search or run a command" onClick={(event) => event.stopPropagation()}>
        <div className="mv-search-field">
          <SearchIcon size={18} aria-hidden />
          <input
            data-autofocus
            role="combobox"
            aria-expanded={flat.length > 0}
            aria-controls="mv-search-results"
            aria-activedescendant={activeEntry?.domId}
            aria-autocomplete="list"
            aria-label="Search pages or run a command"
            placeholder="Search pages or run a command"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') { event.preventDefault(); move(1); }
              else if (event.key === 'ArrowUp') { event.preventDefault(); move(-1); }
              else if (event.key === 'Enter' && activeEntry) { event.preventDefault(); run(activeEntry); }
            }}
          />
          <kbd className="mv-kbd">Esc</kbd>
        </div>
        <p className="mv-sr-only" role="status" aria-live="polite">{announcement(trimmed, counts.actions, counts.pages, counts.recent)}</p>
        {flat.length > 0 ? (
          <div className="mv-search-results" id="mv-search-results" role="listbox" aria-label={hasQuery ? 'Results' : 'Recent and suggested'}>
            {groups.map((group) => (
              <Fragment key={group.key}>
                <p className="mv-search-group-label" id={`mv-search-group-${group.key}`} aria-hidden="true">{group.label}</p>
                <ul role="group" aria-labelledby={`mv-search-group-${group.key}`} className="mv-search-group">
                  {group.entries.map((entry) => {
                    const index = positions.get(entry.id) ?? 0;
                    const Glyph = entry.icon;
                    const selected = index === active;
                    return (
                      <li
                        key={entry.id}
                        id={entry.domId}
                        role="option"
                        aria-selected={selected}
                        aria-label={`${entry.type === 'action' ? 'Command' : 'Page'}: ${entry.label}, ${entry.where}${entry.locked ? ', upgrade needed' : ''}`}
                        className={`mv-search-result mv-search-result--${entry.type}`}
                        onMouseMove={() => index !== active && setActiveIndex(index)}
                        onClick={() => run(entry)}
                      >
                        <span className="mv-search-result-icon" aria-hidden="true"><Glyph size={16} /></span>
                        <span className="mv-search-result-label">{entry.label}</span>
                        <span className="mv-search-result-where">{entry.where}</span>
                        {entry.locked && <span className="mv-nav-lock"><LockIcon size={14} />Upgrade</span>}
                        {selected && !entry.locked && <span className="mv-search-result-key" aria-hidden="true"><kbd className="mv-kbd">Enter</kbd>{entry.type === 'action' ? 'Run' : 'Open'}</span>}
                      </li>
                    );
                  })}
                </ul>
              </Fragment>
            ))}
          </div>
        ) : (
          <div className="mv-search-empty">
            <p>{hasQuery ? `Nothing matches “${trimmed}”.` : 'Nothing to suggest yet.'}</p>
            <p className="mv-muted">{hasQuery ? 'Check the spelling, or browse the SAP Monitoring and Cloud Cost menus.' : 'Use the menus to find a page.'}</p>
          </div>
        )}
        <p className="mv-search-hint" aria-hidden="true">
          <span><kbd className="mv-kbd">↑</kbd><kbd className="mv-kbd">↓</kbd> to move</span>
          <span><kbd className="mv-kbd">Enter</kbd> to run or open</span>
          <span><kbd className="mv-kbd">Ctrl</kbd><kbd className="mv-kbd">K</kbd> from anywhere</span>
        </p>
      </section>
    </div>
  );
}
