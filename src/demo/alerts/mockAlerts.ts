export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertModule = 'SAP' | 'Cloud';

export interface AlertRow {
  id: string;
  timestamp: string;
  module: AlertModule;
  source: string;
  summary: string;
  severity: AlertSeverity;
  status: 'Open' | 'Acknowledged' | 'Resolved';
}

/**
 * MAVERA_DESIGN_SYSTEM.md §11.2 global alerts triage all active modules'
 * alerts into one worklist. The real backend only exposes Cloud Cost's
 * smart-alerts today (see useDashboardData); SAP has no alerting
 * contract yet, so this illustrative set stands in until one exists.
 */
export const MOCK_ALERTS: AlertRow[] = [
  { id: 'al1', timestamp: '10:32', module: 'SAP', source: 'HANA-PRD', summary: 'High CPU usage (92%)', severity: 'critical', status: 'Open' },
  { id: 'al2', timestamp: '09:45', module: 'Cloud', source: 'Azure Subscription', summary: 'Cost threshold exceeded', severity: 'warning', status: 'Open' },
  { id: 'al4', timestamp: '06:22', module: 'SAP', source: 'ECC-PROD', summary: 'Database memory high (88%)', severity: 'warning', status: 'Acknowledged' },
];

export const SEVERITY_LABEL: Record<AlertSeverity, string> = { critical: 'Critical', warning: 'Warning', info: 'Info' };
export const SEVERITY_TONE: Record<AlertSeverity, 'danger' | 'warning' | 'info'> = { critical: 'danger', warning: 'warning', info: 'info' };
