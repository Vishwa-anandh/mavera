import { describe, expect, it } from 'vitest';
import { cumulativeSeries, dailyTotals, daysInMonthOf, extendDailyHistory, groupByCategory, lastNDays, monthForecast, serviceStackKeys, sharesOf, stackDay, summarizeRegions, topWithOther } from './costAnalysis';

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

const dayRange = (from: number, to: number, cost: (day: number) => number, month = '2026-09') =>
  Array.from({ length: to - from + 1 }, (_, i) => ({ date: `${month}-${String(from + i).padStart(2, '0')}`, cost: cost(from + i) }));

describe('daysInMonthOf', () => {
  it('reads the length of the month from an ISO date', () => {
    expect(daysInMonthOf('2026-09-27')).toBe(30);
    expect(daysInMonthOf('2028-02-10')).toBe(29);
    expect(daysInMonthOf('nope')).toBeNull();
    expect(daysInMonthOf(undefined)).toBeNull();
  });
});

describe('monthForecast', () => {
  // 27 days of September: days 1..20 cost 10, days 21..27 cost 20, so the last 7 days average 20.
  const series = dayRange(1, 27, (day) => (day > 20 ? 20 : 10));

  it('lays the month out day by day: actual days, then projected days to month end', () => {
    const forecast = monthForecast(series)!;
    expect(forecast.rows).toHaveLength(30);
    expect(forecast.rows.slice(0, 27).every((row) => row.actual !== null && row.projected === null)).toBe(true);
    expect(forecast.rows.slice(27).every((row) => row.actual === null && row.projected !== null)).toBe(true);
    expect(forecast.rows[29].date).toBe('2026-09-30');
    expect(forecast.daysInMonth).toBe(30);
  });

  it('marks today as the last actual day', () => {
    const forecast = monthForecast(series)!;
    expect(forecast.todayIndex).toBe(26);
    expect(forecast.todayDate).toBe('2026-09-27');
    expect(forecast.rows[forecast.todayIndex].actual).toBe(20);
  });

  it('projects the average of the last 7 actual days when no month-end forecast is given', () => {
    const forecast = monthForecast(series)!;
    expect(forecast.method).toBe('last-7-day average');
    expect(forecast.dailyForecast).toBe(20);
    expect(forecast.projectedTotal).toBe(60);
    expect(forecast.actualTotal).toBe(340);
    expect(forecast.monthEndTotal).toBe(400);
  });

  it('spreads a month-end forecast over the remaining days and ties to it exactly', () => {
    const forecast = monthForecast(series, { forecastTotal: 400.01 })!;
    expect(forecast.method).toBe('month-end forecast');
    expect(forecast.monthEndTotal).toBe(400.01);
    expect(forecast.rows.filter((row) => row.projected !== null).reduce((sum, row) => sum + (row.projected ?? 0), 0)).toBeCloseTo(60.01, 2);
  });

  it('ignores a forecast that is not above the spend so far', () => {
    expect(monthForecast(series, { forecastTotal: 100 })!.method).toBe('last-7-day average');
  });

  it('has no projected days once the month is complete, and uses the month of the last point', () => {
    const full = monthForecast(dayRange(1, 30, () => 5))!;
    expect(full.method).toBe('complete');
    expect(full.rows.every((row) => row.projected === null)).toBe(true);
    // A 30 day window that starts in the previous month only draws the month it ends in.
    const spanning = [...dayRange(20, 31, () => 99, '2026-08'), ...dayRange(1, 5, () => 10)];
    const month = monthForecast(spanning)!;
    expect(month.actualTotal).toBe(50);
    expect(month.rows[0].date).toBe('2026-09-01');
  });

  it('returns null for an empty series', () => {
    expect(monthForecast([])).toBeNull();
  });
});

describe('per-service daily stack', () => {
  const split = (day: number) => ({ A: day, B: day * 2, C: day * 3, D: 1, E: 1 });
  const series = dayRange(1, 10, (day) => day * 6 + 2).map((point, i) => ({ ...point, byService: split(i + 1) }));

  it('keeps the three biggest services over the whole series, biggest first', () => {
    expect(serviceStackKeys(series)).toEqual(['C', 'B', 'A']);
  });

  it('keeps the order stable whatever window is shown', () => {
    // Keys come from the whole series, so a window where A is the biggest does not reorder the stack.
    const keys = serviceStackKeys(series);
    const reversed = stackDay({ ...series[0], byService: { A: 100, B: 1, C: 1, D: 0, E: 0 }, cost: 102 }, keys);
    expect(reversed.parts).toEqual([1, 1, 100]);
  });

  it('folds everything else into Other so each day adds up to its total', () => {
    const keys = serviceStackKeys(series);
    for (const point of series) {
      const day = stackDay(point, keys);
      expect(day.parts.reduce((sum, v) => sum + v, 0) + day.other).toBeCloseTo(point.cost, 2);
    }
    expect(stackDay(series[0], keys).other).toBe(2);
  });

  it('is empty for a series without a service breakdown', () => {
    expect(serviceStackKeys(dayRange(1, 3, () => 1))).toEqual([]);
  });
});

describe('summarizeRegions', () => {
  const regions = [
    { name: 'eu-west-1', cost: 100 }, { name: 'us-east-1', cost: 600 }, { name: 'us-west-2', cost: 200 }, { name: 'global', cost: 50 },
    { name: 'ap-south-1', cost: 30 }, { name: 'NoRegion', cost: 15 }, { name: 'eu-central-1', cost: 5 },
  ];
  const summary = summarizeRegions(regions);

  it('lists every region, most expensive first, with shares that total 100', () => {
    expect(summary.rows.map((row) => row.name)).toEqual(['us-east-1', 'us-west-2', 'eu-west-1', 'global', 'ap-south-1', 'NoRegion', 'eu-central-1']);
    expect(summary.rows.reduce((sum, row) => sum + row.sharePct, 0)).toBeCloseTo(100, 5);
    expect(summary.total).toBe(1000);
  });

  it('shows the top 4 regions in the donut and folds the rest into Other', () => {
    expect(summary.slices.map((slice) => slice.name)).toEqual(['us-east-1', 'us-west-2', 'eu-west-1', 'global', 'Other']);
    expect(summary.slices[4]).toMatchObject({ cost: 50, isOther: true });
    expect(summary.slices.reduce((sum, slice) => sum + slice.cost, 0)).toBe(summary.total);
    expect(summary.slices.reduce((sum, slice) => sum + slice.sharePct, 0)).toBeCloseTo(100, 5);
  });

  it('has no Other slice when there are four regions or fewer', () => {
    expect(summarizeRegions(regions.slice(0, 3)).slices.some((slice) => slice.isOther)).toBe(false);
    expect(summarizeRegions([]).rows).toEqual([]);
  });
});
