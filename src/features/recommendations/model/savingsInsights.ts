import type { CloudProviderId, MonthlyProviderCost, OpportunityArea, OptimizationOpportunity, SavingsRealisationPoint } from '../../../data-access';
import { MSP_RATES, type ProviderFilter, type RecommendationsView } from './recommendationsDerivations';
import type { SavingsCategory } from './recommendationsTypes';

/** The slice of the opportunity store this feature reads: which opportunities a person dismissed. */
export type OpportunityStates = Record<string, { status: 'Open' | 'In review' | 'Dismissed' } | undefined>;

export const PROVIDER_NAMES: Record<CloudProviderId, string> = { azure: 'Azure', aws: 'AWS', btp: 'SAP BTP', gcp: 'Google Cloud' };

/* ---- Recalculate -------------------------------------------------------------------------- */

/**
 * The deterministic "nudge" a simulated recalculation applies to optimisation estimates: 1 before the
 * first recalculation, then a repeatable value within +/-1.25% of it for the n-th one. (A real
 * recalculation would re-read the advisors; the sample data has nothing new to read.)
 */
export function recalcFactor(count: number): number {
  if (count <= 0) return 1;
  return 1 + (((count * 37) % 11) - 5) / 400;
}

const money = (n: number) => Math.round(n * 100) / 100;

function scaleCategory(category: SavingsCategory, factor: number): SavingsCategory {
  return { ...category, amount: money(category.amount * factor), percentageOfAnnual: category.percentageOfAnnual * factor };
}

/**
 * Applies a recalculation factor to the optimisation estimates of a savings view. Maitsys MSP discounts
 * are contractual (rate x spend) and are never nudged.
 */
export function applyRecalculation(view: RecommendationsView, factor: number): RecommendationsView {
  if (factor === 1) return view;
  const baseOptimisation = view.isBtpOnly ? view.btpOptTotal : view.optTotal;
  const totalSavings = money(view.totalSavings - baseOptimisation + baseOptimisation * factor);
  return {
    ...view,
    optTotal: money(view.optTotal * factor),
    btpOptTotal: money(view.btpOptTotal * factor),
    totalSavings,
    savingsPct: view.totalSavings > 0 ? view.savingsPct * (totalSavings / view.totalSavings) : view.savingsPct,
    optimizationCategories: view.optimizationCategories.map((c) => scaleCategory(c, factor)),
    btpOptCategories: view.btpOptCategories.map((c) => scaleCategory(c, factor)),
    donutData: view.donutData,
    topRecommendations: view.topRecommendations,
  };
}

/* ---- Opportunities, filtered ---------------------------------------------------------------- */

export interface VisibleOpportunities {
  /** Not dismissed, for the chosen provider, and one the person may see. */
  active: OptimizationOpportunity[];
  /** `active` without recommendations that cover the same spend as another active one (no double counting). */
  countable: OptimizationOpportunity[];
}

export function visibleOpportunities(
  opportunities: OptimizationOpportunity[],
  states: OpportunityStates,
  provider: ProviderFilter,
  allowedProviders: CloudProviderId[],
): VisibleOpportunities {
  const active = opportunities.filter(
    (o) => allowedProviders.includes(o.provider) && (provider === '' || o.provider === provider) && (states[o.id]?.status ?? 'Open') !== 'Dismissed',
  );
  const countable = active.filter((o) => !o.overlapsWith || !active.some((other) => other.id === o.overlapsWith));
  return { active, countable };
}

export interface AreaSaving {
  area: OpportunityArea | 'Other areas';
  saving: number;
  count: number;
}

/** Monthly saving per area (compute, storage, network, database, reservations, platform), biggest first. */
export function savingsByArea(opportunities: OptimizationOpportunity[]): AreaSaving[] {
  const totals = new Map<OpportunityArea, AreaSaving>();
  for (const o of opportunities) {
    const entry = totals.get(o.area) ?? { area: o.area, saving: 0, count: 0 };
    entry.saving = money(entry.saving + o.monthlySaving);
    entry.count += 1;
    totals.set(o.area, entry);
  }
  return [...totals.values()].sort((a, b) => b.saving - a.saving);
}

/** A donut reads best with few parts: keep the biggest `max - 1` areas and fold the rest into "Other areas". */
export function groupSmallAreas(areas: AreaSaving[], max = 5): AreaSaving[] {
  if (areas.length <= max) return areas;
  const kept = areas.slice(0, max - 1);
  const rest = areas.slice(max - 1);
  return [...kept, { area: 'Other areas', saving: money(rest.reduce((s, a) => s + a.saving, 0)), count: rest.reduce((s, a) => s + a.count, 0) }];
}

export interface ProviderSaving {
  provider: CloudProviderId;
  saving: number;
  count: number;
}

export function savingsByProvider(opportunities: OptimizationOpportunity[]): ProviderSaving[] {
  const totals = new Map<CloudProviderId, ProviderSaving>();
  for (const o of opportunities) {
    const entry = totals.get(o.provider) ?? { provider: o.provider, saving: 0, count: 0 };
    entry.saving = money(entry.saving + o.monthlySaving);
    entry.count += 1;
    totals.set(o.provider, entry);
  }
  return [...totals.values()].sort((a, b) => b.saving - a.saving);
}

/** The `limit` opportunities with the biggest monthly saving, ties broken by title so the order is stable. */
export function topRecommendationsOf(opportunities: OptimizationOpportunity[], limit = 5): OptimizationOpportunity[] {
  return [...opportunities].sort((a, b) => b.monthlySaving - a.monthlySaving || a.title.localeCompare(b.title)).slice(0, limit);
}

/* ---- Maitsys MSP panel ----------------------------------------------------------------------- */

export interface MspRow {
  provider: CloudProviderId;
  label: string;
  /** 0.07 = 7%. */
  rate: number;
  spend: number;
  saving: number;
}

/** One row per provider in scope: its contracted discount rate, this month's spend and the saving. */
export function mspRowsOf(effectiveSpend: Record<CloudProviderId, number>, provider: ProviderFilter): MspRow[] {
  return (['azure', 'aws', 'btp', 'gcp'] as CloudProviderId[])
    .filter((p) => provider === '' || provider === p)
    .map((p) => ({ provider: p, label: PROVIDER_NAMES[p], rate: MSP_RATES[p], spend: effectiveSpend[p], saving: money(effectiveSpend[p] * MSP_RATES[p]) }));
}

/* ---- Savings trend --------------------------------------------------------------------------- */

export type TrendRange = '6M' | '12M' | 'YTD';

export interface SavingsTrendPoint {
  /** "YYYY-MM". */
  month: string;
  /** Maitsys MSP discount plus all identified optimisation savings. */
  potential: number;
  /** The MSP discount plus the share of the optimisation savings that had been applied. */
  realised: number;
}

/**
 * Potential versus realised savings by month for the chosen providers. Spend per month comes from the
 * cost analytics; the latest month is pinned to the savings view on screen (so the chart's last bar
 * equals the KPI), earlier months scale that effective rate by their spend. MSP discount is spend x
 * the contracted rate and is always realised; the applied share of the optimisation part comes from
 * `realisation`.
 */
export function savingsTrendOf(params: {
  monthly: MonthlyProviderCost[];
  realisation: SavingsRealisationPoint[];
  provider: ProviderFilter;
  range: TrendRange;
  /** Total potential saving this month for the provider filter (the savings view's total). */
  currentPotential: number;
}): SavingsTrendPoint[] {
  const { monthly, realisation, provider, range, currentPotential } = params;
  const rows = monthly.filter((m) => provider === '' || m.provider === provider);
  const months = [...new Set(rows.map((m) => m.month))].sort();
  if (months.length === 0) return [];
  const latest = months[months.length - 1];

  const spendOf = (month: string) => rows.filter((m) => m.month === month).reduce((s, m) => s + m.cost, 0);
  const mspOf = (month: string) => rows.filter((m) => m.month === month).reduce((s, m) => s + m.cost * MSP_RATES[m.provider], 0);
  const latestSpend = spendOf(latest);
  const effectiveRate = latestSpend > 0 ? currentPotential / latestSpend : 0;

  const wanted = range === 'YTD' ? months.filter((m) => m.slice(0, 4) === latest.slice(0, 4)) : months.slice(-(range === '6M' ? 6 : 12));
  return wanted.map((month) => {
    const potential = month === latest ? currentPotential : spendOf(month) * effectiveRate;
    const msp = Math.min(mspOf(month), potential);
    const applied = realisation.find((r) => r.month === month)?.appliedShare ?? 0;
    return { month, potential: money(potential), realised: money(msp + (potential - msp) * applied) };
  });
}
