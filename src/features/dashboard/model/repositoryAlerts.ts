import { smartAlertsRepository } from '../../../data-access';
import type { SmartAlertItem } from './useDashboardData';

/**
 * The cloud cost alerts the dashboard shows in a demo session, read from the same store the Smart Alerts and Alerts
 * pages use (newest first), so a count or a row on the dashboard is the very alert those pages list. An ignored or
 * resolved alert is "resolved" here: it leaves every count.
 */
export function repositoryAlertItems(): SmartAlertItem[] {
  return smartAlertsRepository.list()
    .sort((a, b) => b.detected_at.localeCompare(a.detected_at))
    .map((a) => ({
      id: a.id,
      severity: a.severity,
      status: a.ignored || a.status === 'resolved' ? 'resolved' : 'open',
      title: a.message,
      alert_type: a.alert_type,
      detected_at: a.detected_at,
    }));
}
