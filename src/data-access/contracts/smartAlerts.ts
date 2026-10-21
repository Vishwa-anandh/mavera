/** Cloud cost alerts (Smart Alerts & Anomalies). Field names mirror the CCM `/smart-alerts` endpoint. */
export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';
export type AlertType = 'spike' | 'unusual_spend' | 'abnormal_usage' | 'budget_breach' | 'forecast' | 'resource_creation' | 'resource_deletion';
export type AlertStatus = 'unread' | 'read' | 'resolved';
export type AlertProvider = 'azure' | 'aws' | 'btp' | 'gcp' | 'all';

export interface SmartAlert {
  id: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  /** An ignored alert leaves every counter and is listed under the Ignored status filter. */
  ignored: boolean;
  ignored_at?: string;
  provider: AlertProvider;
  account_id: string;
  message: string;
  detected_at: string;
  detection_method?: string;
  expected_cost?: number;
  actual_cost?: number;
  delta?: number;
  delta_percent?: number;
  projected_eom?: number;
  root_cause?: { service?: string; delta?: number; zScore?: number };
}

/** Cost-anomaly detection parameters (`/smart-alerts/config`). */
export interface SmartAlertsSettings {
  /** A day's spend this many percent above its forecast counts as a spike. */
  spikeThresholdPct: number;
  /** Days that spend less than this amount (USD) are never flagged. */
  minDailySpend: number;
  /** Projected month-end spend this many percent over budget raises a forecast alert. */
  forecastOveragePct: number;
  /** Days of cost history an account needs before detection switches on. */
  minHistoryDays: number;
  /** Hours before the same anomaly on the same account can fire again. */
  cooldownHours: number;
}

export type RecipientAlertType = 'cost_threshold' | 'resource_creation';

/** Custom recipient list per alert type; absent means every organisation member is emailed. */
export interface RecipientConfig {
  alert_type: RecipientAlertType;
  recipients: string[];
}
