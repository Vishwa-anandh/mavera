import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { activityRepository, isEmptyWorkspace } from '../../data-access';
import { useAlertsVersion } from '../../shared/lib/alertsChanged';
import type { NavModules } from '../router/navConfig';

export interface NotificationItem {
  id: string;
  title: string;
  module: 'SAP Monitoring' | 'Cloud Cost';
  timestamp: string;
  read: boolean;
  /** Where "open" takes the user; the destination page re-checks access itself. */
  path?: string;
}

const MODULE_FLAG: Record<NotificationItem['module'], keyof NavModules> = {
  'SAP Monitoring': 'sapMonitoring',
  'Cloud Cost': 'cloudCost',
};

// Prototype feed until the notifications API exists.
const SEED: NotificationItem[] = [
  { id: 'n1', title: 'SAP system HANA-PRD reported a critical condition', module: 'SAP Monitoring', timestamp: '10 minutes ago', read: false, path: '/sap/systems' },
  { id: 'n2', title: 'Azure cost threshold exceeded for Production subscription', module: 'Cloud Cost', timestamp: '1 hour ago', read: false, path: '/budgets' },
  { id: 'n4', title: 'Monthly cost report is ready to download', module: 'Cloud Cost', timestamp: 'Yesterday', read: true, path: '/cloud/analytics' },
];

/**
 * A populated organisation gets the prototype feed above. A brand-new one has none until something it connected
 * raises an alert: then its newest active alerts (the same ones the Alerts page lists) are its notifications.
 */
function baseItems(): NotificationItem[] {
  if (!isEmptyWorkspace()) return SEED;
  return activityRepository.listAlerts().slice(0, 5).map((alert) => ({
    id: `n-${alert.id}`,
    title: alert.summary.length > 110 ? `${alert.summary.slice(0, 107)}…` : alert.summary,
    module: alert.module === 'SAP' ? 'SAP Monitoring' : 'Cloud Cost',
    timestamp: alert.timestamp ? `Today, ${alert.timestamp}` : 'Recently',
    read: false,
    path: alert.module === 'SAP' ? '/sap/alerts' : '/smart-alerts',
  }));
}

export interface NotificationsState {
  items: NotificationItem[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

/**
 * One list shared by the header badge and the drawer, so the count always matches what the
 * drawer shows. Items from a module the org isn't subscribed to are never shown
 * (MAVERA_DESIGN_SYSTEM.md §7.3).
 */
export function useNotifications(modules: NavModules): NotificationsState {
  // Which items were read; the feed itself is re-read when the page changes, so new alerts show up.
  const [readIds, setReadIds] = useState<ReadonlySet<string>>(() => new Set(SEED.filter((item) => item.read).map((item) => item.id)));
  const { pathname } = useLocation();
  // Re-read when the page changes or an alert is resolved or ignored elsewhere (the dashboard), so the badge never lags.
  const alertsVersion = useAlertsVersion();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the version and path only invalidate; baseItems reads the stores.
  const all = useMemo(baseItems, [pathname, alertsVersion]);
  const items = useMemo(
    () => all.map((item) => (readIds.has(item.id) ? { ...item, read: true } : item)).filter((item) => modules[MODULE_FLAG[item.module]]),
    [all, readIds, modules],
  );
  return {
    items,
    unreadCount: items.filter((item) => !item.read).length,
    markRead: (id) => setReadIds((current) => new Set(current).add(id)),
    markAllRead: () => setReadIds((current) => new Set([...current, ...all.map((item) => item.id)])),
  };
}

/** "99+" past 99, per the badge spec; the accessible label still carries the exact number. */
export function formatBadgeCount(count: number): string {
  return count > 99 ? '99+' : String(count);
}
