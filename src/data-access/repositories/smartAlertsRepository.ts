import type { AlertProvider, RecipientAlertType, RecipientConfig, SmartAlert, SmartAlertsSettings } from '../contracts/smartAlerts';
import {
  DEFAULT_SMART_ALERTS_SETTINGS, DETECTION_SCHEDULE, SEED_ACCOUNT_FEEDBACK, SEED_ADJUSTMENTS, SEED_RECIPIENT_CONFIGS, SEED_SMART_ALERTS,
} from '../../demo/smartAlerts/mockSmartAlertsData';
import { getWorkspaceProfile, onWorkspaceProfileChange } from './workspaceProfile';

/**
 * Cloud cost alerts (Smart Alerts & Anomalies). PROTOTYPE: there is no backend for these yet, so state lives
 * in module memory: it survives moving between pages for the rest of the session and is gone on reload.
 * Swap each body for the matching `/smart-alerts` REST call when the endpoint is wired. Reads return copies.
 */
let alerts: SmartAlert[] = [];
let settings: SmartAlertsSettings = { ...DEFAULT_SMART_ALERTS_SETTINGS };
let feedback: Record<string, number> = {};
let recipients: RecipientConfig[] = [];
/** When settings were saved or an ignore widened an account's threshold; the page counts this month's. */
let adjustments: string[] = [];

/** A brand-new organisation (empty profile) starts with no alerts, no history and no recipient lists. */
function seed(): void {
  const empty = getWorkspaceProfile() === 'empty';
  alerts = empty ? [] : structuredClone(SEED_SMART_ALERTS);
  settings = { ...DEFAULT_SMART_ALERTS_SETTINGS };
  feedback = empty ? {} : { ...SEED_ACCOUNT_FEEDBACK };
  recipients = empty ? [] : structuredClone(SEED_RECIPIENT_CONFIGS);
  adjustments = empty ? [] : [...SEED_ADJUSTMENTS];
}
seed();
onWorkspaceProfileChange(seed);

/** Restores every store to its seed. Tests call this between cases; the app never does. */
export function resetSmartAlertsStore(): void {
  seed();
}

/** The sample account each provider's seeded alerts belong to: a newly connected account inherits them. */
const SAMPLE_ALERT_ACCOUNT: Record<string, string> = { azure: 'az-acc-1', aws: 'aws-acc-1', gcp: 'gcp-acc-1', btp: 'btp-acc-1' };

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
  /**
   * A newly connected account has no live feed, so it is shown the provider's sample alerts under its own
   * account id. Used for a new organisation's first account of a provider; a no-op when the account already
   * has alerts. Returns how many were added.
   */
  seedSampleAlerts(provider: AlertProvider, accountId: string): number {
    const sampleAccount = SAMPLE_ALERT_ACCOUNT[provider];
    if (!sampleAccount || alerts.some((a) => a.account_id === accountId)) return 0;
    const fresh = structuredClone(SEED_SMART_ALERTS)
      .filter((a) => a.provider === provider && a.account_id === sampleAccount)
      .map((a) => ({ ...a, id: `${accountId}-${a.id}`, account_id: accountId }));
    alerts = [...alerts, ...fresh];
    return fresh.length;
  },
  /** Drops the alerts of a removed account. */
  removeForAccount(accountId: string): void {
    alerts = alerts.filter((a) => a.account_id !== accountId);
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
  /**
   * Puts an alert back exactly as `previous` was (an Undo after Resolve or Ignore): its status, ignored flag and,
   * when an ignore is taken back, the account's widened threshold and the adjustment it logged.
   */
  restore(previous: SmartAlert): SmartAlert | null {
    const current = alerts.find((a) => a.id === previous.id);
    if (!current) return null;
    if (current.ignored && !previous.ignored) {
      const count = Math.max(0, (feedback[current.account_id] ?? 0) - 1);
      const { [current.account_id]: _removed, ...rest } = feedback;
      feedback = count > 0 ? { ...rest, [current.account_id]: count } : rest;
      adjustments = adjustments.slice(0, -1);
    }
    const restored = structuredClone(previous);
    alerts = alerts.map((a) => (a.id === previous.id ? restored : a));
    return structuredClone(restored);
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
