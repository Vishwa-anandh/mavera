import type { RecipientAlertType, RecipientConfig, SmartAlert, SmartAlertsSettings } from '../contracts/smartAlerts';
import {
  DEFAULT_SMART_ALERTS_SETTINGS, DETECTION_SCHEDULE, SEED_ACCOUNT_FEEDBACK, SEED_ADJUSTMENTS, SEED_RECIPIENT_CONFIGS, SEED_SMART_ALERTS,
} from '../../demo/smartAlerts/mockSmartAlertsData';

/**
 * Cloud cost alerts (Smart Alerts & Anomalies). PROTOTYPE: there is no backend for these yet, so state lives
 * in module memory: it survives moving between pages for the rest of the session and is gone on reload.
 * Swap each body for the matching `/smart-alerts` REST call when the endpoint is wired. Reads return copies.
 */
let alerts: SmartAlert[] = structuredClone(SEED_SMART_ALERTS);
let settings: SmartAlertsSettings = { ...DEFAULT_SMART_ALERTS_SETTINGS };
let feedback: Record<string, number> = { ...SEED_ACCOUNT_FEEDBACK };
let recipients: RecipientConfig[] = structuredClone(SEED_RECIPIENT_CONFIGS);
/** When settings were saved or an ignore widened an account's threshold; the page counts this month's. */
let adjustments: string[] = [...SEED_ADJUSTMENTS];

/** Restores every store to its seed. Tests call this between cases; the app never does. */
export function resetSmartAlertsStore(): void {
  alerts = structuredClone(SEED_SMART_ALERTS);
  settings = { ...DEFAULT_SMART_ALERTS_SETTINGS };
  feedback = { ...SEED_ACCOUNT_FEEDBACK };
  recipients = structuredClone(SEED_RECIPIENT_CONFIGS);
  adjustments = [...SEED_ADJUSTMENTS];
}

const stamp = () => new Date().toISOString();
const sameAddress = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

const update = (id: string, change: (alert: SmartAlert) => SmartAlert): SmartAlert | null => {
  const found = alerts.find((a) => a.id === id);
  if (!found) return null;
  const next = change(found);
  alerts = alerts.map((a) => (a.id === id ? next : a));
  return structuredClone(next);
};

const isActive = (a: SmartAlert) => !a.ignored && a.status !== 'resolved';

export const smartAlertsRepository = {
  list(): SmartAlert[] {
    return structuredClone(alerts);
  },
  markRead(id: string): SmartAlert | null {
    return update(id, (a) => (a.status === 'unread' ? { ...a, status: 'read' } : a));
  },
  /** Marks every active unread alert read and returns how many changed. */
  markAllRead(): number {
    const targets = alerts.filter((a) => isActive(a) && a.status === 'unread');
    const ids = new Set(targets.map((a) => a.id));
    alerts = alerts.map((a) => (ids.has(a.id) ? { ...a, status: 'read' } : a));
    return targets.length;
  },
  resolve(id: string): SmartAlert | null {
    return update(id, (a) => ({ ...a, status: 'resolved' }));
  },
  /** Ignoring hides the alert from every counter and widens the detection band for its account. */
  ignore(id: string): SmartAlert | null {
    const found = alerts.find((a) => a.id === id);
    if (!found || found.ignored) return found ? structuredClone(found) : null;
    feedback = { ...feedback, [found.account_id]: (feedback[found.account_id] ?? 0) + 1 };
    adjustments = [...adjustments, stamp()];
    return update(id, (a) => ({ ...a, status: a.status === 'unread' ? 'read' : a.status, ignored: true, ignored_at: stamp() }));
  },
  /** Brings a resolved or ignored alert back to the active list, undoing an ignore's widening. */
  reopen(id: string): SmartAlert | null {
    const found = alerts.find((a) => a.id === id);
    if (found?.ignored) {
      const count = Math.max(0, (feedback[found.account_id] ?? 0) - 1);
      const { [found.account_id]: _removed, ...rest } = feedback;
      feedback = count > 0 ? { ...rest, [found.account_id]: count } : rest;
    }
    return update(id, (a) => {
      const { ignored_at: _ignoredAt, ...rest } = a;
      return { ...rest, ignored: false, status: a.status === 'resolved' ? 'read' : a.status };
    });
  },

  getSettings(): SmartAlertsSettings {
    return { ...settings };
  },
  getDefaultSettings(): SmartAlertsSettings {
    return { ...DEFAULT_SMART_ALERTS_SETTINGS };
  },
  saveSettings(next: SmartAlertsSettings): SmartAlertsSettings {
    settings = { ...next };
    adjustments = [...adjustments, stamp()];
    return { ...settings };
  },
  resetSettings(): SmartAlertsSettings {
    settings = { ...DEFAULT_SMART_ALERTS_SETTINGS };
    adjustments = [...adjustments, stamp()];
    return { ...settings };
  },
  /** Ignores per account, which widen that account's spike threshold. */
  getAccountFeedback(): Record<string, number> {
    return { ...feedback };
  },
  listAdjustments(): string[] {
    return [...adjustments];
  },
  detectionSchedule(): string {
    return DETECTION_SCHEDULE;
  },

  /** Custom recipient lists; an alert type with no entry emails every organisation member. */
  listRecipients(): RecipientConfig[] {
    return structuredClone(recipients);
  },
  addRecipient(type: RecipientAlertType, email: string): RecipientConfig[] {
    const clean = email.trim();
    const existing = recipients.find((c) => c.alert_type === type);
    if (!clean) return structuredClone(recipients);
    if (!existing) recipients = [...recipients, { alert_type: type, recipients: [clean] }];
    else if (!existing.recipients.some((r) => sameAddress(r, clean))) {
      recipients = recipients.map((c) => (c.alert_type === type ? { ...c, recipients: [...c.recipients, clean] } : c));
    }
    return structuredClone(recipients);
  },
  removeRecipient(type: RecipientAlertType, email: string): RecipientConfig[] {
    recipients = recipients.map((c) => (c.alert_type === type ? { ...c, recipients: c.recipients.filter((r) => !sameAddress(r, email)) } : c));
    return structuredClone(recipients);
  },
  /** Back to the default (every organisation member) for one alert type. */
  resetRecipients(type: RecipientAlertType): RecipientConfig[] {
    recipients = recipients.filter((c) => c.alert_type !== type);
    return structuredClone(recipients);
  },
};
