import { sharesOf } from '../../../shared/lib/costAnalysis';
import type { AwsCosts, AwsResourceTypeCount, AwsYearlyMonth, CspRecommendation } from './awsTypes';

/** Month-over-month % change; null if there's no comparable prior value. */
export function momPct(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/** Rolls Dec → Jan across the year boundary. */
export function prevMonth(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

export function findYearlyMonth(yearlyData: AwsYearlyMonth[], year: number, month: number): AwsYearlyMonth | undefined {
  return yearlyData.find((m) => m.year === year && m.month === month);
}

const RESOURCE_TYPE_TO_SERVICE: Record<string, string> = {
  ec2instance: 'Amazon EC2',
  ebsvolume: 'Amazon EC2',
  rdsdb: 'Amazon RDS',
  savingsplan: 'AWS Lambda',
};

/** Fuzzy-matches a Maitsys CSP recommendation to a service name, mirroring
 * the reference's `awsSvcSavings` matcher: case-insensitive substring match
 * on `resource_type`. */
export function matchServiceForRecommendation(rec: CspRecommendation): string | null {
  const key = rec.resource_type.toLowerCase();
  for (const [pattern, service] of Object.entries(RESOURCE_TYPE_TO_SERVICE)) {
    if (key.includes(pattern)) return service;
  }
  return null;
}

/** CSP savings attributable to one named service, summed across all
 * recommendations that match it. */
export function cspSavingsByService(recs: CspRecommendation[], serviceName: string): number {
  return recs.filter((r) => matchServiceForRecommendation(r) === serviceName).reduce((sum, r) => sum + r.estimated_savings, 0);
}

/** AWS resource ids have recognizable prefixes (i-/vol-/db-/fn-); anything
 * else (a SavingsPlan recommendation's resource_id is the account id) is
 * account-wide — mirrors the reference's `shortId()` labelling. */
export function isAccountWide(resourceId: string): boolean {
  return !/^(i|vol|db|fn)-/.test(resourceId);
}

export interface AiInsight {
  type: 'warning' | 'success' | 'info';
  title: string;
  detail: string;
}

/**
 * Client-side heuristics, matching the spirit of the reference's AI
 * insights — not an LLM call, just derived rules over numbers already on
 * screen. Same structure as Azure's `buildAiInsights`, with AWS's own
 * default 3.5% CSP rate (vs Azure's 7%).
 */
export function buildAiInsights(costs: AwsCosts, yearlyData: AwsYearlyMonth[], mspRate: number): AiInsight[] {
  const insights: AiInsight[] = [];
  const currentMonth = yearlyData[yearlyData.length - 1];
  const previous = yearlyData[yearlyData.length - 2];

  if (currentMonth && previous) {
    const change = momPct(currentMonth.totalCost, previous.totalCost);
    if (change !== null) {
      insights.push(
        change > 0
          ? { type: 'warning', title: 'Spend trending up', detail: `Total spend is up ${change}% from last month. Consider Reserved Instances or Savings Plans if this is sustained usage.` }
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
    if (fastestGrowth) insights.push({ type: 'warning', title: 'Fastest-growing service', detail: `${fastestGrowth.name} grew ${fastestGrowth.pct}% month-over-month — likely right-sizing or Reserved Instance coverage worth reviewing.` });

    let biggestDrop: { name: string; pct: number } | null = null;
    for (const svc of currentMonth.topServices) {
      const prevSvc = previous.topServices.find((s) => s.name === svc.name);
      if (!prevSvc) continue;
      const pct = momPct(svc.cost, prevSvc.cost);
      if (pct !== null && pct < 0 && (!biggestDrop || pct < biggestDrop.pct)) biggestDrop = { name: svc.name, pct };
    }
    if (biggestDrop) insights.push({ type: 'success', title: 'Biggest cost reduction', detail: `${biggestDrop.name} fell ${Math.abs(biggestDrop.pct)}% month-over-month.` });
  }

  insights.push({ type: 'success', title: 'Maitsys CSP savings', detail: `Maitsys CSP pricing is estimated to save ${Math.round(costs.totalCost * mspRate).toLocaleString()} this month. Annualised: ~${Math.round(costs.totalCost * mspRate * 12).toLocaleString()}.` });

  return insights.slice(0, 6);
}

/** The category an AWS service is reported under in the Service Category Summary. Unknown services are "Other". */
export function awsServiceCategoryOf(serviceName: string): string {
  const name = serviceName.toLowerCase();
  if (/ec2|elastic compute|lambda|workspaces|fargate|\becs\b|\beks\b/.test(name)) return 'Compute';
  if (/rds|dynamodb|aurora|elasticache|redshift|database/.test(name)) return 'Databases';
  if (/\bs3\b|simple storage|\bebs\b|\befs\b|elastic file|glacier|backup/.test(name)) return 'Storage';
  if (/cloudfront|vpc|virtual private|route 53|direct connect|api gateway|load balanc/.test(name)) return 'Networking and delivery';
  if (/waf|guardduty|shield|kms|key management|secrets|inspector|security/.test(name)) return 'Security';
  if (/support|tax|budgets|cost explorer/.test(name)) return 'Support and billing';
  if (/cloudwatch|systems manager|cloudformation|codebuild|amplify|config/.test(name)) return 'Management and developer tools';
  return 'Other';
}

export interface ResourceTypeShare extends AwsResourceTypeCount {
  /** Share of all resources, one decimal; the shares add up to exactly 100. */
  sharePct: number;
}

/** The resource inventory by type, biggest first, with each type's share of the total. */
export function resourceTypeShares(byType: AwsResourceTypeCount[]): ResourceTypeShare[] {
  const sorted = [...byType].sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
  const shares = sharesOf(sorted.map((type) => type.count));
  return sorted.map((type, index) => ({ ...type, sharePct: shares[index] }));
}
