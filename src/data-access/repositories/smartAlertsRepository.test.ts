import { beforeEach, describe, expect, it } from 'vitest';
import { resetSmartAlertsStore, smartAlertsRepository as repo } from './smartAlertsRepository';

beforeEach(() => resetSmartAlertsStore());

const find = (id: string) => repo.list().find((a) => a.id === id)!;

describe('alerts', () => {
  it('marks one alert read, and every active unread alert with markAllRead', () => {
    expect(find('alert-1').status).toBe('unread');
    repo.markRead('alert-1');
    expect(find('alert-1').status).toBe('read');
    const changed = repo.markAllRead();
    expect(changed).toBeGreaterThan(0);
    expect(repo.list().filter((a) => !a.ignored && a.status === 'unread')).toHaveLength(0);
    expect(repo.markAllRead()).toBe(0);
  });

  it('resolves an alert', () => {
    repo.resolve('alert-1');
    expect(find('alert-1').status).toBe('resolved');
  });

  it('ignoring hides the alert, records when, and widens its account', () => {
    const before = repo.getAccountFeedback()['az-acc-1'] ?? 0;
    const adjustmentsBefore = repo.listAdjustments().length;
    const ignored = repo.ignore('alert-1');
    expect(ignored).toMatchObject({ ignored: true, status: 'read' });
    expect(ignored?.ignored_at).toBeTruthy();
    expect(repo.getAccountFeedback()['az-acc-1']).toBe(before + 1);
    expect(repo.listAdjustments()).toHaveLength(adjustmentsBefore + 1);
    repo.ignore('alert-1');
    expect(repo.getAccountFeedback()['az-acc-1']).toBe(before + 1);
  });

  it('reopening an ignored alert undoes the widening; reopening a resolved one makes it active again', () => {
    repo.ignore('alert-1');
    repo.reopen('alert-1');
    expect(find('alert-1')).toMatchObject({ ignored: false });
    expect(find('alert-1').ignored_at).toBeUndefined();
    expect(repo.getAccountFeedback()['az-acc-1']).toBeUndefined();
    repo.resolve('alert-2');
    repo.reopen('alert-2');
    expect(find('alert-2').status).toBe('read');
  });

  it('returns null for an unknown id and hands out copies', () => {
    expect(repo.markRead('nope')).toBeNull();
    repo.list()[0].message = 'changed';
    expect(repo.list()[0].message).not.toBe('changed');
  });
});

describe('settings', () => {
  it('saves and resets, logging each as a threshold adjustment', () => {
    const adjustments = repo.listAdjustments().length;
    const saved = repo.saveSettings({ ...repo.getSettings(), spikeThresholdPct: 45 });
    expect(saved.spikeThresholdPct).toBe(45);
    expect(repo.getSettings().spikeThresholdPct).toBe(45);
    expect(repo.resetSettings()).toEqual(repo.getDefaultSettings());
    expect(repo.listAdjustments()).toHaveLength(adjustments + 2);
  });
});

describe('recipients', () => {
  it('adds a first address for an alert type, ignores a duplicate in another case, and removes', () => {
    expect(repo.listRecipients().find((c) => c.alert_type === 'resource_creation')).toBeUndefined();
    repo.addRecipient('resource_creation', ' Ana@Maitsys.com ');
    repo.addRecipient('resource_creation', 'ana@maitsys.com');
    expect(repo.listRecipients().find((c) => c.alert_type === 'resource_creation')?.recipients).toEqual(['Ana@Maitsys.com']);
    repo.removeRecipient('resource_creation', 'ana@maitsys.com');
    expect(repo.listRecipients().find((c) => c.alert_type === 'resource_creation')?.recipients).toEqual([]);
  });

  it('goes back to the default list for one type', () => {
    expect(repo.listRecipients().some((c) => c.alert_type === 'cost_threshold')).toBe(true);
    repo.resetRecipients('cost_threshold');
    expect(repo.listRecipients().some((c) => c.alert_type === 'cost_threshold')).toBe(false);
  });
});
