import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CloseIcon } from '../../shared/ui/icons';
import type { NotificationsState } from './notifications';
import { useModalOverlay } from '../../shared/ui/useOverlay';
import { useConnectionStatus } from '../../features/workspace';

/**
 * MAVERA_DESIGN_SYSTEM.md §11.5: shared notifications drawer — 400px from the right edge
 * (full width on phones), All/Unread tabs, mark read, mark all read and open destination.
 * Reading an item never removes it.
 */
export function NotificationsDrawer({ onClose, notifications }: { onClose: () => void; notifications: NotificationsState }) {
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const navigate = useNavigate();
  const panelRef = useModalOverlay<HTMLElement>(onClose);
  const { items, unreadCount, markRead, markAllRead } = notifications;
  const visible = tab === 'unread' ? items.filter((item) => !item.read) : items;
  // A brand-new organisation has nothing to be notified about yet: the one next step is its first connection.
  const { nothingConnected, firstStep } = useConnectionStatus();

  return (
    <div className="mv-drawer-backdrop" onClick={onClose}>
      <section ref={panelRef} className="mv-drawer" role="dialog" aria-modal="true" aria-labelledby="mv-notifications-title" onClick={(event) => event.stopPropagation()}>
        <header className="mv-drawer-header">
          <h2 className="mv-panel-title" id="mv-notifications-title">Notifications</h2>
          <button type="button" className="mv-icon-button" aria-label="Close notifications" onClick={onClose}>
            <CloseIcon size={18} />
          </button>
        </header>
        <div className="mv-drawer-toolbar">
          <div className="mv-segmented" role="tablist" aria-label="Filter notifications">
            <button type="button" role="tab" aria-selected={tab === 'all'} className={`mv-segmented-btn${tab === 'all' ? ' is-active' : ''}`} onClick={() => setTab('all')} data-autofocus>
              All
            </button>
            <button type="button" role="tab" aria-selected={tab === 'unread'} className={`mv-segmented-btn${tab === 'unread' ? ' is-active' : ''}`} onClick={() => setTab('unread')}>
              Unread{unreadCount > 0 && <span className="mv-count-chip">{unreadCount}</span>}
            </button>
          </div>
          <button type="button" className="mv-quiet-button" onClick={markAllRead} disabled={unreadCount === 0}>
            Mark all as read
          </button>
        </div>
        <div className="mv-drawer-body">
          {visible.length === 0 ? (
            <div className="mv-drawer-empty">
              <p className="mv-drawer-empty-title">{tab === 'unread' ? 'No unread notifications' : 'No notifications yet'}</p>
              <p className="mv-muted">{tab === 'unread' ? 'You’re all caught up. Switch to All to see earlier notifications.' : nothingConnected ? 'Nothing is connected yet. Alerts from your subscribed modules appear here once an account or SAP system is connected.' : 'Alerts from your subscribed modules will appear here.'}</p>
              {tab === 'all' && nothingConnected && (
                <button type="button" className="mv-primary-button" onClick={() => { onClose(); navigate(firstStep.path); }}>{firstStep.label}</button>
              )}
            </div>
          ) : (
            <ul className="mv-notification-list">
              {visible.map((item) => (
                <li key={item.id} className={`mv-notification${item.read ? '' : ' is-unread'}`}>
                  <button
                    type="button"
                    className="mv-notification-open"
                    onClick={() => {
                      markRead(item.id);
                      if (item.path) {
                        onClose();
                        navigate(item.path);
                      }
                    }}
                  >
                    <span className="mv-notification-dot" aria-hidden="true" />
                    <span className="mv-notification-text">
                      <span className="mv-notification-title">
                        {!item.read && <span className="mv-sr-only">Unread: </span>}
                        {item.title}
                      </span>
                      <span className="mv-muted">{item.module} · {item.timestamp}</span>
                    </span>
                  </button>
                  {!item.read && (
                    <button type="button" className="mv-quiet-button mv-notification-mark" onClick={() => markRead(item.id)} aria-label={`Mark "${item.title}" as read`}>
                      Mark read
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
