import type { AlertProvider, AlertSeverity, AlertType, SmartAlert, SmartAlertsSettings } from './smartAlertsTypes';

export const SEVERITY_LABELS: Record<AlertSeverity, string> = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
export const SEVERITY_TONE: Record<AlertSeverity, 'danger' | 'warning' | 'info'> = { critical: 'danger', high: 'danger', medium: 'warning', low: 'info' };

export const TYPE_LABELS: Record<AlertType, string> = {
  spike: 'Cost Spike',
  unusual_spend: 'Unusual Spend',
  abnormal_usage: 'Abnormal Usage',
  budget_breach: 'Budget Breach',
  forecast: 'Forecast Alert',
  resource_creation: 'New Resource',
  resource_deletion: 'Resource Removed',
};

export const PROVIDER_LABELS: Record<Exclude<AlertProvider, 'all'>, string> = { azure: 'Azure', aws: 'AWS', btp: 'SAP BTP', gcp: 'Google Cloud' };
export const providerLabel = (provider: AlertProvider): string | null => (provider === 'all' ? null : PROVIDER_LABELS[provider]);

export type AlertView = 'active' | 'unread' | 'critical' | 'high' | 'resolved' | 'ignored';
export type TypeFilter = 'all' | AlertType;
export type ProviderFilter = 'all' | Exclude<AlertProvider, 'all'>;

export const ALERT_VIEWS: Array<{ value: AlertView; label: string; ariaLabel: string }> = [
  { value: 'active', label: 'All', ariaLabel: 'All active alerts' },
  { value: 'unread', label: 'Unread', ariaLabel: 'Unread alerts' },
  { value: 'critical', label: 'Critical', ariaLabel: 'Critical alerts' },
  { value: 'high', label: 'High+', ariaLabel: 'High and critical alerts' },
  { value: 'resolved', label: 'Resolved', ariaLabel: 'Resolved alerts' },
  { value: 'ignored', label: 'Ignored', ariaLabel: 'Ignored alerts' },
];

export const TYPE_FILTERS: Array<{ value: TypeFilter; label: string; ariaLabel: string }> = [
  { value: 'all', label: 'All', ariaLabel: 'All alert types' },
  { value: 'spike', label: 'Spike', ariaLabel: 'Cost spikes' },
  { value: 'unusual_spend', label: 'Unusual', ariaLabel: 'Unusual spend' },
  { value: 'forecast', label: 'Forecast', ariaLabel: 'Forecast alerts' },
  { value: 'budget_breach', label: 'Budget', ariaLabel: 'Budget breaches' },
  { value: 'resource_creation', label: 'New Resource', ariaLabel: 'New resources' },
  { value: 'resource_deletion', label: 'Removed', ariaLabel: 'Removed resources' },
  { value: 'abnormal_usage', label: 'Usage', ariaLabel: 'Abnormal usage' },
];

export function formatMoney(value: number | undefined): string | null {
  if (value === undefined || value === null) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

/** "Sep 27, 08:12 AM", in the viewer's time zone. */
export const formatDetected = (iso: string): string => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

/** An alert is active until it is resolved or ignored; only active alerts count toward the totals. */
export const isActive = (alert: SmartAlert): boolean => !alert.ignored && alert.status !== 'resolved';

export interface AlertCounts {
  totalActive: number;
  unread: number;
  critical: number;
  newResources: number;
}

/** Counters over active alerts: resolved and ignored alerts leave every one of them. */
export function alertCounts(alerts: SmartAlert[]): AlertCounts {
  const active = alerts.filter(isActive);
  return {
    totalActive: active.length,
    unread: active.filter((a) => a.status === 'unread').length,
    critical: active.filter((a) => a.severity === 'critical').length,
    newResources: active.filter((a) => a.alert_type === 'resource_creation').length,
  };
}

export interface AlertFilters {
  view: AlertView;
  type: TypeFilter;
  provider: ProviderFilter;
}

/** Newest first. Resolved and Ignored list those alerts; every other view lists active ones. */
export function filterAlerts(alerts: SmartAlert[], { view, type, provider }: AlertFilters): SmartAlert[] {
  return alerts
    .filter((a) => {
      if (type !== 'all' && a.alert_type !== type) return false;
      if (provider !== 'all' && a.provider !== provider) return false;
      if (view === 'ignored') return a.ignored;
      if (view === 'resolved') return !a.ignored && a.status === 'resolved';
      if (!isActive(a)) return false;
      if (view === 'unread') return a.status === 'unread';
      if (view === 'critical') return a.severity === 'critical';
      if (view === 'high') return a.severity === 'critical' || a.severity === 'high';
      return true;
    })
    .sort((a, b) => (a.detected_at < b.detected_at ? 1 : a.detected_at > b.detected_at ? -1 : 0));
}

const sameMonth = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

export interface AlertSummary {
  /** ISO time of the newest alert of any state, or null when there are none. */
  lastAlertAt: string | null;
  ignoredThisMonth: number;
  adjustmentsThisMonth: number;
}

export function alertSummary(alerts: SmartAlert[], adjustments: string[], now: Date = new Date()): AlertSummary {
  const lastAlertAt = alerts.reduce<string | null>((best, a) => (best === null || a.detected_at > best ? a.detected_at : best), null);
  return {
    lastAlertAt,
    ignoredThisMonth: alerts.filter((a) => a.ignored && a.ignored_at !== undefined && sameMonth(new Date(a.ignored_at), now)).length,
    adjustmentsThisMonth: adjustments.filter((at) => sameMonth(new Date(at), now)).length,
  };
}

/** Each ignore widens an account's spike threshold by this many points, up to the cap. */
export const WIDENING_STEP_PTS = 5;
export const WIDENING_CAP_PTS = 20;
export const wideningPoints = (ignores: number): number => Math.min(ignores * WIDENING_STEP_PTS, WIDENING_CAP_PTS);

// ---- Detection settings ----------------------------------------------------------------------

export interface SettingLimit {
  key: keyof SmartAlertsSettings;
  label: string;
  help: string;
  min: number;
  max: number;
  step: number;
  integer: boolean;
}

export const SETTING_LIMITS: SettingLimit[] = [
  { key: 'spikeThresholdPct', label: 'Spike threshold (%)', help: 'A day whose spend is this far above its forecast counts as a spike. Lower is more sensitive.', min: 5, max: 500, step: 1, integer: false },
  { key: 'minDailySpend', label: 'Minimum daily spend ($)', help: 'Days that cost less than this are never flagged, however large the relative jump.', min: 0, max: 10000, step: 1, integer: false },
  { key: 'forecastOveragePct', label: 'Forecast overage (%)', help: 'Raise a forecast alert when projected month-end spend is this far over budget.', min: 1, max: 100, step: 1, integer: false },
  { key: 'minHistoryDays', label: 'Minimum history (days)', help: 'An account needs this many days of cost data before detection switches on.', min: 7, max: 60, step: 1, integer: true },
  { key: 'cooldownHours', label: 'Cooldown (hours)', help: 'Hours before the same anomaly on the same account can raise another alert.', min: 1, max: 168, step: 1, integer: true },
];

export type SettingsDraft = Record<keyof SmartAlertsSettings, string>;
export type SettingsErrors = Partial<Record<keyof SmartAlertsSettings, string>>;

export const draftFromSettings = (settings: SmartAlertsSettings): SettingsDraft => ({
  spikeThresholdPct: String(settings.spikeThresholdPct),
  minDailySpend: String(settings.minDailySpend),
  forecastOveragePct: String(settings.forecastOveragePct),
  minHistoryDays: String(settings.minHistoryDays),
  cooldownHours: String(settings.cooldownHours),
});

/** Checks every field against its range; `settings` is set only when all of them are valid. */
export function parseSettings(draft: SettingsDraft): { settings?: SmartAlertsSettings; errors: SettingsErrors } {
  const errors: SettingsErrors = {};
  const values: Partial<SmartAlertsSettings> = {};
  for (const limit of SETTING_LIMITS) {
    const raw = draft[limit.key].trim();
    const value = Number(raw);
    if (raw === '' || !Number.isFinite(value)) errors[limit.key] = 'Enter a number.';
    else if (limit.integer && !Number.isInteger(value)) errors[limit.key] = 'Use a whole number.';
    else if (value < limit.min || value > limit.max) errors[limit.key] = `Enter a value from ${limit.min} to ${limit.max}.`;
    else values[limit.key] = value;
  }
  return Object.keys(errors).length > 0 ? { errors } : { settings: values as SmartAlertsSettings, errors };
}

export const settingsEqual = (a: SmartAlertsSettings, b: SmartAlertsSettings): boolean => SETTING_LIMITS.every(({ key }) => a[key] === b[key]);
