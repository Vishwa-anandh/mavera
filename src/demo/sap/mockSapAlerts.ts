import type { AlertSettings, AlertThresholdConfig, AlertThresholds, SapSmartAlert } from '../../data-access';

/** PROTOTYPE MOCK DATA — SAP/HANA-specific anomaly alerts, distinct from the org-wide /smart-alerts
 * feature (which covers cloud cost). System names, values and timestamps are sample data. */
export const DETECTION_SCHEDULE = "runs nightly at each destination's local EOD";

/** What "Reset to defaults" restores: a 3-sigma band, a 20% minimum move, two weeks of history, a day of quiet. */
export const DEFAULT_ALERT_SETTINGS: AlertSettings = { sensitivity: 3, minDeltaPercent: 20, minHistoryDays: 14, cooldownHours: 24 };

const alert = (a: Omit<SapSmartAlert, 'state' | 'stateChangedAt'> & Partial<Pick<SapSmartAlert, 'state' | 'stateChangedAt'>>): SapSmartAlert => ({ state: 'active', stateChangedAt: null, ...a });

export const SEED_SAP_ALERTS: SapSmartAlert[] = [
  alert({ id: 'alert-1', source: 'SAP', type: 'Dumps', severity: 'High', system: 'MSQ', detectedAt: '2026-09-06T09:27:00', read: false, message: 'ABAP Dumps anomaly detected on MSQ. Today’s value is 130.0 dumps, which is 77.3 dumps (+146.4%) above the statistical baseline. Root cause: program /SSA/EKP contributed +78.4 dumps above its baseline.' }),
  alert({ id: 'alert-2', source: 'HANA', type: 'CPU', severity: 'Critical', system: 'c15ac0e5-bc54-41ab-83d8-e2c1bd4a24bb', detectedAt: '2026-07-28T05:25:00', read: false, message: 'CPU Utilization anomaly detected on c15ac0e5-bc54-41ab-83d8-e2c1bd4a24bb. Today’s value is 8.3%, which is 7.8% (+1742.0%) above the forecast of 0.4%.' }),
  alert({ id: 'alert-3', source: 'HANA', type: 'CPU', severity: 'Critical', system: 'c15ac0e5-bc54-41ab-83d8-e2c1bd4a24bb', detectedAt: '2026-07-24T05:25:00', read: true, message: 'CPU Utilization anomaly detected on c15ac0e5-bc54-41ab-83d8-e2c1bd4a24bb. Today’s value is 6.8%, which is 4.3% (+175.3%) above the statistical baseline.' }),
  alert({ id: 'alert-4', source: 'HANA', type: 'Memory', severity: 'High', system: 'GRH', detectedAt: '2026-09-03T05:24:00', read: false, message: 'Memory Usage anomaly detected on GRH. Today’s value is 71.2%, which is 14.6% (+25.8%) above the statistical baseline.' }),
  alert({ id: 'alert-5', source: 'HANA', type: 'Disk', severity: 'Medium', system: 'GRH', detectedAt: '2026-08-30T05:26:00', read: true, message: 'Disk Usage anomaly detected on GRH. Today’s value is 63.0%, which is 9.4% (+17.5%) above the forecast of 53.6%.' }),
  alert({ id: 'alert-6', source: 'HANA', type: 'Sessions', severity: 'Low', system: 'GRH', detectedAt: '2026-08-21T05:25:00', read: true, message: 'Active Sessions anomaly detected on GRH. Today’s value is 58 sessions, which is 21 sessions (+56.8%) above the statistical baseline.' }),
  alert({ id: 'alert-7', source: 'SAP', type: 'Jobs', severity: 'High', system: 'GRC', detectedAt: '2026-09-04T05:27:00', read: false, message: 'Aborted Jobs anomaly detected on GRC. Today’s value is 9 jobs, which is 7 jobs (+350.0%) above the statistical baseline. Root cause: job Z_FI_POSTING_RUN aborted 6 times.' }),
  alert({ id: 'alert-8', source: 'SAP', type: 'Locks', severity: 'Medium', system: 'GRQ', detectedAt: '2026-08-27T05:26:00', read: true, message: 'System Locks anomaly detected on GRQ. Today’s value is 46 locks, which is 18 locks (+64.3%) above the forecast of 28 locks.' }),
  alert({ id: 'alert-9', source: 'SAP', type: 'Work Processes', severity: 'High', system: 'MSQ', detectedAt: '2026-08-19T05:25:00', read: false, message: 'Work Processes anomaly detected on MSQ. Today’s value is 19 busy work processes of 24, which is 8 (+72.7%) above the statistical baseline.' }),
  alert({ id: 'alert-10', source: 'SAP', type: 'Dumps', severity: 'Medium', system: 'GRC', detectedAt: '2026-08-11T05:25:00', read: true, state: 'resolved', stateChangedAt: '2026-08-12T10:05:00', message: 'ABAP Dumps anomaly detected on GRC. Today’s value is 41.0 dumps, which is 16.0 dumps (+64.0%) above the statistical baseline.' }),
];

export const SEED_ALERT_RECIPIENTS = ['demo@mavera.local'];

export function seedThresholds(): AlertThresholds {
  const config = (key: string, label: string, description: string, unit: string, max: number): AlertThresholdConfig => ({ key, label, description, unit, max, enabled: false, threshold: 1 });
  return {
    hana: [
      config('cpu', 'CPU Usage', 'Alert when CPU utilization exceeds threshold', '%', 100),
      config('memory', 'Memory Usage', 'Alert when host memory usage exceeds threshold', '%', 100),
      config('disk', 'Disk Usage', 'Alert when storage usage across volumes exceeds threshold', '%', 100),
      config('sessions', 'Active Sessions', 'Alert when concurrent SAP HANA sessions exceed threshold', 'sessions', 500),
      config('sap-alerts', 'SAP Alerts', 'Alert when native SAP HANA alert count exceeds threshold', 'alerts', 50),
    ],
    sap: [
      config('response-time', 'Response Time', 'Alert when average dialog response time exceeds threshold', 'ms', 5000),
      config('work-processes', 'Work Processes', 'Alert when work process utilization exceeds threshold', '%', 100),
      config('abap-dumps', 'ABAP Dumps', 'Alert when short dump count exceeds threshold', 'dumps', 100),
      config('aborted-jobs', 'Aborted Jobs', 'Alert when background job failures exceed threshold', 'jobs', 200),
      config('system-locks', 'System Locks', 'Alert when enqueue lock count exceeds threshold', 'locks', 200),
    ],
  };
}
