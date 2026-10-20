import type { AlertChannel, Budget } from './budgetsTypes';

const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL.test(value.trim());
}

/** Hosts Microsoft Teams hands out for incoming webhooks and Workflows (Power Automate) URLs. */
const TEAMS_HOST_SUFFIXES = ['.webhook.office.com', '.office.com', '.logic.azure.com', '.powerplatform.com', '.powerautomate.com'];

/** An error message for a Teams webhook URL, or null when it looks like a real one. */
export function teamsWebhookError(value: string): string | null {
  const text = value.trim();
  if (!text) return 'Enter the webhook URL of the Teams channel.';
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return 'That is not a valid URL. It should look like https://your-tenant.webhook.office.com/…';
  }
  if (url.protocol !== 'https:') return 'The webhook URL must start with https://.';
  const host = url.hostname.toLowerCase();
  if (!TEAMS_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))) return 'That does not look like a Microsoft Teams webhook (expected a webhook.office.com address).';
  if (url.pathname.length < 2) return 'The webhook URL is missing its path.';
  return null;
}

export interface AddRecipientsResult {
  emails: string[];
  /** Set when an entry was not a valid address; entries before it were still added. */
  error: string | null;
}

/**
 * Adds the address(es) typed or pasted into the recipient box to `existing`. Several can be pasted at
 * once, separated by commas, semicolons, spaces or new lines. Duplicates (ignoring case) are skipped
 * silently; the first invalid entry stops the add and is reported.
 */
export function addRecipients(existing: string[], raw: string): AddRecipientsResult {
  const emails = [...existing];
  for (const entry of raw.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean)) {
    if (!isValidEmail(entry)) return { emails, error: `"${entry}" is not a valid email address.` };
    if (!emails.some((e) => e.toLowerCase() === entry.toLowerCase())) emails.push(entry);
  }
  return { emails, error: null };
}

/** Enabled channels that will be told about an alert for `budgetId`: every global one plus those tied to it. */
export function channelsNotifiedFor(budgetId: string, channels: AlertChannel[]): AlertChannel[] {
  return channels.filter((c) => c.enabled && (c.alert_scope === 'global' || c.budget_ids.includes(budgetId)));
}

/**
 * Channels a budget that does not exist yet would notify: the enabled global ones, plus the enabled
 * budget-based channels chosen in the create form.
 */
export function channelsForNewBudget(channels: AlertChannel[], chosenIds: string[]): AlertChannel[] {
  return channels.filter((c) => c.enabled && (c.alert_scope === 'global' || chosenIds.includes(c.id)));
}

/** "Email: finance@maitsys.com, ops@maitsys.com" or "Teams: maitsys.webhook.office.com". */
export function channelSummary(channel: AlertChannel): string {
  if (channel.provider === 'email') return channel.email_addresses.join(', ');
  try {
    return new URL(channel.webhook_url).hostname;
  } catch {
    return channel.webhook_url;
  }
}

export function providerLabel(channel: Pick<AlertChannel, 'provider'>): string {
  return channel.provider === 'email' ? 'Email' : 'Microsoft Teams';
}

/** The budgets a budget-based channel is tied to, by name; unknown ids (deleted budgets) are dropped. */
export function linkedBudgetNames(channel: AlertChannel, budgets: Budget[]): string[] {
  return channel.budget_ids.map((id) => budgets.find((b) => b.id === id)?.name).filter((name): name is string => Boolean(name));
}
