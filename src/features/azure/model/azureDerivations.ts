import type { AzureCosts, AzureYearlyMonth, CspRecommendation } from './azureTypes';

/** Month-over-month % change; null if there's no comparable prior value. */
export function momPct(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/** Rolls Dec → Jan across the year boundary, matching the reference's
 * `azurePrevMonth` helper. */
export function prevMonth(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

export function findYearlyMonth(yearlyData: AzureYearlyMonth[], year: number, month: number): AzureYearlyMonth | undefined {
  return yearlyData.find((m) => m.year === year && m.month === month);
}

const RESOURCE_TYPE_KEYWORDS: Array<[RegExp, string]> = [
  [/virtualmachine/i, 'Virtual Machines'],
  [/storage/i, 'Storage Accounts'],
  [/sql|database/i, 'SQL Database'],
  [/redis/i, 'Redis Cache'],
  [/cosmos/i, 'Cosmos DB'],
  [/appservice/i, 'App Service'],
];

/** Fuzzy-matches a Maitsys CSP recommendation to a service name, mirroring
 * the reference's `azureSvcSavings` matcher: prefer `resource_type`, fall
 * back to keyword-sniffing the description for subscription-wide recs. */
export function matchServiceForRecommendation(rec: CspRecommendation): string | null {
  for (const [pattern, service] of RESOURCE_TYPE_KEYWORDS) {
    if (pattern.test(rec.resource_type)) return service;
  }
  for (const [pattern, service] of RESOURCE_TYPE_KEYWORDS) {
    if (pattern.test(rec.description)) return service;
  }
  return null;
}

/** CSP savings attributable to one named service, summed across all
 * recommendations that match it. */
export function cspSavingsByService(recs: CspRecommendation[], serviceName: string): number {
  return recs.filter((r) => matchServiceForRecommendation(r) === serviceName).reduce((sum, r) => sum + r.estimated_savings, 0);
}

/** A bare UUID at the end of a resource id path is subscription-wide, not a
 * specific resource — matches the reference's `shortId()` labelling. */
export function isSubscriptionWide(resourceId: string): boolean {
  return /\/[0-9a-fA-F-]{36}$/.test(resourceId) && !/providers\//i.test(resourceId.split('/').slice(-2).join('/'));
}

export interface AiInsight {
  type: 'warning' | 'success' | 'info';
  title: string;
  detail: string;
}

/**
 * Client-side heuristics, matching the reference's `azureAiInsights` — not
 * an LLM call, just derived rules over the same numbers already on screen.
 */
export function buildAiInsights(costs: AzureCosts, yearlyData: AzureYearlyMonth[], mspRate: number): AiInsight[] {
  const insights: AiInsight[] = [];
  const currentMonth = yearlyData[yearlyData.length - 1];
  const previous = yearlyData[yearlyData.length - 2];

  if (currentMonth && previous) {
    const change = momPct(currentMonth.totalCost, previous.totalCost);
    if (change !== null) {
      insights.push(
        change > 0
          ? { type: 'warning', title: 'Spend trending up', detail: `Total spend is up ${change}% from last month.` }
          : { type: 'success', title: 'Spend trending down', detail: `Total spend is down ${Math.abs(change)}% from last month.` },
      );
    }
  }

  const sortedServices = [...costs.services].sort((a, b) => b.cost - a.cost);
  const topService = sortedServices[0];
  if (topService) {
    const share = Math.round((topService.cost / costs.totalCost) * 1000) / 10;
    insights.push({ type: 'info', title: 'Top cost driver', detail: `${topService.name} accounts for ${share}% of this month's spend.` });
  }

  if (currentMonth && previous) {
    let fastestGrowth: { name: string; pct: number } | null = null;
    for (const svc of currentMonth.topServices) {
      const prevSvc = previous.topServices.find((s) => s.name === svc.name);
      if (!prevSvc) continue;
      const pct = momPct(svc.cost, prevSvc.cost);
      if (pct !== null && pct > 10 && (!fastestGrowth || pct > fastestGrowth.pct)) fastestGrowth = { name: svc.name, pct };
    }
    if (fastestGrowth) insights.push({ type: 'warning', title: 'Fastest-growing service', detail: `${fastestGrowth.name} grew ${fastestGrowth.pct}% month-over-month.` });

    let biggestDrop: { name: string; pct: number } | null = null;
    for (const svc of currentMonth.topServices) {
      const prevSvc = previous.topServices.find((s) => s.name === svc.name);
      if (!prevSvc) continue;
      const pct = momPct(svc.cost, prevSvc.cost);
      if (pct !== null && pct < 0 && (!biggestDrop || pct < biggestDrop.pct)) biggestDrop = { name: svc.name, pct };
    }
    if (biggestDrop) insights.push({ type: 'success', title: 'Biggest cost reduction', detail: `${biggestDrop.name} fell ${Math.abs(biggestDrop.pct)}% month-over-month.` });
  }

  insights.push({ type: 'success', title: 'Maitsys CSP savings', detail: `Maitsys CSP pricing is estimated to save ${Math.round(costs.totalCost * mspRate).toLocaleString()} this month.` });

  return insights.slice(0, 6);
}
