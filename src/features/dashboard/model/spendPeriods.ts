import type { SpendTrendPoint } from '../../../shared/ui/SpendTrendChart';
import type { DashboardSummary } from './useDashboardData';

/** The ranges offered on the spend trend. Short ranges read the daily series, long ones the monthly series. */
export type SpendPeriod = '7D' | '30D' | '3M' | '6M' | '1Y';

export const DEFAULT_SPEND_PERIOD: SpendPeriod = '6M';

export const SPEND_PERIOD_OPTIONS: Array<{ value: SpendPeriod; label: string; ariaLabel: string }> = [
  { value: '7D', label: '7D', ariaLabel: 'Last 7 days' },
  { value: '30D', label: '30D', ariaLabel: 'Last 30 days' },
  { value: '3M', label: '3M', ariaLabel: 'Last 3 months' },
  { value: '6M', label: '6M', ariaLabel: 'Last 6 months' },
  { value: '1Y', label: '1Y', ariaLabel: 'Last 12 months' },
];

const SPEC: Record<SpendPeriod, { unit: 'day' | 'month'; count: number; words: string }> = {
  '7D': { unit: 'day', count: 7, words: '7 days' },
  '30D': { unit: 'day', count: 30, words: '30 days' },
  '3M': { unit: 'month', count: 3, words: '3 months' },
  '6M': { unit: 'month', count: 6, words: '6 months' },
  '1Y': { unit: 'month', count: 12, words: '12 months' },
};

export interface PeriodTrend {
  period: SpendPeriod;
  unit: 'day' | 'month';
  /** "7 days", "6 months": the length of both the selected range and the one it is compared with. */
  periodWords: string;
  points: SpendTrendPoint[];
  /** False when the summary has no series at this resolution (e.g. no daily data from the API yet). */
  available: boolean;
  total: number;
  /** Spend over the equally long range just before this one; null when that history doesn't exist. */
  previousTotal: number | null;
  /** Percent change of `total` against `previousTotal`, one decimal; null when it can't be compared. */
  changePct: number | null;
  /** Projected spend for the next equally long range (straight-line trend of this range); null with too little data. */
  forecast: number | null;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function sum(values: number[]): number {
  return values.reduce((total, v) => total + v, 0);
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** "2026-09-22" -> "22 Sep". Unparseable keys are shown as they are. */
export function dayLabel(key: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  return match ? `${Number(match[3])} ${MONTH_NAMES[Number(match[2]) - 1] ?? match[2]}` : key;
}

/** "2026-09" -> "Sep 2026". */
export function monthLabel(key: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  return match ? `${MONTH_NAMES[Number(match[2]) - 1] ?? match[2]} ${match[1]}` : key;
}

/**
 * Least-squares line through `values`, summed over the next `horizon` steps (each step floored at 0).
 * Returns null with fewer than three points: two points always give a line, but not a trend worth quoting.
 */
export function linearForecast(values: number[], horizon: number): number | null {
  const n = values.length;
  if (n < 3 || horizon < 1) return null;
  const meanX = (n - 1) / 2;
  const meanY = sum(values) / n;
  let numerator = 0;
  let denominator = 0;
  values.forEach((y, x) => {
    numerator += (x - meanX) * (y - meanY);
    denominator += (x - meanX) ** 2;
  });
  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = meanY - slope * meanX;
  let projected = 0;
  for (let step = 0; step < horizon; step += 1) projected += Math.max(0, intercept + slope * (n + step));
  return Math.round(projected * 100) / 100;
}

function seriesOf(summary: DashboardSummary | null, unit: 'day' | 'month'): Array<{ key: string; amount: number }> {
  const raw = unit === 'day' ? summary?.daily : summary?.monthly;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row) => typeof row === 'object' && row !== null && typeof row.key === 'string')
    .map((row) => ({ key: row.key, amount: num(row.total) }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * The spend trend for one selected range: the chart points, their total, the change against the
 * range just before it, and a forecast for the next one. 7D and 30D come from the daily series;
 * 3M, 6M and 1Y from the monthly series.
 */
export function periodTrendOf(summary: DashboardSummary | null, period: SpendPeriod): PeriodTrend {
  const { unit, count, words } = SPEC[period];
  const series = seriesOf(summary, unit);
  const current = series.slice(-count);
  const before = series.slice(-count * 2, -count);

  const total = Math.round(sum(current.map((row) => row.amount)) * 100) / 100;
  const hasComparison = before.length === count && current.length === count;
  const previousTotal = hasComparison ? Math.round(sum(before.map((row) => row.amount)) * 100) / 100 : null;

  return {
    period,
    unit,
    periodWords: words,
    points: current.map((row) => ({ date: unit === 'day' ? dayLabel(row.key) : monthLabel(row.key), amount: row.amount })),
    available: current.length > 0,
    total,
    previousTotal,
    changePct: previousTotal !== null && previousTotal > 0 ? round1(((total - previousTotal) / previousTotal) * 100) : null,
    forecast: current.length === count ? linearForecast(current.map((row) => row.amount), count) : null,
  };
}
