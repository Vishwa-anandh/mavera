import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useSuperAdminAuth } from '../model/SuperAdminAuthContext';
import { HomeIcon, BuildingIcon, CreditCardIcon, MenuIcon, CloseIcon } from '../../../shared/ui/icons';
import maveraLogo from '../../../../assets/brand/mavera-logo.png';

const LINKS = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: HomeIcon, end: true },
  { to: '/admin/organizations', label: 'Organizations', icon: BuildingIcon, end: false },
  { to: '/admin/billing', label: 'Billing', icon: CreditCardIcon, end: false },
];

const navLinkClass = ({ isActive }: { isActive: boolean }) => `mv-nav-trigger${isActive ? ' is-active' : ''}`;

/**
 * Shared chrome for every authenticated /admin/* page — deliberately reuses
 * the exact same dark topbar/nav-trigger treatment as the org app's
 * AppShell (same classes, same "ink" header) rather than a visually
 * distinct admin skin, per product direction. A small "Admin" badge next
 * to the logo is the only thing marking this as the internal portal.
 *
 * Pages render inside one full-width content area (no max-width, so wide
 * screens don't get empty side gutters). Below 992px the links, identity and
 * Log out move into a menu drawer so nothing is pushed off-screen.
 */
export function SuperAdminShell() {
  const { username, logout } = useSuperAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Open only on the page it was opened on, so choosing a link closes it.
  const [menuOpenOn, setMenuOpenOn] = useState<string | null>(null);
  const menuOpen = menuOpenOn === location.pathname;

  const signOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="mv-page">
      <a className="mv-skip-link" href="#mv-sa-main">Skip to content</a>
      <div className="mv-shell">
        <header className="mv-topbar mv-sa-topbar">
          <button type="button" className="mv-icon-button mv-mobile-menu-button" aria-label="Open navigation menu" aria-expanded={menuOpen} onClick={() => setMenuOpenOn(location.pathname)}>
            <MenuIcon size={20} />
          </button>
          <Link className="mv-brand" to="/admin/dashboard" aria-label="Mavera Super Admin home">
            <img className="mv-brand-logo" src={maveraLogo} alt="Mavera" />
          </Link>
          <span className="mv-sa-portal-badge">Admin</span>
          <nav className="mv-nav" aria-label="Super Admin">
            {LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={navLinkClass}>
                <link.icon size={16} className="mv-nav-icon" />{link.label}
              </NavLink>
            ))}
          </nav>
          <div className="mv-utility mv-sa-utility">
            <span className="mv-sa-identity">Signed in as <strong>{username}</strong></span>
            <button type="button" className="mv-secondary-button" onClick={signOut}>Log out</button>
          </div>
        </header>
        <main className="mv-sa-main" id="mv-sa-main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
      {menuOpen && (
        <div className="mv-mobile-nav-backdrop" onClick={() => setMenuOpenOn(null)}>
          <div
            className="mv-mobile-nav-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Super Admin menu"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => { if (event.key === 'Escape') setMenuOpenOn(null); }}
          >
            <div className="mv-panel-header mv-mobile-nav-header">
              <span className="mv-panel-title">Super Admin</span>
              <button type="button" className="mv-icon-button" aria-label="Close menu" autoFocus onClick={() => setMenuOpenOn(null)}>
                <CloseIcon size={18} />
              </button>
            </div>
            <nav aria-label="Super Admin">
              {LINKS.map((link) => (
                <NavLink key={link.to} to={link.to} end={link.end} className="mv-mobile-nav-link mv-mobile-nav-top">
                  <span><link.icon size={18} />{link.label}</span>
                </NavLink>
              ))}
            </nav>
            <div className="mv-sa-drawer-footer">
              <p className="mv-muted">Signed in as <strong>{username}</strong></p>
              <button type="button" className="mv-secondary-button" onClick={signOut}>Log out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
