/**
 * Pure helpers for cloud cost detail pages (Azure and AWS account views): grouping services into
 * categories, windowing a daily series, building a cumulative curve and folding a long tail into "Other".
 * Nothing here knows about a provider; the provider supplies the category mapping.
 */

export interface NamedCost {
  name: string;
  cost: number;
}

export interface DailyPoint {
  /** ISO date, `YYYY-MM-DD`. */
  date: string;
  cost: number;
  /** What each service cost that day; when present it adds up to `cost` to the cent. */
  byService?: Record<string, number>;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Percentages with one decimal that add up to exactly 100.0, using the largest-remainder method so a
 * table of shares never reads 99.9% or 100.1% in total. Returns zeros when the total is zero.
 */
export function sharesOf(costs: number[]): number[] {
  const total = costs.reduce((sum, cost) => sum + cost, 0);
  if (total <= 0) return costs.map(() => 0);
  const exact = costs.map((cost) => (cost / total) * 1000);
  const floors = exact.map(Math.floor);
  let remainder = 1000 - floors.reduce((sum, value) => sum + value, 0);
  const order = exact.map((value, index) => ({ index, fraction: value - Math.floor(value) })).sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (const { index } of order) {
    if (remainder <= 0) break;
    floors[index] += 1;
    remainder -= 1;
  }
  return floors.map((value) => value / 10);
}

export interface CategoryRow<T extends NamedCost = NamedCost> {
  category: string;
  cost: number;
  /** Share of the grand total, one decimal; the shares of all rows add up to exactly 100. */
  sharePct: number;
  /** The services in this category, most expensive first, each with its own share of the grand total. */
  services: Array<T & { sharePct: number }>;
}

export interface CategorySummary<T extends NamedCost = NamedCost> {
  rows: Array<CategoryRow<T>>;
  total: number;
  serviceCount: number;
}

/** Groups services by `categoryOf(name)`; categories and the services in them are sorted by cost, highest first. */
export function groupByCategory<T extends NamedCost>(services: T[], categoryOf: (name: string) => string): CategorySummary<T> {
  const grand = services.reduce((sum, service) => sum + service.cost, 0);
  const serviceShares = sharesOf(services.map((service) => service.cost));
  const shareByName = new Map(services.map((service, index) => [service.name, serviceShares[index]]));

  const groups = new Map<string, T[]>();
  for (const service of services) {
    const category = categoryOf(service.name);
    groups.set(category, [...(groups.get(category) ?? []), service]);
  }

  const entries = [...groups.entries()].map(([category, list]) => ({ category, list, cost: round2(list.reduce((sum, service) => sum + service.cost, 0)) }));
  entries.sort((a, b) => b.cost - a.cost || a.category.localeCompare(b.category));
  const categoryShares = sharesOf(entries.map((entry) => entry.cost));

  const rows = entries.map((entry, index) => ({
    category: entry.category,
    cost: entry.cost,
    sharePct: categoryShares[index],
    services: [...entry.list].sort((a, b) => b.cost - a.cost || a.name.localeCompare(b.name)).map((service) => ({ ...service, sharePct: shareByName.get(service.name) ?? 0 })),
  }));
  return { rows, total: round2(grand), serviceCount: services.length };
}

/** The most recent `days` entries of a (date ordered) series; the whole series when it is shorter. */
export function lastNDays<T>(series: T[], days: number): T[] {
  return days >= series.length ? series.slice() : series.slice(series.length - days);
}

interface MonthOfDays {
  year: number;
  month: number;
  dailyCosts: DailyPoint[];
}

/**
 * A daily series long enough for a 30 day window. A month-to-date series only reaches back to the 1st, so the
 * missing days are taken from the end of the previous month, found in the stored monthly history. When the
 * previous month is not stored the series is returned as it is.
 */
export function extendDailyHistory(current: DailyPoint[], history: MonthOfDays[], minDays = 30): DailyPoint[] {
  if (current.length === 0 || current.length >= minDays) return current.slice();
  const match = /^(\d{4})-(\d{2})-/.exec(current[0].date);
  if (!match) return current.slice();
  const year = Number(match[1]);
  const month = Number(match[2]);
  const previous = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const previousMonth = history.find((entry) => entry.year === previous.year && entry.month === previous.month);
  if (!previousMonth) return current.slice();
  const missing = minDays - current.length;
  return [...lastNDays(previousMonth.dailyCosts, missing), ...current];
}

export interface DailyTotals {
  total: number;
  average: number;
  peak: DailyPoint | null;
}

export function dailyTotals(series: DailyPoint[]): DailyTotals {
  if (series.length === 0) return { total: 0, average: 0, peak: null };
  const total = round2(series.reduce((sum, point) => sum + point.cost, 0));
  const peak = series.reduce((best, point) => (point.cost > best.cost ? point : best), series[0]);
  return { total, average: round2(total / series.length), peak };
}

export interface CumulativePoint {
  date: string;
  /** Spend so far this month; absent for projected days. */
  actual?: number;
  /** Where spend lands if the average daily rate holds; present from the last actual day to month end. */
  projected?: number;
}

/**
 * Running total of a month-to-date daily series, continued to the end of the month at the average daily
 * rate so far. The projection starts at the last actual value so the two lines join.
 */
export function cumulativeSeries(daily: DailyPoint[], daysInMonth?: number): CumulativePoint[] {
  if (daily.length === 0) return [];
  let running = 0;
  const points: CumulativePoint[] = daily.map((point) => {
    running = round2(running + point.cost);
    return { date: point.date, actual: running };
  });
  if (!daysInMonth || daysInMonth <= daily.length) return points;

  const rate = running / daily.length;
  const last = daily[daily.length - 1].date;
  const prefix = last.slice(0, 8);
  const lastIndex = points.length - 1;
  points[lastIndex] = { ...points[lastIndex], projected: running };
  for (let day = daily.length + 1; day <= daysInMonth; day += 1) {
    points.push({ date: `${prefix}${String(day).padStart(2, '0')}`, projected: round2(running + rate * (day - daily.length)) });
  }
  return points;
}

/** Keeps the `keep` biggest items and folds the rest into one "Other" item (omitted when there is no rest). */
export function topWithOther(items: NamedCost[], keep: number, otherLabel = 'Other'): NamedCost[] {
  const sorted = [...items].sort((a, b) => b.cost - a.cost);
  const head = sorted.slice(0, keep);
  const rest = sorted.slice(keep);
  if (rest.length === 0) return head;
  return [...head, { name: otherLabel, cost: round2(rest.reduce((sum, item) => sum + item.cost, 0)) }];
}

/** Days in the month an ISO date (`YYYY-MM-DD`) falls in; null when the date cannot be read. */
export function daysInMonthOf(date: string | undefined): number | null {
  const match = date ? /^(\d{4})-(\d{2})-/.exec(date) : null;
  return match ? new Date(Number(match[1]), Number(match[2]), 0).getDate() : null;
}

export interface ForecastDay {
  date: string;
  /** Billed cost for the day; null for days that have not happened yet. */
  actual: number | null;
  /** Forecast cost for a day after the last actual day; null for actual days. */
  projected: number | null;
}

export interface MonthForecast {
  /** One row per calendar day of the month, in order. */
  rows: ForecastDay[];
  /** Index in `rows` of the last actual day (today). */
  todayIndex: number;
  todayDate: string;
  daysInMonth: number;
  actualTotal: number;
  projectedTotal: number;
  /** Actual so far plus the projected days. */
  monthEndTotal: number;
  /** The forecast cost of each remaining day. */
  dailyForecast: number;
  method: 'month-end forecast' | 'last-7-day average' | 'complete';
}

/**
 * The month the series ends in, laid out day by day: actual days up to the last point ("today") and projected
 * days to month end. Each projected day is the average of the last 7 actual days, unless a month-end forecast
 * total is given (and is above the spend so far), in which case the remaining amount is spread evenly over the
 * remaining days so the chart ties to the forecast figure shown elsewhere on the page.
 */
export function monthForecast(series: DailyPoint[], options: { forecastTotal?: number | null } = {}): MonthForecast | null {
  if (series.length === 0) return null;
  const last = series[series.length - 1];
  const prefix = last.date.slice(0, 7);
  const daysInMonth = daysInMonthOf(last.date);
  if (!daysInMonth) return null;
  const actualDays = series.filter((point) => point.date.startsWith(prefix));
  const byDate = new Map(actualDays.map((point) => [point.date, point.cost]));
  const lastDay = Number(last.date.slice(8, 10));
  const actualTotal = round2(actualDays.reduce((sum, point) => sum + point.cost, 0));
  const remaining = daysInMonth - lastDay;
  const forecastTotal = options.forecastTotal;

  let dailyForecast = 0;
  let method: MonthForecast['method'] = 'complete';
  if (remaining > 0) {
    if (forecastTotal && forecastTotal > actualTotal) {
      dailyForecast = round2((forecastTotal - actualTotal) / remaining);
      method = 'month-end forecast';
    } else {
      const recent = actualDays.slice(-7);
      dailyForecast = round2(recent.reduce((sum, point) => sum + point.cost, 0) / recent.length);
      method = 'last-7-day average';
    }
  }
  const exactRemainder = method === 'month-end forecast' && forecastTotal ? round2(forecastTotal - actualTotal) : null;

  const rows: ForecastDay[] = [];
  let projectedSoFar = 0;
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${prefix}-${String(day).padStart(2, '0')}`;
    const actual = byDate.get(date);
    if (actual !== undefined) {
      rows.push({ date, actual, projected: null });
    } else if (day > lastDay) {
      // The last projected day absorbs the cent rounding so the projected days add up to the forecast.
      const projected = exactRemainder !== null && day === daysInMonth ? round2(exactRemainder - projectedSoFar) : dailyForecast;
      projectedSoFar = round2(projectedSoFar + projected);
      rows.push({ date, actual: null, projected });
    } else {
      rows.push({ date, actual: null, projected: null });
    }
  }
  return { rows, todayIndex: lastDay - 1, todayDate: last.date, daysInMonth, actualTotal, projectedTotal: projectedSoFar, monthEndTotal: round2(actualTotal + projectedSoFar), dailyForecast, method };
}

/**
 * The services that get their own colour in a per-day stack: the `keep` biggest over the whole series, biggest
 * first. They are worked out from the full series, not from the visible window, so a service keeps its colour
 * when the range changes. Everything else is "Other".
 */
export function serviceStackKeys(series: DailyPoint[], keep = 3): string[] {
  const totals = new Map<string, number>();
  for (const point of series) for (const [name, cost] of Object.entries(point.byService ?? {})) totals.set(name, (totals.get(name) ?? 0) + cost);
  return [...totals.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, keep).map(([name]) => name);
}

export interface StackedDay {
  date: string;
  total: number;
  /** Cost of each key, in the order of the keys given to `stackDay`. */
  parts: number[];
  /** The rest of the day's cost, so `parts` plus `other` equal `total`. */
  other: number;
}

export function stackDay(point: DailyPoint, keys: string[]): StackedDay {
  const parts = keys.map((name) => point.byService?.[name] ?? 0);
  const other = Math.max(0, round2(point.cost - parts.reduce((sum, value) => sum + value, 0)));
  return { date: point.date, total: point.cost, parts, other };
}

export interface RegionRow extends NamedCost {
  /** Share of the total, one decimal; the shares of all rows add up to exactly 100. */
  sharePct: number;
}

export interface RegionSlice extends NamedCost {
  sharePct: number;
  isOther: boolean;
}

export interface RegionSummary {
  /** Every region, most expensive first. */
  rows: RegionRow[];
  total: number;
  /** The donut: the biggest regions and the rest folded into "Other". */
  slices: RegionSlice[];
}

export function summarizeRegions(regions: NamedCost[], donutKeep = 4): RegionSummary {
  const sorted = [...regions].sort((a, b) => b.cost - a.cost || a.name.localeCompare(b.name));
  const shares = sharesOf(sorted.map((region) => region.cost));
  const rows = sorted.map((region, index) => ({ ...region, sharePct: shares[index] }));
  const folded = topWithOther(sorted, donutKeep);
  const sliceShares = sharesOf(folded.map((slice) => slice.cost));
  const slices = folded.map((slice, index) => ({ ...slice, sharePct: sliceShares[index], isOther: sorted.length > donutKeep && index === donutKeep }));
  return { rows, total: round2(sorted.reduce((sum, region) => sum + region.cost, 0)), slices };
}
