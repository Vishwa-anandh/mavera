import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { relativeTime } from '../lib/relativeTime';
import { usePageHasTour } from '../lib/pageTourContext';
import { PageTourButton } from './PageTourButton';
import {
  BellIcon, BuildingIcon, CloudIcon, ClockIcon, ServerIcon, SettingsIcon, ShieldIcon, SparkleIcon,
} from './icons';

const MODULE_ICONS: Array<[prefix: string, icon: typeof CloudIcon]> = [
  ['/sap', ServerIcon],
  ['/admin', BuildingIcon],
  ['/alerts', BellIcon],
  ['/ai-assistant', SparkleIcon],
  ['/users', SettingsIcon],
  ['/audit-trail', ShieldIcon],
  ['/sync-logs', SettingsIcon],
  ['/account', SettingsIcon],
  ['/subscription', SettingsIcon],
];

/** The icon for the module the current route belongs to; cloud cost is the default. */
function moduleIcon(pathname: string): typeof CloudIcon {
  return MODULE_ICONS.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1] ?? CloudIcon;
}

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** When the data on this page was last refreshed; shown as an "Updated 2 minutes ago" chip. Omit if unknown. */
  updatedAt?: Date | null;
  /** Page-level actions, right-aligned; the primary action goes last. */
  children?: ReactNode;
}

/**
 * Standard page heading: module icon, title, one-line description, an optional freshness chip,
 * and the page's actions on the right.
 */
export function PageHeader({ title, subtitle, updatedAt, children }: PageHeaderProps) {
  const { pathname } = useLocation();
  const Icon = moduleIcon(pathname);
  const hasTour = usePageHasTour();
  return (
    <div className="mv-page-heading mv-page-header">
      <div className="mv-page-header-main">
        <span className="mv-page-header-icon" aria-hidden><Icon size={20} /></span>
        <div className="mv-page-header-text">
          <h1 className="mv-title">{title}</h1>
          {subtitle && <p className="mv-subtitle">{subtitle}</p>}
          {updatedAt && (
            <span className="mv-sync-chip" title={updatedAt.toLocaleString()}>
              <ClockIcon size={12} /> Updated {relativeTime(updatedAt)}
            </span>
          )}
        </div>
      </div>
      {(children || hasTour) && <div className="mv-heading-actions">{children}<PageTourButton /></div>}
    </div>
  );
}
