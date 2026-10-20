import { useEffect, useState } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth';
import { ModuleNavigation } from './ModuleNavigation';
import { MobileNav } from './MobileNav';
import { SearchDialog } from './SearchDialog';
import { NotificationsDrawer } from './NotificationsDrawer';
import { ProfileMenu } from './ProfileMenu';
import { formatBadgeCount, useNotifications } from './notifications';
import { AssistantWidget } from '../../features/assistant';
import { PreviewBanner, RouteAccessGuard } from '../../features/access';
import { productModuleFor, routeModuleFor } from '../router/route-manifest';
import { ModuleNotSubscribed } from './ModuleNotSubscribed';
import { SearchIcon, BellIcon, HelpIcon, MenuIcon } from '../../shared/ui/icons';
import maveraLogo from '../../../assets/brand/mavera-logo.png';

type Overlay = 'search' | 'notifications' | 'mobile-nav' | null;

export function AppShell() {
  const { isAuthenticated, loading, modules } = useAuth();
  const { pathname } = useLocation();
  const [overlay, setOverlay] = useState<Overlay>(null);
  const notifications = useNotifications(modules);
  const neededModule = productModuleFor(pathname);
  const missingModule = neededModule && !modules[neededModule] ? neededModule : undefined;
  const unread = notifications.unreadCount;

  // Ctrl/⌘+K opens page search from anywhere, the convention users bring from other tools.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOverlay('search');
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  if (loading) {
    return (
      <div className="mv-page" style={{ display: 'grid', minHeight: '100vh', placeItems: 'center' }}>
        <img className="mv-brand-logo" src={maveraLogo} alt="Mavera" aria-label="Loading application" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const close = () => setOverlay(null);

  return (
    <div className="mv-page">
      <a className="mv-skip-link" href="#mv-main">Skip to content</a>
      <div className="mv-shell">
        <header className="mv-topbar">
          <button
            type="button"
            className="mv-icon-button mv-mobile-menu-button"
            aria-label="Open navigation menu"
            aria-expanded={overlay === 'mobile-nav'}
            onClick={() => setOverlay('mobile-nav')}
          >
            <MenuIcon size={20} />
          </button>
          <Link className="mv-brand" to="/" aria-label="Mavera home">
            <img className="mv-brand-logo" src={maveraLogo} alt="Mavera" />
          </Link>
          <ModuleNavigation />
          <div className="mv-utility">
            <button type="button" className="mv-icon-button" aria-label="Search pages (Ctrl+K)" title="Search pages (Ctrl+K)" onClick={() => setOverlay('search')}>
              <SearchIcon size={20} />
            </button>
            <button
              type="button"
              className="mv-icon-button"
              aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
              title={unread > 0 ? `${unread} unread notifications` : 'Notifications'}
              aria-expanded={overlay === 'notifications'}
              onClick={() => setOverlay('notifications')}
            >
              <BellIcon size={20} />
              {unread > 0 && <span className="mv-badge-count" aria-hidden="true">{formatBadgeCount(unread)}</span>}
            </button>
            <a className="mv-icon-button" aria-label="Help and support (opens maitsys.com)" title="Help and support" href="https://www.maitsys.com/contact-us" target="_blank" rel="noopener noreferrer">
              <HelpIcon size={20} />
            </a>
            <ProfileMenu />
          </div>
        </header>
        <PreviewBanner />
        <main className="mv-content" id="mv-main" tabIndex={-1}>
          {missingModule ? (
            <ModuleNotSubscribed module={missingModule} />
          ) : (
            <RouteAccessGuard module={routeModuleFor(pathname)}><Outlet /></RouteAccessGuard>
          )}
        </main>
      </div>
      {overlay === 'mobile-nav' && <MobileNav onClose={close} />}
      {overlay === 'search' && <SearchDialog onClose={close} />}
      {overlay === 'notifications' && <NotificationsDrawer onClose={close} notifications={notifications} />}
      <AssistantWidget />
    </div>
  );
}
