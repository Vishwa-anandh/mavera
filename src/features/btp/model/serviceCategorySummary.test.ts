import { describe, it, expect } from 'vitest';
import { serviceCategoryOf, serviceCategorySummaryOf } from './btpDerivations';
import { btpTopServices } from '../../../demo/btp/mockBtpData';

describe('serviceCategoryOf', () => {
  it('puts SAP BTP services into categories and everything else in Other', () => {
    expect(serviceCategoryOf('SAP HANA Cloud')).toBe('Data & Analytics');
    expect(serviceCategoryOf('SAP Integration Suite')).toBe('Integration');
    expect(serviceCategoryOf('SAP Build Apps')).toBe('Application Development');
    expect(serviceCategoryOf('Cloud Foundry Runtime')).toBe('DevOps & Platform');
    expect(serviceCategoryOf('Kyma Runtime')).toBe('DevOps & Platform');
    expect(serviceCategoryOf('Object Store')).toBe('Storage');
    expect(serviceCategoryOf('Something New')).toBe('Other');
  });
});

describe('serviceCategorySummaryOf', () => {
  const services = [
    { name: 'SAP HANA Cloud', cost: 600, previousCost: 500 },
    { name: 'Cloud Foundry Runtime', cost: 100, previousCost: 100 },
    { name: 'Kyma Runtime', cost: 100, previousCost: 200 },
    { name: 'Object Store', cost: 200, previousCost: 200 },
  ];

  it('counts services, adds up cost and works out share and trend per category', () => {
    const { rows } = serviceCategorySummaryOf(services);
    expect(rows).toEqual([
      { category: 'Data & Analytics', serviceCount: 1, cost: 600, sharePct: 60, trendPct: 20 },
      { category: 'DevOps & Platform', serviceCount: 2, cost: 200, sharePct: 20, trendPct: -33.3 },
      { category: 'Storage', serviceCount: 1, cost: 200, sharePct: 20, trendPct: 0 },
    ].sort((a, b) => b.cost - a.cost || a.category.localeCompare(b.category)));
  });

  it('sorts by cost, descending by default and ascending on request, ties by name', () => {
    expect(serviceCategorySummaryOf(services).rows.map((r) => r.category)).toEqual(['Data & Analytics', 'DevOps & Platform', 'Storage']);
    expect(serviceCategorySummaryOf(services, 'asc').rows.map((r) => r.category)).toEqual(['DevOps & Platform', 'Storage', 'Data & Analytics']);
  });

  it('has a Total row that is not part of the sort and shares add up to 100%', () => {
    for (const direction of ['desc', 'asc'] as const) {
      const { rows, total } = serviceCategorySummaryOf(services, direction);
      expect(total).toEqual({ serviceCount: 4, cost: 1000, sharePct: 100, trendPct: 0 });
      expect(rows.reduce((sum, r) => sum + r.cost, 0)).toBe(total.cost);
      expect(Math.round(rows.reduce((sum, r) => sum + r.sharePct, 0))).toBe(100);
    }
  });

  it('has no trend when a previous month is missing, and copes with no services', () => {
    expect(serviceCategorySummaryOf([{ name: 'SAP HANA Cloud', cost: 10 }]).rows[0].trendPct).toBeNull();
    const empty = serviceCategorySummaryOf([]);
    expect(empty.rows).toEqual([]);
    expect(empty.total).toEqual({ serviceCount: 0, cost: 0, sharePct: 0, trendPct: null });
  });

  it('is derived from the BTP sample services and accounts for every one of them', () => {
    const topServices = btpTopServices();
    const { rows, total } = serviceCategorySummaryOf(topServices);
    expect(total.serviceCount).toBe(topServices.length);
    expect(rows.reduce((sum, r) => sum + r.serviceCount, 0)).toBe(topServices.length);
    expect(total.cost).toBeCloseTo(topServices.reduce((s, x) => s + x.cost, 0), 2);
    expect(rows.every((r) => r.trendPct !== null)).toBe(true);
  });
});
