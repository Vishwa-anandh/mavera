import { describe, it, expect } from 'vitest';
import { buildAttentionFeed, daysUntil, type AttentionInput, type AttentionSapAlert } from './attentionFeed';

const quiet: AttentionInput = {
  modules: { cloudCost: true, sapMonitoring: true },
  sapInsights: [],
  smartAlerts: [],
  budgetUtilPct: 40,
  totalBudget: 10000,
  forecastEom: 5000,
  highImpactSavings: 0,
  expiringReservations: [],
};

describe('daysUntil', () => {
  it('counts whole days from today, ignoring the time of day', () => {
    expect(daysUntil('2026-10-19', new Date(2026, 9, 16, 18, 30))).toBe(3);
    expect(daysUntil('2026-10-16', new Date(2026, 9, 16, 23, 59))).toBe(0);
    expect(daysUntil('2026-10-10', new Date(2026, 9, 16))).toBe(-6);
  });
});

describe('buildAttentionFeed', () => {
  it('is empty when nothing is wrong', () => {
    expect(buildAttentionFeed(quiet)).toEqual([]);
  });

  it('ranks the most urgent first across modules, keeping source order within a tone', () => {
    const feed = buildAttentionFeed({
      ...quiet,
      sapInsights: [
        { id: 'a', tone: 'info', title: 'Job running' },
        { id: 'b', tone: 'danger', title: 'HANA-PRD critical', to: '/sap/systems' },
      ],
      smartAlerts: [{ id: 1, severity: 'critical', title: 'Spend spiked' }, { id: 2, severity: 'high', title: 'Budget crossed' }],
      highImpactSavings: 2,
    });
    expect(feed.map((i) => i.title)).toEqual(['HANA-PRD critical', 'Spend spiked', 'Budget crossed', 'Job running', '2 high-impact savings waiting']);
    expect(feed[0].module).toBe('sap');
    expect(feed[1].module).toBe('cloud');
  });

  it('turns budget pressure into one item: forecast over budget beats high use', () => {
    const over = buildAttentionFeed({ ...quiet, forecastEom: 12000, budgetUtilPct: 90 });
    expect(over.map((i) => i.id)).toEqual(['budget-forecast']);
    expect(over[0].tone).toBe('danger');
    const near = buildAttentionFeed({ ...quiet, budgetUtilPct: 85 });
    expect(near.map((i) => i.id)).toEqual(['budget-use']);
  });

  it('flags reservations about to expire, warning inside a week', () => {
    const feed = buildAttentionFeed({ ...quiet, expiringReservations: [{ name: 'Compute Savings Plan', daysLeft: 3 }, { name: 'VM D4s v5', daysLeft: 20 }] });
    expect(feed.map((i) => i.tone)).toEqual(['warning', 'info']);
    expect(feed[0].title).toBe('Compute Savings Plan expires in 3 days');
  });

  it('leaves out every module the org is not subscribed to', () => {
    const input: AttentionInput = {
      ...quiet,
      sapInsights: [{ id: 's', tone: 'danger', title: 'SAP thing' }],
      smartAlerts: [{ id: 1, severity: 'critical', title: 'Cloud thing' }],
    };
    expect(buildAttentionFeed({ ...input, modules: { cloudCost: true, sapMonitoring: false } }).map((i) => i.module)).toEqual(['cloud']);
    expect(buildAttentionFeed({ ...input, modules: { cloudCost: false, sapMonitoring: true } }).map((i) => i.module)).toEqual(['sap']);
    expect(buildAttentionFeed({ ...input, modules: { cloudCost: false, sapMonitoring: false } })).toEqual([]);
  });

  describe('alert rows that can be acted on in place', () => {
    const sapAlert = (over: Partial<AttentionSapAlert> = {}): AttentionSapAlert => ({
      id: 'alert-1', type: 'Dumps', severity: 'High', system: 'MSQ', message: 'ABAP Dumps anomaly detected on MSQ.', read: false, ...over,
    });

    it('makes each unread critical or high SAP alert its own row, replacing the aggregate SAP finding', () => {
      const feed = buildAttentionFeed({
        ...quiet,
        sapInsights: [{ id: 'alerts', tone: 'danger', title: '2 unread critical or high alerts' }, { id: 'sys-x', tone: 'danger', title: 'HANA-PRD is critical' }],
        sapAlerts: [sapAlert(), sapAlert({ id: 'alert-2', severity: 'Critical', system: 'c15ac0e5-bc54-41ab-83d8-e2c1bd4a24bb' }), sapAlert({ id: 'alert-3', severity: 'Medium' }), sapAlert({ id: 'alert-4', read: true })],
      });
      expect(feed.map((i) => i.id)).toEqual(['sys-x', 'sap-alert-alert-2', 'sap-alert-alert-1']);
      expect(feed.find((i) => i.id === 'sap-alert-alert-2')).toMatchObject({ tone: 'danger', title: 'Dumps anomaly on c15ac0e5…', alert: { kind: 'sap', id: 'alert-2' }, to: '/sap/alerts' });
      expect(feed.find((i) => i.id === 'sap-alert-alert-1')).toMatchObject({ tone: 'warning', alert: { kind: 'sap', id: 'alert-1' } });
      expect(feed.find((i) => i.id === 'sys-x')?.alert).toBeUndefined();
    });

    it('keeps the aggregate SAP finding when no alert list is given', () => {
      const feed = buildAttentionFeed({ ...quiet, sapInsights: [{ id: 'alerts', tone: 'danger', title: '2 unread critical or high alerts' }] });
      expect(feed.map((i) => i.id)).toEqual(['alerts']);
    });

    it('marks a cost alert actionable only when the alert store holds it', () => {
      const feed = buildAttentionFeed({
        ...quiet,
        smartAlerts: [{ id: 'alert-1', severity: 'critical', title: 'Spend spiked' }, { id: 'api-7', severity: 'high', title: 'From the API' }],
        actionableCloudAlertIds: new Set(['alert-1']),
      });
      expect(feed[0]).toMatchObject({ id: 'cost-alert-alert-1', alert: { kind: 'cloud', id: 'alert-1' }, to: '/smart-alerts?status=critical' });
      expect(feed[1].alert).toBeUndefined();
    });

    it('leaves budget, savings and reservation rows without an alert', () => {
      const feed = buildAttentionFeed({ ...quiet, forecastEom: 12000, highImpactSavings: 1, expiringReservations: [{ name: 'RI', daysLeft: 2 }] });
      expect(feed.length).toBe(3);
      expect(feed.every((i) => i.alert === undefined)).toBe(true);
    });
  });
});
