import { forecastEomOf, monthlyTrendOf, type DashboardData } from '../../dashboard';

type Summary = DashboardData['summary']['data'];

export interface BudgetSuggestion {
  /** A name that no existing budget uses. */
  name: string;
  /** A monthly limit with a little headroom over what the organisation spends; null when there is no spend history yet. */
  amount: number | null;
  /** Where the limit comes from, in plain words, e.g. "End-of-month forecast of $17,400 plus 10% headroom". */
  basis: string | null;
}

export const SUGGESTED_BASE_NAME = 'Monthly cloud budget';
const HEADROOM = 0.1;
const TREND_MONTHS = 3;

const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

/** Rounds up to a figure a person would type: the step grows with the size of the limit. */
export function roundLimitUp(value: number): number {
  const step = value >= 100_000 ? 5_000 : value >= 10_000 ? 500 : value >= 1_000 ? 100 : 10;
  return Math.ceil(value / step) * step;
}

/** "Monthly cloud budget", or the first of "Monthly cloud budget 2", "... 3" that is free. */
export function freeBudgetName(existing: string[], base = SUGGESTED_BASE_NAME): string {
  const taken = new Set(existing.map((name) => name.trim().toLowerCase()));
  if (!taken.has(base.toLowerCase())) return base;
  for (let n = 2; ; n += 1) {
    const candidate = `${base} ${n}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
}

/**
 * Suggests the first budget a person would create: an organisation-wide monthly limit set a tenth above the
 * end-of-month forecast, or above the average of the last three months when there is no forecast.
 */
export function suggestBudget(summary: Summary, existingNames: string[]): BudgetSuggestion {
  const name = freeBudgetName(existingNames);
  const forecast = forecastEomOf(summary);
  if (forecast !== null && forecast > 0) {
    return { name, amount: roundLimitUp(forecast * (1 + HEADROOM)), basis: `End-of-month forecast of ${money(forecast)} plus 10% headroom` };
  }
  const recent = monthlyTrendOf(summary).slice(-TREND_MONTHS).map((point) => point.amount).filter((amount) => amount > 0);
  if (recent.length > 0) {
    const average = recent.reduce((sum, amount) => sum + amount, 0) / recent.length;
    return { name, amount: roundLimitUp(average * (1 + HEADROOM)), basis: `Average of the last ${recent.length} ${recent.length === 1 ? 'month' : 'months'} (${money(average)}) plus 10% headroom` };
  }
  return { name, amount: null, basis: null };
}
