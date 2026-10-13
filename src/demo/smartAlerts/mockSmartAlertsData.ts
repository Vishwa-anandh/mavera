import type { RecipientConfig, SmartAlert, SmartAlertsConfig } from '../../features/smartAlerts';

export const MOCK_SMART_ALERTS: SmartAlert[] = [
  {
    id: 'alert-1', alert_type: 'spike', severity: 'critical', status: 'unread', ignored: false,
    provider: 'azure', account_id: 'az-acc-1', message: 'Azure spend is 42% above the forecasted band for the last 3 days — driven primarily by Azure Kubernetes Service.',
    detected_at: '2026-09-27T08:12:00Z', detection_method: 'Holt-Winters anomaly detection',
    expected_cost: 620.4, actual_cost: 881.9, delta: 261.5, delta_percent: 42.1, projected_eom: 16200,
    root_cause: { service: 'Azure Kubernetes Service', delta: 210.3, zScore: 3.4 },
  },
  {
    id: 'alert-2', alert_type: 'budget_breach', severity: 'high', status: 'unread', ignored: false,
    provider: 'azure', account_id: 'az-acc-1', message: 'Production Monthly Budget has reached 79% of its cap with 3 days remaining in the cycle.',
    detected_at: '2026-09-26T22:00:00Z', detection_method: 'Budget threshold monitor', projected_eom: 16200,
  },
  {
    id: 'alert-3', alert_type: 'resource_creation', severity: 'low', status: 'unread', ignored: false,
    provider: 'aws', account_id: 'aws-acc-1', message: 'New resource detected: EC2 instance i-0c3d4e5f678901234 (m5.xlarge) in us-west-2.',
    detected_at: '2026-09-26T14:30:00Z', detection_method: 'Resource inventory diff',
  },
  {
    id: 'alert-4', alert_type: 'forecast', severity: 'medium', status: 'read', ignored: false,
    provider: 'aws', account_id: 'aws-acc-1', message: 'Projected month-end AWS spend exceeds last month by 18% based on current trajectory.',
    detected_at: '2026-09-25T09:00:00Z', detection_method: 'Forecast overage check', expected_cost: 9840.6, projected_eom: 10934,
  },
  {
    id: 'alert-5', alert_type: 'unusual_spend', severity: 'high', status: 'read', ignored: false,
    provider: 'gcp', account_id: 'gcp-acc-1', message: 'BigQuery costs on Production GCP are trending 3.1 standard deviations above the 30-day baseline.',
    detected_at: '2026-09-24T16:45:00Z', detection_method: 'Holt-Winters anomaly detection',
    root_cause: { service: 'BigQuery', delta: 340.2, zScore: 3.1 },
  },
  {
    id: 'alert-6', alert_type: 'resource_deletion', severity: 'low', status: 'read', ignored: false,
    provider: 'btp', account_id: 'btp-acc-1', message: 'Service instance "hana-qa-db" was removed from subaccount S4H-QA.',
    detected_at: '2026-09-23T11:15:00Z', detection_method: 'Resource inventory diff',
  },
  {
    id: 'alert-7', alert_type: 'abnormal_usage', severity: 'medium', status: 'resolved', ignored: false,
    provider: 'azure', account_id: 'az-acc-2', message: 'Development Environment showed a sustained 60% increase in Storage Accounts usage over the weekend.',
    detected_at: '2026-09-20T07:30:00Z', detection_method: 'Usage pattern monitor',
  },
  {
    id: 'alert-8', alert_type: 'spike', severity: 'low', status: 'read', ignored: true, ignored_at: '2026-09-19T10:00:00Z',
    provider: 'aws', account_id: 'aws-acc-2', message: 'Staging AWS spend briefly exceeded its forecast band for one day (below the minimum-dollar threshold since).',
    detected_at: '2026-09-18T06:00:00Z', detection_method: 'Holt-Winters anomaly detection',
    expected_cost: 40.1, actual_cost: 58.6, delta: 18.5, delta_percent: 46.1,
  },
];

export const MOCK_SMART_ALERTS_CONFIG: SmartAlertsConfig = {
  hw_threshold_k: 2.5,
  min_dollar_delta: 20,
  cooldown_hours: 24,
  forecast_overage_pct: 10,
  min_history_days: 14,
  account_feedback: { 'aws-acc-2': 1 },
};

export const MOCK_RECIPIENT_CONFIGS: RecipientConfig[] = [
  { alert_type: 'cost_threshold', recipients: ['finance@maitsys.com', 'ops@maitsys.com'] },
];

export const MOCK_ALERT_STATS = {
  lastDetectedAt: '2026-09-27T08:12:00Z',
  ignoredThisMonth: 1,
  feedbackAdjustments: 1,
};
