import { describe, it, expect } from 'vitest';
import type { AlertChannel } from './budgetsTypes';
import { addRecipients, channelsForNewBudget, channelsNotifiedFor, channelSummary, isValidEmail, linkedBudgetNames, teamsWebhookError } from './budgetChannels';

function channel(overrides: Partial<AlertChannel> & Pick<AlertChannel, 'id'>): AlertChannel {
  return { provider: 'email', enabled: true, alert_scope: 'global', budget_ids: [], email_addresses: ['a@x.com'], webhook_url: '', created_at: '2026-09-01T00:00:00Z', ...overrides };
}

describe('email recipients', () => {
  it('validates addresses', () => {
    expect(isValidEmail('finance@maitsys.com')).toBe(true);
    expect(isValidEmail(' ops@maitsys.com ')).toBe(true);
    for (const bad of ['', 'plain', 'a@b', '@x.com', 'a b@x.com']) expect(isValidEmail(bad)).toBe(false);
  });

  it('adds one address, or several pasted at once, ignoring duplicates regardless of case', () => {
    expect(addRecipients([], 'a@x.com')).toEqual({ emails: ['a@x.com'], error: null });
    expect(addRecipients(['a@x.com'], 'A@x.com, b@x.com;c@x.com\nd@x.com')).toEqual({ emails: ['a@x.com', 'b@x.com', 'c@x.com', 'd@x.com'], error: null });
  });

  it('keeps the valid ones and reports the first invalid entry', () => {
    const result = addRecipients([], 'a@x.com nope b@x.com');
    expect(result.emails).toEqual(['a@x.com']);
    expect(result.error).toBe('"nope" is not a valid email address.');
  });
});

describe('teamsWebhookError', () => {
  it('accepts Microsoft Teams webhook and Workflows URLs', () => {
    expect(teamsWebhookError('https://maitsys.webhook.office.com/webhookb2/abc@def/IncomingWebhook/x/y')).toBeNull();
    expect(teamsWebhookError('https://outlook.office.com/webhook/abc/IncomingWebhook/x')).toBeNull();
    expect(teamsWebhookError('https://prod-12.westeurope.logic.azure.com:443/workflows/abc/triggers/manual/paths/invoke?sig=1')).toBeNull();
  });

  it('rejects empty, malformed, non-https and non-Microsoft URLs', () => {
    expect(teamsWebhookError('')).toMatch(/Enter the webhook URL/);
    expect(teamsWebhookError('not a url')).toMatch(/not a valid URL/);
    expect(teamsWebhookError('http://maitsys.webhook.office.com/webhookb2/abc')).toMatch(/https/);
    expect(teamsWebhookError('https://example.com/hook/abc')).toMatch(/does not look like a Microsoft Teams webhook/);
    expect(teamsWebhookError('https://evil.com/?x=.webhook.office.com')).toMatch(/does not look like/);
  });
});

describe('who a budget notifies', () => {
  const global = channel({ id: 'g' });
  const tied = channel({ id: 't', alert_scope: 'budget_specific', budget_ids: ['b1'] });
  const other = channel({ id: 'o', alert_scope: 'budget_specific', budget_ids: ['b2'] });
  const paused = channel({ id: 'p', enabled: false });
  const all = [global, tied, other, paused];

  it('is every enabled global channel plus the enabled ones tied to that budget', () => {
    expect(channelsNotifiedFor('b1', all).map((c) => c.id)).toEqual(['g', 't']);
    expect(channelsNotifiedFor('b2', all).map((c) => c.id)).toEqual(['g', 'o']);
    expect(channelsNotifiedFor('b3', all).map((c) => c.id)).toEqual(['g']);
  });

  it('for a budget not created yet is the global channels plus the budget-based ones chosen', () => {
    expect(channelsForNewBudget(all, []).map((c) => c.id)).toEqual(['g']);
    expect(channelsForNewBudget(all, ['o']).map((c) => c.id)).toEqual(['g', 'o']);
  });

  it('summarises a channel and names the budgets it is tied to', () => {
    expect(channelSummary(channel({ id: 'x', email_addresses: ['a@x.com', 'b@x.com'] }))).toBe('a@x.com, b@x.com');
    expect(channelSummary(channel({ id: 'x', provider: 'teams', webhook_url: 'https://maitsys.webhook.office.com/webhookb2/abc' }))).toBe('maitsys.webhook.office.com');
    expect(linkedBudgetNames(tied, [{ id: 'b1', name: 'Azure Production', target_amount: 1, alert_threshold: 80, scope_type: 'organization', scope_value: '' }])).toEqual(['Azure Production']);
    expect(linkedBudgetNames(tied, [])).toEqual([]);
  });
});
