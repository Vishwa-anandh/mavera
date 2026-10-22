import { useCallback, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth';
import { useOnboardingProgress, useShowChecklist } from '../../features/workspace';
import { openOnArrivalTarget } from '../../shared/lib/useOpenOnArrival';
import { useMaveraTheme } from '../../shared/theme/ThemeProvider';
import { useConfirm } from '../../shared/ui/ConfirmProvider';
import { handleMenuKeys, useDismiss } from '../../shared/ui/useOverlay';
import maitsysLogo from '../../../assets/brand/maitsys.png';

/** MAVERA_DESIGN_SYSTEM.md §6.1 profile menu: Account · Subscription (read-only) · Billing · Appearance · Help · Sign out. */
export function ProfileMenu() {
  const { user, logout, modules } = useAuth();
  const checklist = useOnboardingProgress(modules);
  const showChecklist = useShowChecklist();
  const { mode, toggleMode } = useMaveraTheme();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const location = useLocation();
  // Open only on the page it was opened on, so following any link closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === location.pathname;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback((restoreFocus: boolean) => {
    setOpenOn(null);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);
  useDismiss(open, rootRef, close);

  const handleLogout = async () => {
    close(false);
    const ok = await confirm({ title: 'Log out of Mavera?', variant: 'logout', okText: 'Log out' });
    if (ok) {
      await logout();
      navigate('/login');
    }
  };

  const displayName = user?.name || user?.email?.split('@')[0] || 'Account';
  const orgName = user?.orgName?.trim();
  const initial = displayName.slice(0, 1).toUpperCase() || 'M';

  return (
    <div className="mv-profile" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="mv-profile-trigger"
        aria-label="Profile menu"
        aria-describedby="mv-profile-trigger-text"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpenOn(open ? null : location.pathname)}
      >
        <span className="mv-avatar" aria-hidden="true">{initial}</span>
        <span className="mv-profile-trigger-text" id="mv-profile-trigger-text">
          <span className="mv-profile-trigger-name">{displayName}</span>
          {orgName && <span className="mv-profile-trigger-org">{orgName}</span>}
        </span>
      </button>
      {open && (
        <div className="mv-menu-panel mv-profile-panel" role="menu" aria-label="Profile" onKeyDown={handleMenuKeys}>
          <div className="mv-profile-identity">
            <span className="mv-avatar" aria-hidden="true">{initial}</span>
            <span>
              <strong>{displayName}</strong>
              <span className="mv-muted">{user?.email}</span>
              {orgName && <span className="mv-profile-org">{orgName}</span>}
            </span>
          </div>
          <div className="mv-menu-divider" role="separator" />
          {checklist.relevant && (
            <button type="button" role="menuitem" className="mv-menu-item" onClick={() => { close(false); showChecklist(); }}>
              Getting started
              <span className="mv-menu-item-hint">{checklist.doneCount} of {checklist.total} done</span>
            </button>
          )}
          <Link role="menuitem" className="mv-menu-item" to="/account">Account</Link>
          <Link role="menuitem" className="mv-menu-item" to="/subscription">Subscription</Link>
          <Link role="menuitem" className="mv-menu-item" to={openOnArrivalTarget('/subscription', 'request-plan')} onClick={() => close(false)}>
            Request a plan
            <span className="mv-menu-item-hint">Ask Maitsys to change plan</span>
          </Link>
          <Link role="menuitem" className="mv-menu-item" to="/billing">Billing &amp; invoices</Link>
          <button type="button" role="menuitemcheckbox" aria-checked={mode === 'dark'} className="mv-menu-item" onClick={toggleMode}>
            Dark appearance
            <span className="mv-toggle" aria-hidden="true" data-on={mode === 'dark'} />
          </button>
          <a role="menuitem" className="mv-menu-item" href="https://www.maitsys.com/contact-us" target="_blank" rel="noopener noreferrer">
            Help &amp; support
            <span className="mv-menu-item-hint">Opens maitsys.com</span>
          </a>
          <div className="mv-menu-divider" role="separator" />
          <button type="button" role="menuitem" className="mv-menu-item mv-menu-item--danger" onClick={handleLogout}>Log out</button>
          <div className="mv-menu-footer">
            Powered by <img src={maitsysLogo} alt="Maitsys" />
          </div>
        </div>
      )}
    </div>
  );
}
