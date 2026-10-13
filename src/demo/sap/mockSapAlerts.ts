/** PROTOTYPE MOCK DATA — SAP/HANA-specific anomaly alerts, distinct from
 * the org-wide /smart-alerts feature (which covers cloud cost). */
export type SapAlertType = 'CPU' | 'Memory' | 'Disk' | 'Sessions' | 'Dumps' | 'Jobs' | 'Locks' | 'Work Processes';
export type SapAlertSeverity = 'Critical' | 'High' | 'Medium' | 'Low';

export interface SapAlert {
  id: string;
  type: SapAlertType;
  severity: SapAlertSeverity;
  system: string;
  message: string;
  detectedAt: string;
  read: boolean;
}

export const SAP_ALERTS_META = {
  lastAlert: 'Sep 6, 9:27 AM',
  ignoredThisMonth: 0,
  thresholdAdjustments: 0,
  detectionSchedule: "Runs nightly at each destination's local EOD",
};

export interface AlertThresholdConfig {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  thresholdPercent: number;
  unit: string;
}

export const HANA_ALERT_THRESHOLDS: AlertThresholdConfig[] = [
  { key: 'cpu', label: 'CPU Usage', description: 'Alert when CPU utilization exceeds threshold', enabled: false, thresholdPercent: 1, unit: '%' },
  { key: 'memory', label: 'Memory Usage', description: 'Alert when host memory usage exceeds threshold', enabled: false, thresholdPercent: 1, unit: '%' },
  { key: 'disk', label: 'Disk Usage', description: 'Alert when storage usage across volumes exceeds threshold', enabled: false, thresholdPercent: 1, unit: '%' },
  { key: 'sessions', label: 'Active Sessions', description: 'Alert when concurrent SAP HANA sessions exceed threshold', enabled: false, thresholdPercent: 1, unit: 'sessions' },
  { key: 'sap-alerts', label: 'SAP Alerts', description: 'Alert when native SAP HANA alert count exceeds threshold', enabled: false, thresholdPercent: 1, unit: 'alerts' },
];

export const SAP_ALERT_THRESHOLDS: AlertThresholdConfig[] = [
  { key: 'response-time', label: 'Response Time', description: 'Alert when average dialog response time exceeds threshold', enabled: false, thresholdPercent: 1, unit: 'ms' },
  { key: 'work-processes', label: 'Work Processes', description: 'Alert when work process utilization exceeds threshold', enabled: false, thresholdPercent: 1, unit: '%' },
  { key: 'abap-dumps', label: 'ABAP Dumps', description: 'Alert when short dump count exceeds threshold', enabled: false, thresholdPercent: 1, unit: 'dumps' },
  { key: 'aborted-jobs', label: 'Aborted Jobs', description: 'Alert when background job failures exceed threshold', enabled: false, thresholdPercent: 1, unit: 'jobs' },
  { key: 'system-locks', label: 'System Locks', description: 'Alert when enqueue lock count exceeds threshold', enabled: false, thresholdPercent: 1, unit: 'locks' },
];

export const MOCK_SAP_ALERTS: SapAlert[] = [
  { id: 'alert-1', type: 'Dumps', severity: 'High', system: 'MSQ', message: 'ABAP Dumps anomaly detected on MSQ. Today’s value is 130.0 dumps, which is 77.3 dumps (+146.4%) above the 30-day average.', detectedAt: 'Sep 6, 9:27 AM', read: false },
  { id: 'alert-2', type: 'CPU', severity: 'Critical', system: 'c15ac0e5-bc54-41ab-83d8-e2c1bd4a24bb', message: 'CPU Utilization anomaly detected on c15ac0e5-bc54-41ab-83d8-e2c1bd4a24bb. Today’s value is elevated versus baseline.', detectedAt: 'Jul 28, 5:25 AM', read: false },
  { id: 'alert-3', type: 'CPU', severity: 'Critical', system: 'c15ac0e5-bc54-41ab-83d8-e2c1bd4a24bb', message: 'CPU Utilization anomaly detected on c15ac0e5-bc54-41ab-83d8-e2c1bd4a24bb. Today’s value is elevated versus baseline.', detectedAt: 'Jul 24, 5:25 AM', read: true },
];
