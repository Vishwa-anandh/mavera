import { describe, it, expect } from 'vitest';
import { buildAttentionFeed, daysUntil, type AttentionInput } from './attentionFeed';

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
});
