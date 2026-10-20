import type { AlertSettings, SapAlertSeverity, SapAlertSource, SapAlertType, SapSmartAlert } from '../../../data-access';
import { formatStamp, parseStamp } from './sapFormat';

export const ALERT_TYPES: SapAlertType[] = ['CPU', 'Memory', 'Disk', 'Sessions', 'Dumps', 'Jobs', 'Locks', 'Work Processes'];

export type SourceFilter = 'All' | SapAlertSource;
export type AlertView = 'active' | 'unread' | 'critical' | 'high' | 'resolved' | 'ignored';

export const ALERT_VIEWS: Array<{ value: AlertView; label: string }> = [
  { value: 'active', label: 'Active alerts' },
  { value: 'unread', label: 'Unread' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High and above' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'ignored', label: 'Ignored' },
];

export const SEVERITY_TONE: Record<SapAlertSeverity, 'danger' | 'warning' | 'info' | 'neutral'> = { Critical: 'danger', High: 'warning', Medium: 'info', Low: 'neutral' };

const DAY_MS = 24 * 60 * 60 * 1000;

const inScope = (alerts: SapSmartAlert[], source: SourceFilter) => (source === 'All' ? alerts : alerts.filter((a) => a.source === source));
const sameMonth = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

export interface AlertCounts {
  totalActive: number;
  unread: number;
  critical: number;
  newBreaches: number;
}

/** Counts over alerts still active: resolved and ignored alerts leave every counter. New breaches are unread alerts from the last 24 hours. */
export function alertCounts(alerts: SapSmartAlert[], source: SourceFilter, now: Date = new Date()): AlertCounts {
  const active = inScope(alerts, source).filter((a) => a.state === 'active');
  return {
    totalActive: active.length,
    unread: active.filter((a) => !a.read).length,
    critical: active.filter((a) => a.severity === 'Critical').length,
    newBreaches: active.filter((a) => !a.read && now.getTime() - parseStamp(a.detectedAt).getTime() <= DAY_MS).length,
  };
}

export interface AlertFilters {
  source: SourceFilter;
  view: AlertView;
  type: 'All' | SapAlertType;
}

/** Newest first. The view picks which states are listed: Resolved and Ignored show those, every other view lists active alerts. */
export function filterAlerts(alerts: SapSmartAlert[], { source, view, type }: AlertFilters): SapSmartAlert[] {
  return inScope(alerts, source)
    .filter((a) => {
      if (type !== 'All' && a.type !== type) return false;
      if (view === 'resolved') return a.state === 'resolved';
      if (view === 'ignored') return a.state === 'ignored';
      if (a.state !== 'active') return false;
      if (view === 'unread') return !a.read;
      if (view === 'critical') return a.severity === 'Critical';
      if (view === 'high') return a.severity === 'Critical' || a.severity === 'High';
      return true;
    })
    .sort((a, b) => (a.detectedAt < b.detectedAt ? 1 : a.detectedAt > b.detectedAt ? -1 : 0));
}

export interface AlertSummary {
  /** "Sep 6, 9:27 AM" for the most recent alert of any state, or null when there are none. */
  lastAlert: string | null;
  ignoredThisMonth: number;
  adjustmentsThisMonth: number;
}

export function alertSummary(alerts: SapSmartAlert[], source: SourceFilter, adjustments: string[], now: Date = new Date()): AlertSummary {
  const scoped = inScope(alerts, source);
  const latest = scoped.reduce<string | null>((best, a) => (best === null || a.detectedAt > best ? a.detectedAt : best), null);
  return {
    lastAlert: latest ? formatStamp(latest) : null,
    ignoredThisMonth: scoped.filter((a) => a.state === 'ignored' && a.stateChangedAt !== null && sameMonth(parseStamp(a.stateChangedAt), now)).length,
    adjustmentsThisMonth: adjustments.filter((at) => sameMonth(parseStamp(at), now)).length,
  };
}

// ---- Anomaly-detection settings ------------------------------------------------------------

export interface SettingLimit {
  key: keyof AlertSettings;
  label: string;
  help: string;
  min: number;
  max: number;
  step: number;
  integer: boolean;
}

export const ALERT_SETTING_LIMITS: SettingLimit[] = [
  { key: 'sensitivity', label: 'Sensitivity (stddev multiplier — lower = more sensitive)', help: 'How many standard deviations from the forecast count as an anomaly.', min: 1, max: 6, step: 0.1, integer: false },
  { key: 'minDeltaPercent', label: 'Minimum delta % to fire an anomaly', help: 'Smaller moves are ignored, however unusual they are statistically.', min: 0, max: 500, step: 1, integer: false },
  { key: 'minHistoryDays', label: 'Minimum history (days) before detection activates', help: 'A metric needs this much history before it can raise anomalies.', min: 3, max: 90, step: 1, integer: true },
  { key: 'cooldownHours', label: 'Cooldown (hours) before the same anomaly can re-fire', help: 'Keeps one lasting problem from sending an alert every night.', min: 1, max: 168, step: 1, integer: true },
];

export type SettingsDraft = Record<keyof AlertSettings, string>;
export type SettingsErrors = Partial<Record<keyof AlertSettings, string>>;

export const draftFromSettings = (settings: AlertSettings): SettingsDraft => ({
  sensitivity: String(settings.sensitivity), minDeltaPercent: String(settings.minDeltaPercent), minHistoryDays: String(settings.minHistoryDays), cooldownHours: String(settings.cooldownHours),
});

/** Checks every field against its range; `settings` is set only when all four are valid. */
export function parseSettings(draft: SettingsDraft): { settings?: AlertSettings; errors: SettingsErrors } {
  const errors: SettingsErrors = {};
  const values: Partial<AlertSettings> = {};
  for (const limit of ALERT_SETTING_LIMITS) {
    const raw = draft[limit.key].trim();
    const value = Number(raw);
    if (raw === '' || !Number.isFinite(value)) errors[limit.key] = 'Enter a number.';
    else if (limit.integer && !Number.isInteger(value)) errors[limit.key] = 'Use a whole number.';
    else if (value < limit.min || value > limit.max) errors[limit.key] = `Enter a value from ${limit.min} to ${limit.max}.`;
    else values[limit.key] = value;
  }
  return Object.keys(errors).length > 0 ? { errors } : { settings: values as AlertSettings, errors };
}

export const settingsEqual = (a: AlertSettings, b: AlertSettings) => ALERT_SETTING_LIMITS.every(({ key }) => a[key] === b[key]);

// ---- Recipients ----------------------------------------------------------------------------

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** An error message for an address that can't be added, or null when it can. */
export function validateRecipient(email: string, existing: string[]): string | null {
  const clean = email.trim();
  if (!clean) return 'Enter an email address.';
  if (!EMAIL_PATTERN.test(clean)) return 'Enter a valid email address, like name@company.com.';
  if (existing.some((e) => e.toLowerCase() === clean.toLowerCase())) return 'This address is already a recipient.';
  return null;
}
