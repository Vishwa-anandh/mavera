export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';
export type AlertType = 'spike' | 'unusual_spend' | 'abnormal_usage' | 'budget_breach' | 'forecast' | 'resource_creation' | 'resource_deletion';
export type AlertStatus = 'unread' | 'read' | 'resolved';

/** Field names mirror the reference CCM app's real `/smart-alerts`
 * endpoint. */
export interface SmartAlert {
  id: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  ignored: boolean;
  ignored_at?: string;
  provider: 'azure' | 'aws' | 'btp' | 'gcp' | 'all';
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

/** `GET /smart-alerts/config` — anomaly-detection sensitivity settings. */
export interface SmartAlertsConfig {
  hw_threshold_k: number;
  min_dollar_delta: number;
  cooldown_hours: number;
  forecast_overage_pct: number;
  min_history_days: number;
  account_feedback: Record<string, number>;
}

/** `GET /smart-alerts/recipients` — custom recipient list per alert type,
 * falling back to "all org members" when absent. */
export interface RecipientConfig {
  alert_type: 'cost_threshold' | 'resource_creation';
  recipients: string[];
}
