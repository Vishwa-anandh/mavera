import type { RecipientConfig, SmartAlert, SmartAlertsSettings } from '../../data-access';

/** Sample cost alerts. A month of monitoring spans several pages, with a mix of active, resolved and ignored. */
export const SEED_SMART_ALERTS: SmartAlert[] = [
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
  { id: 'alert-9', alert_type: 'resource_creation', severity: 'medium', status: 'unread', ignored: false, provider: 'aws', account_id: 'aws-acc-1', message: '3 new resource(s) detected on AWS account "Maitsys-AWS": ec2/i-01d4e533c2e4748d6, ebs/vol-018eb938e33938f48, eip/eipalloc-0e064a2d5249b176c.', detected_at: '2026-09-26T09:30:00Z', detection_method: 'Resource inventory diff' },
  { id: 'alert-10', alert_type: 'resource_creation', severity: 'medium', status: 'unread', ignored: false, provider: 'aws', account_id: 'aws-acc-1', message: '2 new resource(s) detected on AWS account "Maitsys-AWS": ec2/i-013ba52c7bab243b8, ebs/vol-0b8eb11f9491614ff.', detected_at: '2026-09-25T11:30:00Z', detection_method: 'Resource inventory diff' },
  { id: 'alert-11', alert_type: 'resource_deletion', severity: 'medium', status: 'unread', ignored: false, provider: 'aws', account_id: 'aws-acc-1', message: '37 resource(s) removed from AWS account "Maitsys-AWS": ebs/vol-01ae499cb72011975, ebs/vol-01b79a09d76432ad5 and 35 more.', detected_at: '2026-09-22T21:30:00Z', detection_method: 'Resource inventory diff' },
  { id: 'alert-12', alert_type: 'resource_creation', severity: 'medium', status: 'unread', ignored: false, provider: 'btp', account_id: 'btp-acc-1', message: '1 new service(s) detected on BTP account "Maitsys-Btp": Integration Suite.', detected_at: '2026-09-22T07:30:00Z', detection_method: 'Resource inventory diff' },
  { id: 'alert-13', alert_type: 'unusual_spend', severity: 'medium', status: 'unread', ignored: false, provider: 'aws', account_id: 'aws-acc-1', message: 'AWS Support (Business) is tracking $135.77 above its 6-month average ($237.89/month) based on month-to-date spend. Also elevated: Amazon Simple Storage Service (+$23).', detected_at: '2026-09-21T08:00:00Z', detection_method: 'Holt-Winters anomaly detection', root_cause: { service: 'AWS Support (Business)', delta: 135.77, zScore: 2.7 } },
  { id: 'alert-14', alert_type: 'unusual_spend', severity: 'critical', status: 'unread', ignored: false, provider: 'aws', account_id: 'aws-acc-1', message: 'Amazon Elastic Compute Cloud - Compute is tracking $1304.99 above its 6-month average ($1691.46/month) based on month-to-date spend. Also elevated: AWS Support (Business) (+$140).', detected_at: '2026-09-20T08:00:00Z', detection_method: 'Holt-Winters anomaly detection', expected_cost: 1691.46, actual_cost: 2996.45, delta: 1304.99, delta_percent: 77.2, root_cause: { service: 'Amazon Elastic Compute Cloud - Compute', delta: 1304.99, zScore: 4.1 } },
  { id: 'alert-15', alert_type: 'spike', severity: 'high', status: 'unread', ignored: false, provider: 'azure', account_id: 'az-acc-1', message: 'Azure SQL Database spend jumped 58% above forecast yesterday after a scale-up of the production elastic pool.', detected_at: '2026-09-19T07:45:00Z', detection_method: 'Holt-Winters anomaly detection', expected_cost: 184.2, actual_cost: 291, delta: 106.8, delta_percent: 58, root_cause: { service: 'SQL Database', delta: 106.8, zScore: 3.2 } },
  { id: 'alert-16', alert_type: 'budget_breach', severity: 'critical', status: 'unread', ignored: false, provider: 'aws', account_id: 'aws-acc-1', message: 'Analytics Platform Budget exceeded 100% of its cap (current $4,312 of $4,000).', detected_at: '2026-09-18T20:00:00Z', detection_method: 'Budget threshold monitor', projected_eom: 4890 },
  { id: 'alert-17', alert_type: 'forecast', severity: 'high', status: 'read', ignored: false, provider: 'azure', account_id: 'az-acc-1', message: 'Projected month-end Azure spend exceeds the Production Monthly Budget by 14% at the current run rate.', detected_at: '2026-09-17T09:00:00Z', detection_method: 'Forecast overage check', expected_cost: 14200, projected_eom: 16200 },
  { id: 'alert-18', alert_type: 'resource_creation', severity: 'low', status: 'read', ignored: false, provider: 'azure', account_id: 'az-acc-2', message: 'New resource detected: Virtual machine vm-dev-build-04 (Standard_D4s_v5) in westeurope.', detected_at: '2026-09-16T13:10:00Z', detection_method: 'Resource inventory diff' },
  { id: 'alert-19', alert_type: 'unusual_spend', severity: 'medium', status: 'read', ignored: false, provider: 'gcp', account_id: 'gcp-acc-1', message: 'Cloud Storage egress is trending 2.6 standard deviations above the 30-day baseline on Production GCP.', detected_at: '2026-09-15T16:20:00Z', detection_method: 'Holt-Winters anomaly detection', root_cause: { service: 'Cloud Storage', delta: 88.4, zScore: 2.6 } },
  { id: 'alert-20', alert_type: 'resource_deletion', severity: 'low', status: 'read', ignored: false, provider: 'azure', account_id: 'az-acc-2', message: 'Resource group rg-dev-sandbox-02 and 12 resources inside it were removed from Development Environment.', detected_at: '2026-09-14T18:00:00Z', detection_method: 'Resource inventory diff' },
  { id: 'alert-21', alert_type: 'spike', severity: 'medium', status: 'read', ignored: false, provider: 'aws', account_id: 'aws-acc-1', message: 'Amazon CloudFront data transfer ran 36% above forecast for two consecutive days.', detected_at: '2026-09-13T06:30:00Z', detection_method: 'Holt-Winters anomaly detection', expected_cost: 96.5, actual_cost: 131.2, delta: 34.7, delta_percent: 36, root_cause: { service: 'Amazon CloudFront', delta: 34.7, zScore: 2.8 } },
  { id: 'alert-22', alert_type: 'abnormal_usage', severity: 'medium', status: 'unread', ignored: false, provider: 'btp', account_id: 'btp-acc-1', message: 'SAP HANA Cloud compute units in subaccount S4H-PRD ran at 140% of the contracted baseline this week.', detected_at: '2026-09-12T10:00:00Z', detection_method: 'Usage pattern monitor' },
  { id: 'alert-23', alert_type: 'budget_breach', severity: 'high', status: 'read', ignored: false, provider: 'azure', account_id: 'az-acc-2', message: 'Development Environment budget has reached 85% of its cap with 18 days remaining in the cycle.', detected_at: '2026-09-11T22:00:00Z', detection_method: 'Budget threshold monitor', projected_eom: 3120 },
  { id: 'alert-24', alert_type: 'resource_creation', severity: 'low', status: 'read', ignored: false, provider: 'gcp', account_id: 'gcp-acc-1', message: 'New resource detected: BigQuery dataset analytics_staging in project maitsys-analytics-prod.', detected_at: '2026-09-10T08:40:00Z', detection_method: 'Resource inventory diff' },
  { id: 'alert-25', alert_type: 'spike', severity: 'high', status: 'resolved', ignored: false, provider: 'gcp', account_id: 'gcp-acc-1', message: 'BigQuery on-demand analysis charges were 71% above forecast on Sep 8; a runaway scheduled query was stopped.', detected_at: '2026-09-09T07:15:00Z', detection_method: 'Holt-Winters anomaly detection', expected_cost: 62.4, actual_cost: 106.7, delta: 44.3, delta_percent: 71, root_cause: { service: 'BigQuery', delta: 44.3, zScore: 3.5 } },
  { id: 'alert-26', alert_type: 'forecast', severity: 'medium', status: 'resolved', ignored: false, provider: 'btp', account_id: 'btp-acc-1', message: 'Projected month-end SAP BTP consumption exceeds the committed CPEA balance by 11%.', detected_at: '2026-09-08T09:00:00Z', detection_method: 'Forecast overage check', projected_eom: 2210 },
  { id: 'alert-27', alert_type: 'unusual_spend', severity: 'low', status: 'read', ignored: true, ignored_at: '2026-09-08T12:00:00Z', provider: 'azure', account_id: 'az-acc-2', message: 'Azure Monitor log ingestion is 1.9 standard deviations above its baseline on Development Environment.', detected_at: '2026-09-07T11:05:00Z', detection_method: 'Holt-Winters anomaly detection', root_cause: { service: 'Azure Monitor', delta: 14.2, zScore: 1.9 } },
  { id: 'alert-28', alert_type: 'resource_deletion', severity: 'medium', status: 'read', ignored: false, provider: 'aws', account_id: 'aws-acc-2', message: '4 resource(s) removed from AWS account "Maitsys-Staging": rds/staging-orders-replica, ebs/vol-0aa1c4, ebs/vol-0aa1c5, eip/eipalloc-0b27.', detected_at: '2026-09-06T19:30:00Z', detection_method: 'Resource inventory diff' },
  { id: 'alert-29', alert_type: 'spike', severity: 'critical', status: 'read', ignored: false, provider: 'aws', account_id: 'aws-acc-1', message: 'Amazon EC2 data transfer out spiked to 3.4 times the daily forecast; a misconfigured backup job is the likely cause.', detected_at: '2026-09-05T05:50:00Z', detection_method: 'Holt-Winters anomaly detection', expected_cost: 128, actual_cost: 435.2, delta: 307.2, delta_percent: 240, root_cause: { service: 'Amazon EC2', delta: 307.2, zScore: 5.2 } },
  { id: 'alert-30', alert_type: 'resource_creation', severity: 'medium', status: 'read', ignored: false, provider: 'btp', account_id: 'btp-acc-1', message: '2 new service(s) detected on BTP account "Maitsys-Btp": Application Autoscaler, Cloud Logging.', detected_at: '2026-09-04T07:30:00Z', detection_method: 'Resource inventory diff' },
  { id: 'alert-31', alert_type: 'budget_breach', severity: 'medium', status: 'resolved', ignored: false, provider: 'gcp', account_id: 'gcp-acc-1', message: 'Analytics GCP Budget reached 80% of its cap with 6 days remaining.', detected_at: '2026-09-03T22:00:00Z', detection_method: 'Budget threshold monitor', projected_eom: 790 },
  { id: 'alert-32', alert_type: 'abnormal_usage', severity: 'low', status: 'read', ignored: false, provider: 'azure', account_id: 'az-acc-1', message: 'Azure Cosmos DB request units are 45% higher than the trailing four-week average.', detected_at: '2026-09-02T14:25:00Z', detection_method: 'Usage pattern monitor' },
  { id: 'alert-33', alert_type: 'unusual_spend', severity: 'high', status: 'read', ignored: false, provider: 'aws', account_id: 'aws-acc-1', message: 'Amazon RDS storage is tracking $212.40 above its 6-month average ($880.10/month) based on month-to-date spend.', detected_at: '2026-09-01T08:00:00Z', detection_method: 'Holt-Winters anomaly detection', root_cause: { service: 'Amazon RDS', delta: 212.4, zScore: 3.0 } },
  { id: 'alert-34', alert_type: 'forecast', severity: 'low', status: 'read', ignored: false, provider: 'gcp', account_id: 'gcp-acc-1', message: 'Projected month-end Google Cloud spend is 6% above last month, within the forecast tolerance.', detected_at: '2026-08-31T09:00:00Z', detection_method: 'Forecast overage check', projected_eom: 702 },
];

export const DEFAULT_SMART_ALERTS_SETTINGS: SmartAlertsSettings = {
  spikeThresholdPct: 30,
  minDailySpend: 20,
  forecastOveragePct: 10,
  minHistoryDays: 14,
  cooldownHours: 24,
};

/** Ignores recorded before this session, per account; each widens that account's spike threshold. */
export const SEED_ACCOUNT_FEEDBACK: Record<string, number> = { 'aws-acc-2': 1 };

export const SEED_RECIPIENT_CONFIGS: RecipientConfig[] = [
  { alert_type: 'cost_threshold', recipients: ['finance@maitsys.com', 'ops@maitsys.com'] },
];

export const DETECTION_SCHEDULE = 'daily at 02:30 AM';

/** Threshold adjustments recorded before this session (the Smart Alerts summary counts this month's). */
export const SEED_ADJUSTMENTS: string[] = ['2026-09-19T10:00:00'];
