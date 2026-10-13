import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useResolvedNav } from '../router/useResolvedNav';
import { isNavPathActive, navSections } from '../router/navConfig';
import { LockIcon, CloseIcon, ChevronDownIcon } from '../../shared/ui/icons';
import { useModalOverlay } from '../../shared/ui/useOverlay';

/**
 * Below 992px the horizontal module row (MAVERA_DESIGN_SYSTEM.md §5.4)
 * collapses into this drawer, which must still surface every module
 * (NAV-03 acceptance scenario). Each module is a collapsible section — the one
 * holding the current page starts open — so the drawer isn't one 40-row list.
 */
export function MobileNav({ onClose }: { onClose: () => void }) {
  const entries = useResolvedNav();
  const location = useLocation();
  const panelRef = useModalOverlay<HTMLDivElement>(onClose);
  const [expanded, setExpanded] = useState<string | null>(
    () => entries.find((entry) => entry.type === 'group' && entry.children.some((leaf) => isNavPathActive(leaf.path, location.pathname)))?.key ?? null,
  );

  return (
    <div className="mv-mobile-nav-backdrop" onClick={onClose}>
      <div ref={panelRef} className="mv-mobile-nav-panel" role="dialog" aria-modal="true" aria-label="Navigation menu" onClick={(event) => event.stopPropagation()}>
        <div className="mv-panel-header mv-mobile-nav-header">
          <span className="mv-panel-title">Menu</span>
          <button type="button" className="mv-icon-button" aria-label="Close menu" onClick={onClose}>
            <CloseIcon size={18} />
          </button>
        </div>
        <nav aria-label="Primary">
          {entries.map((entry) => {
            if (entry.type === 'leaf') {
              return (
                <Link key={entry.key} className="mv-mobile-nav-link mv-mobile-nav-top" to={entry.path} aria-current={isNavPathActive(entry.path, location.pathname) ? 'page' : undefined} onClick={onClose}>
                  <span>{entry.icon && <entry.icon size={18} />}{entry.label}</span>
                </Link>
              );
            }
            const isOpen = expanded === entry.key;
            const panelId = `mv-mobile-${entry.key}`;
            return (
              <div className="mv-mobile-nav-group" key={entry.key}>
                <button
                  type="button"
                  className="mv-mobile-nav-toggle"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setExpanded(isOpen ? null : entry.key)}
                >
                  <span>{entry.icon && <entry.icon size={18} />}{entry.menuTitle}</span>
                  <ChevronDownIcon size={16} className="mv-nav-chevron" />
                </button>
                {isOpen && (
                  <div id={panelId} className="mv-mobile-nav-sections">
                    {navSections(entry.children).map((section) => (
                      <div key={section.key} className="mv-mobile-nav-section">
                        {section.label && <p className="mv-nav-section-title">{section.label}</p>}
                        {section.children.map((leaf) => (
                          <Link key={leaf.key} className="mv-mobile-nav-link" to={leaf.path} aria-current={isNavPathActive(leaf.path, location.pathname) ? 'page' : undefined} onClick={onClose}>
                            <span>{leaf.label}</span>
                            {leaf.locked && <span className="mv-nav-lock"><LockIcon size={14} />Upgrade</span>}
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
