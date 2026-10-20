import { describe, it, expect } from 'vitest';
import type { SapSmartAlert } from '../../../data-access';
import { alertCounts, alertSummary, draftFromSettings, filterAlerts, parseSettings, validateRecipient } from './sapAlerts';

const alert = (id: string, over: Partial<SapSmartAlert> = {}): SapSmartAlert => ({
  id, source: 'SAP', type: 'Dumps', severity: 'High', system: 'MSQ', message: 'm', detectedAt: '2026-09-06T09:27:00', read: false, state: 'active', stateChangedAt: null, ...over,
});
const NOW = new Date('2026-09-06T12:00:00');
const alerts = [
  alert('1'),
  alert('2', { source: 'HANA', type: 'CPU', severity: 'Critical', read: true, detectedAt: '2026-07-28T05:25:00' }),
  alert('3', { source: 'HANA', type: 'Memory', severity: 'Critical', state: 'resolved', stateChangedAt: '2026-09-02T10:00:00', detectedAt: '2026-08-01T05:25:00' }),
  alert('4', { state: 'ignored', stateChangedAt: '2026-09-04T10:00:00', detectedAt: '2026-08-02T05:25:00' }),
];

describe('alertCounts', () => {
  it('counts only active alerts; resolved and ignored leave every counter', () => {
    expect(alertCounts(alerts, 'All', NOW)).toEqual({ totalActive: 2, unread: 1, critical: 1, newBreaches: 1 });
  });

  it('follows the source switch', () => {
    expect(alertCounts(alerts, 'HANA', NOW)).toEqual({ totalActive: 1, unread: 0, critical: 1, newBreaches: 0 });
    expect(alertCounts(alerts, 'SAP', NOW).totalActive).toBe(1);
  });

  it('only calls unread alerts from the last 24 hours new breaches', () => {
    expect(alertCounts(alerts, 'All', new Date('2026-09-08T12:00:00')).newBreaches).toBe(0);
  });
});

describe('filterAlerts', () => {
  const all = { source: 'All', view: 'active', type: 'All' } as const;

  it('lists active alerts by default, newest first', () => {
    expect(filterAlerts(alerts, all).map((a) => a.id)).toEqual(['1', '2']);
  });

  it('shows resolved and ignored alerts under their own view', () => {
    expect(filterAlerts(alerts, { ...all, view: 'resolved' }).map((a) => a.id)).toEqual(['3']);
    expect(filterAlerts(alerts, { ...all, view: 'ignored' }).map((a) => a.id)).toEqual(['4']);
  });

  it('filters by unread, critical, source and type', () => {
    expect(filterAlerts(alerts, { ...all, view: 'unread' }).map((a) => a.id)).toEqual(['1']);
    expect(filterAlerts(alerts, { ...all, view: 'critical' }).map((a) => a.id)).toEqual(['2']);
    expect(filterAlerts(alerts, { ...all, source: 'HANA' }).map((a) => a.id)).toEqual(['2']);
    expect(filterAlerts(alerts, { ...all, type: 'CPU' }).map((a) => a.id)).toEqual(['2']);
  });
});

describe('alertSummary', () => {
  it('derives the last alert, ignored alerts this month and adjustments this month', () => {
    const summary = alertSummary(alerts, 'All', ['2026-09-01T08:00:00', '2026-08-01T08:00:00'], NOW);
    expect(summary).toEqual({ lastAlert: 'Sep 6, 9:27 AM', ignoredThisMonth: 1, adjustmentsThisMonth: 1 });
  });

  it('has no last alert when there are none', () => {
    expect(alertSummary([], 'All', [], NOW)).toEqual({ lastAlert: null, ignoredThisMonth: 0, adjustmentsThisMonth: 0 });
  });
});

describe('parseSettings', () => {
  const ok = { sensitivity: 3, minDeltaPercent: 20, minHistoryDays: 14, cooldownHours: 24 };

  it('accepts in-range values', () => {
    expect(parseSettings(draftFromSettings(ok)).settings).toEqual(ok);
  });

  it('reports every out-of-range or malformed field', () => {
    const { settings, errors } = parseSettings({ sensitivity: '0.5', minDeltaPercent: '', minHistoryDays: '2.5', cooldownHours: '500' });
    expect(settings).toBeUndefined();
    expect(Object.keys(errors).sort()).toEqual(['cooldownHours', 'minDeltaPercent', 'minHistoryDays', 'sensitivity']);
  });
});

describe('validateRecipient', () => {
  it('requires a valid, new address', () => {
    expect(validateRecipient('', [])).toMatch(/Enter/);
    expect(validateRecipient('nope', [])).toMatch(/valid/);
    expect(validateRecipient('A@B.com', ['a@b.com'])).toMatch(/already/);
    expect(validateRecipient(' ops@maitsys.com ', [])).toBeNull();
  });
});
