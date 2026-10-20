import { describe, it, expect } from 'vitest';
import { demoDailySpend, demoEarlierMonths } from './demoSpendHistory';
import { dayLabel, linearForecast, monthLabel, periodTrendOf, SPEND_PERIOD_OPTIONS } from './spendPeriods';
import type { DashboardSummary } from './useDashboardData';

/** 60 days from 2026-08-01 at 100/day, then 7 days at 200/day: a clean step the ranges can be checked against. */
function dailySeries() {
  const days: Array<{ key: string; total: number }> = [];
  const start = new Date('2026-08-01T00:00:00Z');
  for (let i = 0; i < 67; i += 1) {
    const d = new Date(start.getTime() + i * 86_400_000);
    days.push({ key: d.toISOString().slice(0, 10), total: i < 60 ? 100 : 200 });
  }
  return days;
}

function monthlySeries(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const index = i + 2; // from March 2025
    return { key: `${2025 + Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`, total: 1000 + i * 100 };
  });
}

describe('periodTrendOf', () => {
  const summary: DashboardSummary = { daily: dailySeries(), monthly: monthlySeries(24) };

  it('offers 7D, 30D, 3M, 6M and 1Y', () => {
    expect(SPEND_PERIOD_OPTIONS.map((o) => o.value)).toEqual(['7D', '30D', '3M', '6M', '1Y']);
  });

  it('derives 7D from the daily series and compares it with the 7 days before', () => {
    const trend = periodTrendOf(summary, '7D');
    expect(trend.unit).toBe('day');
    expect(trend.points).toHaveLength(7);
    expect(trend.total).toBe(1400);
    expect(trend.previousTotal).toBe(700);
    expect(trend.changePct).toBe(100);
  });

  it('derives 30D from the daily series with a 30-day previous range', () => {
    const trend = periodTrendOf(summary, '30D');
    expect(trend.points).toHaveLength(30);
    expect(trend.total).toBe(23 * 100 + 7 * 200);
    expect(trend.previousTotal).toBe(3000);
    expect(trend.changePct).toBe(23.3);
  });

  it('derives 3M, 6M and 1Y from the monthly series', () => {
    const three = periodTrendOf(summary, '3M');
    const six = periodTrendOf(summary, '6M');
    const year = periodTrendOf(summary, '1Y');
    expect([three.points.length, six.points.length, year.points.length]).toEqual([3, 6, 12]);
    expect(three.unit).toBe('month');
    // Month i of the series totals 1000 + 100 * i, so the last 3 are 3100 + 3200 + 3300 and the 3 before 2800 + 2900 + 3000.
    expect(three.total).toBe(9600);
    expect(three.previousTotal).toBe(8700);
    expect(three.changePct).toBe(10.3);
    expect(six.total).toBe(18300);
    expect(six.previousTotal).toBe(14700);
    expect(six.changePct).toBe(24.5);
    expect(year.total).toBe(33000);
    expect(year.previousTotal).toBe(18600);
    expect(year.changePct).toBe(77.4);
  });

  it('recomputes the chart points, the delta and the forecast when the range changes', () => {
    const week = periodTrendOf(summary, '7D');
    const half = periodTrendOf(summary, '6M');
    expect(week.points).not.toEqual(half.points);
    expect(week.changePct).not.toBe(half.changePct);
    expect(week.forecast).not.toBe(half.forecast);
  });

  it('forecasts the next equally long range along the trend of the selected one', () => {
    // Monthly totals rise by 100 each month; the next 3 months continue the line.
    const trend = periodTrendOf(summary, '3M');
    expect(trend.forecast).toBe(3400 + 3500 + 3600);
  });

  it('has no comparison when the earlier range does not exist', () => {
    const short = periodTrendOf({ monthly: monthlySeries(4) }, '6M');
    expect(short.available).toBe(true);
    expect(short.previousTotal).toBeNull();
    expect(short.changePct).toBeNull();
    expect(short.forecast).toBeNull();
  });

  it('says a range is unavailable when the summary has no daily series', () => {
    const trend = periodTrendOf({ monthly: monthlySeries(24) }, '7D');
    expect(trend.available).toBe(false);
    expect(trend.points).toEqual([]);
    expect(trend.total).toBe(0);
  });

  it('survives a missing or malformed summary', () => {
    expect(periodTrendOf(null, '6M').available).toBe(false);
    expect(periodTrendOf({ monthly: [{ total: 5 }] as never }, '6M').available).toBe(false);
  });

  it('labels days and months for the axis', () => {
    expect(dayLabel('2026-09-22')).toBe('22 Sep');
    expect(monthLabel('2026-09')).toBe('Sep 2026');
    expect(periodTrendOf(summary, '7D').points[0].date).toMatch(/^\d{1,2} \w{3}$/);
    expect(periodTrendOf(summary, '6M').points[0].date).toMatch(/^\w{3} \d{4}$/);
  });
});

describe('linearForecast', () => {
  it('continues a straight line', () => {
    expect(linearForecast([10, 20, 30], 2)).toBe(40 + 50);
  });
  it('never projects below zero', () => {
    expect(linearForecast([30, 20, 10], 5)).toBe(0);
  });
  it('needs at least three points', () => {
    expect(linearForecast([1, 2], 3)).toBeNull();
  });
});

describe('demo spend history', () => {
  it('builds each month of the daily series so it adds up to the monthly total', () => {
    const monthly = [{ key: '2026-07', total: 15420 }, { key: '2026-08', total: 16230 }, { key: '2026-09', total: 16230 }];
    const daily = demoDailySpend(monthly, '2026-07', '2026-09-28');
    const sumOf = (prefix: string) => Math.round(daily.filter((d) => d.key.startsWith(prefix)).reduce((s, d) => s + d.total, 0) * 100) / 100;
    expect(sumOf('2026-07')).toBe(15420);
    expect(sumOf('2026-08')).toBe(16230);
    expect(sumOf('2026-09')).toBe(16230);
    expect(daily[0].key).toBe('2026-07-01');
    expect(daily[daily.length - 1].key).toBe('2026-09-28');
    expect(daily).toHaveLength(31 + 31 + 28);
  });

  it('adds eighteen earlier months that lead into April 2026', () => {
    const earlier = demoEarlierMonths();
    expect(earlier).toHaveLength(18);
    expect(earlier[0].key).toBe('2024-10');
    expect(earlier[17].key).toBe('2026-03');
    for (const row of earlier) expect(row.total).toBe(row.azure + row.aws + row.btp + row.gcp);
  });
});
