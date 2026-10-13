import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { isNavPathActive, navColumnLayout, navMenuColumns, navSections, type ResolvedNavEntry } from '../router/navConfig';
import { useResolvedNav } from '../router/useResolvedNav';
import { ChevronDownIcon, LockIcon } from '../../shared/ui/icons';
import { handleMenuKeys, useDismiss } from '../../shared/ui/useOverlay';

/**
 * MAVERA_DESIGN_SYSTEM.md §6.1: click/Enter/Space opens a module's dropdown
 * (hover never changes the route or opens a menu); Escape closes it and
 * restores focus to the trigger. A locked destination still opens its
 * dropdown to reveal feature names rather than acting as an inert disabled
 * element.
 *
 * Deliberate deviation from the spec's single 280px list (product owner's
 * request): destinations sit under short section headings, and a module with
 * many of them lays its sections out in two or three columns so the whole
 * menu is visible at once instead of scrolling. Columns collapse back to one
 * list on narrow viewports.
 */
/** A valid, space-free id for a section heading (aria-labelledby splits on spaces). */
const sectionId = (menu: string, section: string) => `nav-${menu}-${section.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

function ModuleDropdown({ entry, active }: { entry: Extract<ResolvedNavEntry, { type: 'group' }>; active: boolean }) {
  const location = useLocation();
  // The menu is open only for the page it was opened on, so any navigation —
  // a menu click, the browser's back button, a link elsewhere — closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === location.pathname;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [shift, setShift] = useState(0);

  const close = useCallback((restoreFocus: boolean) => {
    setOpenOn(null);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);
  useDismiss(open, rootRef, close);

  // Keep a wide menu inside the viewport: if it would run off the right edge, slide it left by
  // the overflow (never past the left edge). Measured from the trigger's position and the menu's
  // layout width, neither of which the shift or the open animation changes, so it settles in one
  // pass instead of re-measuring its own movement.
  useLayoutEffect(() => {
    if (!open || !menuRef.current || !rootRef.current) return;
    const left = rootRef.current.getBoundingClientRect().left;
    const overflow = left + menuRef.current.offsetWidth - (window.innerWidth - 12);
    setShift(overflow > 0 ? -Math.min(overflow, Math.max(0, left - 12)) : 0);
  }, [open]);

  const columns = navColumnLayout(navSections(entry.children), navMenuColumns(entry.children));

  return (
    <div className="mv-nav-item" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`mv-nav-trigger${active ? ' is-active' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpenOn(open ? null : location.pathname)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault();
            setOpenOn(location.pathname);
            requestAnimationFrame(() => menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus());
          }
        }}
      >
        {entry.icon && <entry.icon size={16} className="mv-nav-icon" />}
        {entry.label}
        {entry.badge && <span className="mv-nav-badge">{entry.badge}</span>}
        <ChevronDownIcon size={16} className="mv-nav-chevron" />
      </button>
      {open && (
        <div
          ref={menuRef}
          className="mv-nav-dropdown"
          data-columns={columns.length}
          style={shift ? { left: shift } : undefined}
          role="menu"
          aria-label={entry.menuTitle}
          onKeyDown={handleMenuKeys}
        >
          <p className="mv-nav-dropdown-title" aria-hidden="true">{entry.menuTitle}</p>
          <div className="mv-nav-sections">
            {columns.map((column, index) => (
              <div key={index} className="mv-nav-column">
                {column.map((section) => (
                  <div
                    key={section.key}
                    className="mv-nav-section"
                    role="group"
                    aria-labelledby={section.label ? sectionId(entry.key, section.key) : undefined}
                  >
                    {section.label && (
                      <p className="mv-nav-section-title" id={sectionId(entry.key, section.key)}>{section.label}</p>
                    )}
                    {section.children.map((leaf) => (
                      <Link
                        key={leaf.key}
                        role="menuitem"
                        className="mv-nav-dropdown-item"
                        aria-current={isNavPathActive(leaf.path, location.pathname) ? 'page' : undefined}
                        to={leaf.path}
                        onClick={() => close(false)}
                      >
                        <span>{leaf.label}</span>
                        {leaf.locked && (
                          <span className="mv-nav-lock">
                            <LockIcon size={14} />
                            Upgrade
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ModuleNavigation() {
  const location = useLocation();
  const entries = useResolvedNav();

  return (
    <nav className="mv-nav" aria-label="Primary">
      {entries.map((entry) => {
        if (entry.type === 'leaf') {
          const isActive = isNavPathActive(entry.path, location.pathname);
          return (
            <Link key={entry.key} className={`mv-nav-trigger${isActive ? ' is-active' : ''}`} aria-current={isActive ? 'page' : undefined} to={entry.path}>
              {entry.icon && <entry.icon size={16} className="mv-nav-icon" />}
              {entry.label}
            </Link>
          );
        }
        const active = entry.children.some((leaf) => isNavPathActive(leaf.path, location.pathname));
        return <ModuleDropdown key={entry.key} entry={entry} active={active} />;
      })}
    </nav>
  );
}
