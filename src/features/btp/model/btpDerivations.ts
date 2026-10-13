import type { BtpCosts, BtpDirectory, BtpNamedCost, BtpSubaccount, BtpYearlyMonth } from './btpTypes';

export function momPct(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/** SAP region codes → human names. BTP-specific: CIS returns raw region
 * codes, not display names, unlike Azure/AWS/GCP's own APIs. */
export const BTP_REGION_NAMES: Record<string, string> = {
  us10: 'US East (VA)', us20: 'US West (CA)', us21: 'US East (Ashburn)', us30: 'Canada (Montreal)',
  eu10: 'Europe (Frankfurt)', eu11: 'Europe (Amsterdam)', eu20: 'Europe (Zurich)', eu30: 'Europe (Frankfurt, gov)',
  ap10: 'Asia Pacific (Singapore)', ap11: 'Asia Pacific (Sydney)', ap12: 'Asia Pacific (Singapore, 2)', ap20: 'Asia Pacific (Osaka)', ap21: 'Asia Pacific (Seoul)',
  jp10: 'Japan (Tokyo)', jp20: 'Japan (Osaka)', ca10: 'Canada (Toronto)', br10: 'Brazil (Sao Paulo)',
  in30: 'India (Mumbai)', il30: 'Israel (Tel Aviv)', ae1: 'UAE (Dubai)', ch20: 'Switzerland (Zurich)', sa30: 'Saudi Arabia (Riyadh)',
};

export function btpRegionLabel(code: string): string {
  return BTP_REGION_NAMES[code] ?? code;
}

export interface DirectoryWithCost extends BtpDirectory {
  subaccounts: BtpSubaccount[];
  cost: number;
}

/** Resolves each directory's member subaccounts + total cost from the
 * already-merged `subaccountHierarchy` — the join itself already happened
 * server-side (mockBtpData.ts), so this is just a group-by, not the
 * reference's fragile name-matching. */
export function directoriesWithCosts(costs: BtpCosts): DirectoryWithCost[] {
  return costs.directories.map((dir) => {
    const subs = costs.subaccountHierarchy.filter((s) => s.directoryGuid === dir.guid);
    return { ...dir, subaccounts: subs, cost: subs.reduce((sum, s) => sum + s.cost, 0) };
  });
}

/** Subaccounts with no directory — the reference's "Direct Sub-Accounts -
 * No Directory" list. */
export function orphanSubaccounts(costs: BtpCosts): BtpSubaccount[] {
  return costs.subaccountHierarchy.filter((s) => s.directoryGuid === null);
}

export function regionBreakdown(costs: BtpCosts): BtpNamedCost[] {
  const totals = new Map<string, number>();
  costs.subaccountHierarchy.forEach((s) => totals.set(s.region, (totals.get(s.region) ?? 0) + s.cost));
  return [...totals.entries()].map(([name, cost]) => ({ name, cost })).sort((a, b) => b.cost - a.cost);
}

export interface HealthScoreResult {
  score: number;
  label: 'Healthy' | 'Monitor' | 'Action Needed';
  color: 'success' | 'warning' | 'danger';
}

export function computeHealthScore(momChange: number | null, projected: number, totalCost: number, topServiceShare: number): HealthScoreResult {
  let score = 80;
  if (momChange !== null) {
    if (momChange > 30) score -= 20;
    else if (momChange > 15) score -= 10;
    else if (momChange < -5) score += 10;
  }
  if (totalCost > 0 && projected > totalCost * 1.4) score -= 15;
  if (topServiceShare > 60) score -= 10;
  score = Math.max(0, Math.min(100, score));
  const label = score >= 80 ? 'Healthy' : score >= 60 ? 'Monitor' : 'Action Needed';
  const color = score >= 80 ? 'success' : score >= 60 ? 'warning' : 'danger';
  return { score, label, color };
}

export interface AiInsight {
  type: 'warning' | 'success' | 'info';
  title: string;
  detail: string;
}

export function buildAiInsights(costs: BtpCosts, yearlyData: BtpYearlyMonth[], mspRate: number): AiInsight[] {
  const insights: AiInsight[] = [];
  const current = yearlyData[yearlyData.length - 1];
  const previous = yearlyData[yearlyData.length - 2];
  const momChange = current && previous ? momPct(current.totalCost, previous.totalCost) : null;

  if (momChange !== null) {
    insights.push(
      momChange > 15
        ? { type: 'warning', title: 'Spend trending up', detail: `Total spend is up ${momChange}% from last month.` }
        : momChange < -5
          ? { type: 'success', title: 'Spend trending down', detail: `Total spend is down ${Math.abs(momChange)}% from last month.` }
          : { type: 'info', title: 'Spend steady', detail: `Total spend changed ${momChange}% from last month.` },
    );
  }

  const topService = [...costs.services].sort((a, b) => b.cost - a.cost)[0];
  if (topService && costs.totalCost > 0) {
    const share = (topService.cost / costs.totalCost) * 100;
    if (share > 50) insights.push({ type: 'warning', title: 'Service concentration', detail: `${topService.name} is ${share.toFixed(0)}% of spend.` });
  }

  const dirs = directoriesWithCosts(costs);
  const topDir = [...dirs].sort((a, b) => b.cost - a.cost)[0];
  if (topDir && costs.totalCost > 0) {
    insights.push({ type: 'info', title: 'Top directory', detail: `${topDir.displayName} accounts for ${((topDir.cost / costs.totalCost) * 100).toFixed(1)}% of spend.` });
  }

  const eomForecast = costs.forecastData[0]?.projected_cost;
  if (eomForecast && eomForecast > costs.totalCost * 1.3) {
    insights.push({ type: 'warning', title: 'Forecast trending high', detail: `Projected month-end spend is ${(((eomForecast - costs.totalCost) / costs.totalCost) * 100).toFixed(0)}% above Month-to-Date.` });
  }

  const mspSavings = costs.totalCost * mspRate;
  if (mspSavings > 0) {
    insights.push({ type: 'success', title: 'Maitsys CSP savings', detail: `Maitsys CSP saves ${formatCurrency(mspSavings, costs.currency)} this month — ${(mspRate * 100).toFixed(1)}% discount on ${formatCurrency(costs.totalCost, costs.currency)} BTP spend.` });
  }

  return insights.slice(0, 5);
}

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
}
