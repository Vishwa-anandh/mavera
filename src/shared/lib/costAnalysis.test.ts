import { describe, expect, it } from 'vitest';
import { cumulativeSeries, dailyTotals, extendDailyHistory, groupByCategory, lastNDays, sharesOf, topWithOther } from './costAnalysis';

const day = (date: string, cost: number) => ({ date, cost });

describe('sharesOf', () => {
  it('adds up to exactly 100 even when plain rounding would not', () => {
    const shares = sharesOf([1, 1, 1]);
    expect(shares.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 10);
    expect(shares.slice().sort()).toEqual([33.3, 33.3, 33.4]);
  });

  it('keeps proportions and returns zeros for an empty total', () => {
    expect(sharesOf([75, 25])).toEqual([75, 25]);
    expect(sharesOf([0, 0])).toEqual([0, 0]);
    expect(sharesOf([])).toEqual([]);
  });
});

describe('groupByCategory', () => {
  const services = [
    { name: 'Virtual Machines', cost: 600 },
    { name: 'SQL Database', cost: 250 },
    { name: 'Kubernetes', cost: 100 },
    { name: 'Redis', cost: 50 },
  ];
  const categoryOf = (name: string) => (/sql|redis/i.test(name) ? 'Databases' : 'Compute');

  it('groups, sorts by cost and reports shares that total 100', () => {
    const summary = groupByCategory(services, categoryOf);
    expect(summary.rows.map((r) => [r.category, r.cost, r.sharePct])).toEqual([
      ['Compute', 700, 70],
      ['Databases', 300, 30],
    ]);
    expect(summary.total).toBe(1000);
    expect(summary.serviceCount).toBe(4);
    expect(summary.rows.reduce((sum, r) => sum + r.sharePct, 0)).toBeCloseTo(100, 10);
  });

  it('lists the services of a category biggest first, with their share of the whole', () => {
    const compute = groupByCategory(services, categoryOf).rows[0];
    expect(compute.services.map((s) => [s.name, s.sharePct])).toEqual([['Virtual Machines', 60], ['Kubernetes', 10]]);
  });

  it('copes with no services', () => {
    expect(groupByCategory([], categoryOf)).toEqual({ rows: [], total: 0, serviceCount: 0 });
  });
});

describe('lastNDays', () => {
  const series = [1, 2, 3, 4, 5];
  it('takes the most recent days', () => expect(lastNDays(series, 2)).toEqual([4, 5]));
  it('returns everything when the series is shorter than the window', () => expect(lastNDays(series, 30)).toEqual(series));
});

describe('extendDailyHistory', () => {
  const august = Array.from({ length: 31 }, (_, i) => day(`2026-08-${String(i + 1).padStart(2, '0')}`, 10 + i));
  const september = Array.from({ length: 27 }, (_, i) => day(`2026-09-${String(i + 1).padStart(2, '0')}`, 20));
  const history = [{ year: 2026, month: 8, dailyCosts: august }];

  it('pads a month-to-date series to 30 days with the end of the previous month', () => {
    const extended = extendDailyHistory(september, history, 30);
    expect(extended).toHaveLength(30);
    expect(extended[0].date).toBe('2026-08-29');
    expect(extended[2].date).toBe('2026-08-31');
    expect(extended[3].date).toBe('2026-09-01');
  });

  it('crosses the year boundary', () => {
    const january = [day('2026-01-01', 5), day('2026-01-02', 5)];
    const december = Array.from({ length: 31 }, (_, i) => day(`2025-12-${String(i + 1).padStart(2, '0')}`, 1));
    const extended = extendDailyHistory(january, [{ year: 2025, month: 12, dailyCosts: december }], 30);
    expect(extended).toHaveLength(30);
    expect(extended[0].date).toBe('2025-12-04');
  });

  it('leaves a long enough series alone, and one without stored history as it is', () => {
    expect(extendDailyHistory(august, history, 30)).toHaveLength(31);
    expect(extendDailyHistory(september, [], 30)).toHaveLength(27);
    expect(extendDailyHistory([], history, 30)).toEqual([]);
  });
});

describe('dailyTotals', () => {
  it('sums, averages and finds the peak day', () => {
    const totals = dailyTotals([day('2026-09-01', 10), day('2026-09-02', 30), day('2026-09-03', 20)]);
    expect(totals).toEqual({ total: 60, average: 20, peak: day('2026-09-02', 30) });
  });
  it('is empty for no data', () => expect(dailyTotals([])).toEqual({ total: 0, average: 0, peak: null }));
});

describe('cumulativeSeries', () => {
  const daily = [day('2026-09-01', 10), day('2026-09-02', 20), day('2026-09-03', 30)];

  it('is a running total ending at the month-to-date spend', () => {
    expect(cumulativeSeries(daily).map((p) => p.actual)).toEqual([10, 30, 60]);
  });

  it('continues to month end at the average daily rate, joined to the last actual value', () => {
    const points = cumulativeSeries(daily, 5);
    expect(points).toHaveLength(5);
    expect(points[2]).toEqual({ date: '2026-09-03', actual: 60, projected: 60 });
    expect(points[3]).toEqual({ date: '2026-09-04', projected: 80 });
    expect(points[4]).toEqual({ date: '2026-09-05', projected: 100 });
  });

  it('is empty for no data', () => expect(cumulativeSeries([], 30)).toEqual([]));
});

describe('topWithOther', () => {
  const items = [{ name: 'a', cost: 1 }, { name: 'b', cost: 5 }, { name: 'c', cost: 3 }, { name: 'd', cost: 2 }];
  it('keeps the biggest and folds the rest', () => {
    expect(topWithOther(items, 2)).toEqual([{ name: 'b', cost: 5 }, { name: 'c', cost: 3 }, { name: 'Other', cost: 3 }]);
  });
  it('adds no Other when everything fits', () => expect(topWithOther(items, 4)).toHaveLength(4));
  it('preserves the total', () => expect(topWithOther(items, 1).reduce((s, i) => s + i.cost, 0)).toBe(11));
});
