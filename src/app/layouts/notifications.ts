import { useMemo, useState } from 'react';
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
  const [all, setAll] = useState(SEED);
  const items = useMemo(() => all.filter((item) => modules[MODULE_FLAG[item.module]]), [all, modules]);
  return {
    items,
    unreadCount: items.filter((item) => !item.read).length,
    markRead: (id) => setAll((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item))),
    markAllRead: () => setAll((current) => current.map((item) => ({ ...item, read: true }))),
  };
}

/** "99+" past 99, per the badge spec; the accessible label still carries the exact number. */
export function formatBadgeCount(count: number): string {
  return count > 99 ? '99+' : String(count);
}
