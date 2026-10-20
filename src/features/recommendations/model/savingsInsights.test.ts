import { describe, it, expect } from 'vitest';
import type { MonthlyProviderCost, OptimizationOpportunity, SavingsRealisationPoint } from '../../../data-access';
import { cloudInsightsRepository } from '../../../data-access';
import { buildRecommendationsView } from './recommendationsDerivations';
import {
  applyRecalculation, groupSmallAreas, mspRowsOf, recalcFactor, savingsByArea, savingsByProvider, savingsTrendOf, topRecommendationsOf, visibleOpportunities,
} from './savingsInsights';

function opp(overrides: Partial<OptimizationOpportunity> & Pick<OptimizationOpportunity, 'id'>): OptimizationOpportunity {
  return {
    provider: 'azure', title: overrides.id, resource: 'r', resourceId: 'r', rationale: '', category: 'Rightsizing', area: 'Compute', impact: 'Medium', effort: 'Medium',
    monthlySaving: 100, currency: 'USD', source: 's', assumptions: '', ...overrides,
  };
}

const sample: OptimizationOpportunity[] = [
  opp({ id: 'a', provider: 'azure', area: 'Compute', monthlySaving: 400, overlapsWith: 'b' }),
  opp({ id: 'b', provider: 'azure', area: 'Compute', monthlySaving: 300 }),
  opp({ id: 'c', provider: 'aws', area: 'Storage', monthlySaving: 200 }),
  opp({ id: 'd', provider: 'aws', area: 'Reservations', monthlySaving: 500 }),
  opp({ id: 'e', provider: 'btp', area: 'Platform', monthlySaving: 50 }),
];

describe('visibleOpportunities', () => {
  const all = ['azure', 'aws', 'btp', 'gcp'] as const;

  it('leaves out dismissed opportunities and ones that overlap another active one', () => {
    const { active, countable } = visibleOpportunities(sample, { d: { status: 'Dismissed' } }, '', [...all]);
    expect(active.map((o) => o.id)).toEqual(['a', 'b', 'c', 'e']);
    expect(countable.map((o) => o.id)).toEqual(['b', 'c', 'e']);
  });

  it('counts an overlapping recommendation again once the one it overlaps is dismissed', () => {
    const { countable } = visibleOpportunities(sample, { b: { status: 'Dismissed' } }, 'azure', [...all]);
    expect(countable.map((o) => o.id)).toEqual(['a']);
  });

  it('filters every figure by the chosen provider', () => {
    expect(visibleOpportunities(sample, {}, 'aws', [...all]).active.map((o) => o.id)).toEqual(['c', 'd']);
    expect(visibleOpportunities(sample, {}, 'gcp', [...all]).active).toEqual([]);
  });

  it('never shows providers the person or organisation cannot see', () => {
    expect(visibleOpportunities(sample, {}, '', ['azure']).active.map((o) => o.id)).toEqual(['a', 'b']);
    expect(visibleOpportunities(sample, {}, 'aws', ['azure']).active).toEqual([]);
  });
});

describe('savings aggregation', () => {
  const { countable } = visibleOpportunities(sample, {}, '', ['azure', 'aws', 'btp', 'gcp']);

  it('adds up monthly saving by area, biggest first', () => {
    expect(savingsByArea(countable)).toEqual([
      { area: 'Reservations', saving: 500, count: 1 },
      { area: 'Compute', saving: 300, count: 1 },
      { area: 'Storage', saving: 200, count: 1 },
      { area: 'Platform', saving: 50, count: 1 },
    ]);
  });

  it('adds up monthly saving by provider', () => {
    expect(savingsByProvider(countable).map((p) => [p.provider, p.saving])).toEqual([['aws', 700], ['azure', 300], ['btp', 50]]);
  });

  it('keeps a donut readable by folding small areas into one', () => {
    const areas = savingsByArea([
      opp({ id: '1', area: 'Compute', monthlySaving: 500 }), opp({ id: '2', area: 'Storage', monthlySaving: 400 }), opp({ id: '3', area: 'Network', monthlySaving: 300 }),
      opp({ id: '4', area: 'Database', monthlySaving: 200 }), opp({ id: '5', area: 'Reservations', monthlySaving: 100 }), opp({ id: '6', area: 'Platform', monthlySaving: 50 }),
    ]);
    const grouped = groupSmallAreas(areas);
    expect(grouped.map((a) => a.area)).toEqual(['Compute', 'Storage', 'Network', 'Database', 'Other areas']);
    expect(grouped[4]).toMatchObject({ saving: 150, count: 2 });
    expect(groupSmallAreas(areas.slice(0, 5))).toHaveLength(5);
  });

  it('ranks the top recommendations by monthly saving', () => {
    expect(topRecommendationsOf(countable, 3).map((o) => o.id)).toEqual(['d', 'b', 'c']);
  });

  it('classifies the demo opportunities into compute, storage, network, database and reservations', () => {
    const areas = new Set(cloudInsightsRepository.listOptimizationOpportunities().map((o) => o.area));
    for (const area of ['Compute', 'Storage', 'Network', 'Database', 'Reservations']) expect(areas.has(area as never)).toBe(true);
  });
});

describe('mspRowsOf', () => {
  const spend = { azure: 1000, aws: 2000, btp: 500, gcp: 100 };

  it('applies each provider its own rate: Azure 7%, AWS 3.5%, BTP 2%, GCP 2%', () => {
    const rows = mspRowsOf(spend, '');
    expect(rows.map((r) => [r.provider, r.rate, r.saving])).toEqual([['azure', 0.07, 70], ['aws', 0.035, 70], ['btp', 0.02, 10], ['gcp', 0.02, 2]]);
  });

  it('shows one provider when filtered', () => {
    expect(mspRowsOf(spend, 'aws').map((r) => r.provider)).toEqual(['aws']);
  });
});

describe('recalculation', () => {
  it('is 1 before the first recalculation and deterministic afterwards', () => {
    expect(recalcFactor(0)).toBe(1);
    expect(recalcFactor(1)).toBe(recalcFactor(1));
    expect(recalcFactor(1)).not.toBe(1);
    expect(recalcFactor(1)).not.toBe(recalcFactor(2));
    for (let n = 1; n < 30; n += 1) expect(Math.abs(recalcFactor(n) - 1)).toBeLessThanOrEqual(0.0125);
  });

  it('nudges optimisation estimates but never the contractual MSP savings', () => {
    const view = buildRecommendationsView('');
    const nudged = applyRecalculation(view, 1.01);
    expect(nudged.optTotal).toBeCloseTo(view.optTotal * 1.01, 1);
    expect(nudged.cspTotal).toBe(view.cspTotal);
    expect(nudged.totalSavings).toBeCloseTo(view.totalSavings + view.optTotal * 0.01, 1);
    expect(applyRecalculation(view, 1)).toBe(view);
  });
});

describe('savingsTrendOf', () => {
  const month = (m: string, provider: MonthlyProviderCost['provider'], cost: number): MonthlyProviderCost => ({ month: m, provider, cost, currency: 'USD' });
  const monthly = [
    month('2026-07', 'azure', 1000), month('2026-08', 'azure', 1000), month('2026-09', 'azure', 2000),
    month('2026-07', 'aws', 1000), month('2026-08', 'aws', 1000), month('2026-09', 'aws', 2000),
    month('2025-12', 'azure', 500),
  ];
  const realisation: SavingsRealisationPoint[] = [
    { month: '2025-12', appliedShare: 0 }, { month: '2026-07', appliedShare: 0.2 }, { month: '2026-08', appliedShare: 0.3 }, { month: '2026-09', appliedShare: 0.5 },
  ];

  it('pins the latest month to the savings on screen and scales earlier months by spend', () => {
    const points = savingsTrendOf({ monthly, realisation, provider: '', range: '6M', currentPotential: 1200 });
    const latest = points[points.length - 1];
    expect(latest.month).toBe('2026-09');
    expect(latest.potential).toBe(1200);
    // August spend is half of September's, so its potential is half: 600.
    expect(points.find((p) => p.month === '2026-08')?.potential).toBe(600);
  });

  it('always realises the MSP discount and a growing share of the optimisation part', () => {
    const [, , latest] = savingsTrendOf({ monthly, realisation, provider: '', range: '6M', currentPotential: 1200 }).slice(-3);
    // MSP in September: 2000 x 7% + 2000 x 3.5% = 210; optimisation part 990 of which 50% is applied.
    expect(latest.realised).toBeCloseTo(210 + 990 * 0.5, 2);
    for (const p of savingsTrendOf({ monthly, realisation, provider: '', range: '12M', currentPotential: 1200 })) {
      expect(p.realised).toBeLessThanOrEqual(p.potential);
    }
  });

  it('limits the series to the chosen provider', () => {
    const azure = savingsTrendOf({ monthly, realisation, provider: 'azure', range: '6M', currentPotential: 600 });
    expect(azure[azure.length - 1].potential).toBe(600);
    expect(azure.find((p) => p.month === '2026-08')?.potential).toBe(300);
  });

  it('offers 6 months, 12 months and year to date', () => {
    const six = savingsTrendOf({ monthly, realisation, provider: '', range: '6M', currentPotential: 1200 });
    const year = savingsTrendOf({ monthly, realisation, provider: '', range: '12M', currentPotential: 1200 });
    const ytd = savingsTrendOf({ monthly, realisation, provider: '', range: 'YTD', currentPotential: 1200 });
    expect(six.map((p) => p.month)).toEqual(['2025-12', '2026-07', '2026-08', '2026-09']);
    expect(year.length).toBe(4);
    expect(ytd.map((p) => p.month)).toEqual(['2026-07', '2026-08', '2026-09']);
  });

  it('is empty when the provider has no spend history', () => {
    expect(savingsTrendOf({ monthly, realisation, provider: 'gcp', range: '6M', currentPotential: 0 })).toEqual([]);
  });

  it('ends on the Total Savings (Potential) figure for the demo data', () => {
    const view = buildRecommendationsView('');
    const points = savingsTrendOf({ monthly: cloudInsightsRepository.getCostAnalytics().monthly, realisation: cloudInsightsRepository.getSavingsRealisation(), provider: '', range: '12M', currentPotential: view.totalSavings });
    expect(points).toHaveLength(12);
    expect(points[11].potential).toBeCloseTo(view.totalSavings, 2);
  });
});
