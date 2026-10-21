import { describe, expect, it } from 'vitest';
import type { SmartAlert } from './smartAlertsTypes';
import { alertCounts, alertSummary, draftFromSettings, filterAlerts, isActive, parseSettings, settingsEqual, wideningPoints } from './smartAlertsDerivations';

const alert = (over: Partial<SmartAlert> & { id: string }): SmartAlert => ({
  alert_type: 'spike', severity: 'medium', status: 'read', ignored: false, provider: 'aws', account_id: 'acc', message: 'm', detected_at: '2026-09-10T08:00:00Z', ...over,
});

const alerts: SmartAlert[] = [
  alert({ id: 'a', severity: 'critical', status: 'unread', detected_at: '2026-09-12T08:00:00Z' }),
  alert({ id: 'b', severity: 'high', status: 'unread', alert_type: 'resource_creation', provider: 'azure', detected_at: '2026-09-11T08:00:00Z' }),
  alert({ id: 'c', severity: 'low', status: 'read', alert_type: 'budget_breach', provider: 'gcp' }),
  alert({ id: 'd', severity: 'critical', status: 'resolved', detected_at: '2026-09-09T08:00:00Z' }),
  alert({ id: 'e', severity: 'critical', status: 'unread', ignored: true, ignored_at: '2026-09-13T08:00:00Z', detected_at: '2026-09-08T08:00:00Z' }),
];

const base = { view: 'active', type: 'all', provider: 'all' } as const;

describe('alertCounts', () => {
  it('counts only active alerts: resolved and ignored ones leave every counter', () => {
    expect(alertCounts(alerts)).toEqual({ totalActive: 3, unread: 2, critical: 1, newResources: 1 });
  });
  it('treats ignored and resolved alerts as inactive', () => {
    expect(alerts.filter(isActive).map((a) => a.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('filterAlerts', () => {
  it('lists active alerts newest first by default', () => {
    expect(filterAlerts(alerts, base).map((a) => a.id)).toEqual(['a', 'b', 'c']);
  });
  it('narrows by status view', () => {
    expect(filterAlerts(alerts, { ...base, view: 'unread' }).map((a) => a.id)).toEqual(['a', 'b']);
    expect(filterAlerts(alerts, { ...base, view: 'critical' }).map((a) => a.id)).toEqual(['a']);
    expect(filterAlerts(alerts, { ...base, view: 'high' }).map((a) => a.id)).toEqual(['a', 'b']);
  });
  it('lists resolved and ignored alerts only under their own views', () => {
    expect(filterAlerts(alerts, { ...base, view: 'resolved' }).map((a) => a.id)).toEqual(['d']);
    expect(filterAlerts(alerts, { ...base, view: 'ignored' }).map((a) => a.id)).toEqual(['e']);
  });
  it('combines the type and provider filters', () => {
    expect(filterAlerts(alerts, { ...base, type: 'resource_creation' }).map((a) => a.id)).toEqual(['b']);
    expect(filterAlerts(alerts, { ...base, provider: 'gcp' }).map((a) => a.id)).toEqual(['c']);
    expect(filterAlerts(alerts, { ...base, type: 'spike', provider: 'azure' })).toEqual([]);
  });
});

describe('alertSummary', () => {
  it('reports the newest alert, the ignores and the threshold adjustments of the month', () => {
    const summary = alertSummary(alerts, ['2026-09-02T10:00:00', '2026-08-30T10:00:00'], new Date('2026-09-20T12:00:00'));
    expect(summary).toEqual({ lastAlertAt: '2026-09-12T08:00:00Z', ignoredThisMonth: 1, adjustmentsThisMonth: 1 });
  });
  it('has no last alert when there are none', () => {
    expect(alertSummary([], []).lastAlertAt).toBeNull();
  });
});

describe('wideningPoints', () => {
  it('adds 5 points per ignore up to 20', () => {
    expect([0, 1, 3, 4, 9].map(wideningPoints)).toEqual([0, 5, 15, 20, 20]);
  });
});

describe('detection settings', () => {
  const defaults = { spikeThresholdPct: 30, minDailySpend: 20, forecastOveragePct: 10, minHistoryDays: 14, cooldownHours: 24 };

  it('round-trips valid settings', () => {
    expect(parseSettings(draftFromSettings(defaults))).toEqual({ settings: defaults, errors: {} });
  });
  it('reports every invalid field and returns no settings', () => {
    const { settings, errors } = parseSettings({ ...draftFromSettings(defaults), spikeThresholdPct: '2', minDailySpend: '', minHistoryDays: '14.5', cooldownHours: '999', forecastOveragePct: 'abc' });
    expect(settings).toBeUndefined();
    expect(errors).toEqual({
      spikeThresholdPct: 'Enter a value from 5 to 500.',
      minDailySpend: 'Enter a number.',
      forecastOveragePct: 'Enter a number.',
      minHistoryDays: 'Use a whole number.',
      cooldownHours: 'Enter a value from 1 to 168.',
    });
  });
  it('compares settings field by field', () => {
    expect(settingsEqual(defaults, { ...defaults })).toBe(true);
    expect(settingsEqual(defaults, { ...defaults, cooldownHours: 12 })).toBe(false);
  });
});
