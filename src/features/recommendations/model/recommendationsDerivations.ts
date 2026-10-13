import { MOCK_AZURE_CSP_RECOMMENDATIONS, MOCK_AZURE_FULL } from '../../../demo/azure/mockAzureData';
import { MOCK_AWS_CSP_RECOMMENDATIONS, MOCK_AWS_FULL } from '../../../demo/aws/mockAwsData';
import { MOCK_BTP_COSTS } from '../../../demo/btp/mockBtpData';
import { MOCK_GCP_COSTS } from '../../../demo/gcp/mockGcpData';
import type { CombinedRecommendation, DonutSlice, SavingsCategory, TopRecommendation } from './recommendationsTypes';

/** Maitsys's own contracted MSP/CSP discount rate per provider — same
 * values already used as each provider's own cost-page default. */
export const MSP_RATES = { azure: 0.07, aws: 0.035, btp: 0.02, gcp: 0.02 };

/** Maitsys optimization-savings rates, applied to current spend — ported
 * verbatim from the reference's `OPT_RATES` (these do NOT apply to BTP,
 * which has its own data-driven savings model below). */
const OPT_RATES = { ri: 0.15, unused: 0.08, orphaned: 0.02, idle: 0.01, others: 0.04 };

export type ProviderFilter = '' | 'azure' | 'aws' | 'btp' | 'gcp';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function combinedRecommendations(): CombinedRecommendation[] {
  return [
    ...MOCK_AZURE_CSP_RECOMMENDATIONS.map((r) => ({ id: r.id, provider: 'azure' as const, action: r.action, description: r.description, estimated_savings: r.estimated_savings })),
    ...MOCK_AWS_CSP_RECOMMENDATIONS.map((r) => ({ id: r.id, provider: 'aws' as const, action: r.action, description: r.description, estimated_savings: r.estimated_savings })),
  ];
}

/** Keyword-based categorization, ported verbatim from the reference's own
 * `recs.forEach` classifier in RecommendationsPage.jsx. */
function categorize(recs: CombinedRecommendation[]) {
  const buckets = { ri: [] as CombinedRecommendation[], unused: [] as CombinedRecommendation[], orphaned: [] as CombinedRecommendation[], idle: [] as CombinedRecommendation[], others: [] as CombinedRecommendation[] };
  recs.forEach((r) => {
    const text = `${r.action} ${r.description}`.toLowerCase();
    if (text.includes('reserved instance') || text.includes('reservation') || text.includes('savings plan') || text.includes('purchase')) buckets.ri.push(r);
    else if (text.includes('rightsize') || text.includes('right-size') || text.includes('right size') || text.includes('shut down') || text.includes('stop') || text.includes('unused') || text.includes('underutilized')) buckets.unused.push(r);
    else if ((text.includes('disk') || text.includes('snapshot') || text.includes('volume')) && (text.includes('delete') || text.includes('remove') || text.includes('unattached') || text.includes('orphaned'))) buckets.orphaned.push(r);
    else if (text.includes('ip') && (text.includes('idle') || text.includes('unassociated'))) buckets.idle.push(r);
    else buckets.others.push(r);
  });
  return buckets;
}

export interface RecommendationsView {
  totalCurrent: number;
  effectiveSpend: Record<'azure' | 'aws' | 'btp' | 'gcp', number>;
  isBtpOnly: boolean;
  showTaxCards: boolean;
  preTax: number | null;
  salesTax: number | null;
  optTotal: number;
  cspTotal: number;
  btpOptTotal: number;
  totalSavings: number;
  savingsPct: number;
  optimizationCategories: SavingsCategory[];
  cspCategories: SavingsCategory[];
  btpOptCategories: SavingsCategory[];
  donutData: DonutSlice[];
  topRecommendations: TopRecommendation[];
}

/** Full port of the reference's savings-calculation pipeline — the same
 * business logic (OPT_RATES applied to total spend, per-provider MSP
 * rates applied to per-provider spend, BTP's own data-driven savings
 * model) regardless of which provider filter is active. */
export function buildRecommendationsView(providerFilter: ProviderFilter): RecommendationsView {
  const azureSpend = MOCK_AZURE_FULL.costs.totalCost;
  const awsSpend = MOCK_AWS_FULL.costs.totalCost;
  const btpSpend = MOCK_BTP_COSTS.totalCost;
  const gcpSpend = MOCK_GCP_COSTS.totalCost;

  const effectiveSpend = {
    azure: providerFilter && providerFilter !== 'azure' ? 0 : azureSpend,
    aws: providerFilter && providerFilter !== 'aws' ? 0 : awsSpend,
    btp: providerFilter && providerFilter !== 'btp' ? 0 : btpSpend,
    gcp: providerFilter && providerFilter !== 'gcp' ? 0 : gcpSpend,
  };

  let totalCurrent = azureSpend + awsSpend + btpSpend + gcpSpend;
  if (providerFilter === 'azure') totalCurrent = azureSpend;
  else if (providerFilter === 'aws') totalCurrent = awsSpend;
  else if (providerFilter === 'btp') totalCurrent = btpSpend;
  else if (providerFilter === 'gcp') totalCurrent = gcpSpend;

  const isBtpOnly = providerFilter === 'btp';
  const useOptModel = providerFilter !== 'btp';
  const annualisedCost = totalCurrent * 12;
  const pctOfAnnual = (val: number) => (annualisedCost > 0 ? Math.min((val / annualisedCost) * 100, 100) : 0);

  const riSavings = useOptModel ? totalCurrent * OPT_RATES.ri : 0;
  const unusedRes = useOptModel ? totalCurrent * OPT_RATES.unused : 0;
  const orphanedDisks = useOptModel ? totalCurrent * OPT_RATES.orphaned : 0;
  const idleIps = useOptModel ? totalCurrent * OPT_RATES.idle : 0;
  const others = useOptModel ? totalCurrent * OPT_RATES.others : 0;
  const optTotal = riSavings + unusedRes + orphanedDisks + idleIps + others;

  const cspAzure = effectiveSpend.azure * MSP_RATES.azure;
  const cspAws = effectiveSpend.aws * MSP_RATES.aws;
  const cspBtp = effectiveSpend.btp * MSP_RATES.btp;
  const cspGcp = effectiveSpend.gcp * MSP_RATES.gcp;
  const cspTotal = cspAzure + cspAws + cspBtp + cspGcp;

  const recs = combinedRecommendations().filter((r) => !providerFilter || r.provider === providerFilter);
  const buckets = categorize(recs);

  // BTP-specific, data-driven savings model (CPEA / plan optimisation /
  // unused instances / subaccount consolidation) — ported verbatim.
  const btpCpeaSavings = isBtpOnly ? effectiveSpend.btp * 0.1 : 0;
  const allBtpServices = MOCK_BTP_COSTS.servicesBySubaccount.flatMap((s) => s.services);
  const PAID_PLAN_KEYWORDS = ['enterprise', 'standard', 'application', 'service', 'default'];
  const FREE_ELIGIBLE_SERVICES = ['alert notification', 'application autoscaler', 'feature flags', 'connectivity', 'destination', 'html5 application repository', 'document management', 'workflow management'];
  const downgradableCost = allBtpServices
    .filter((svc) => {
      const plan = (svc.planName ?? '').toLowerCase();
      const name = svc.name.toLowerCase();
      return PAID_PLAN_KEYWORDS.some((k) => plan.includes(k)) && FREE_ELIGIBLE_SERVICES.some((s) => name.includes(s));
    })
    .reduce((sum, svc) => sum + svc.cost, 0);
  const btpPlanSavings = isBtpOnly ? (downgradableCost > 0 ? downgradableCost * 0.6 : effectiveSpend.btp * 0.04) : 0;

  const unusedBtpCost = allBtpServices.filter((svc) => svc.cost > 0 && svc.usage < 0.5).reduce((sum, svc) => sum + svc.cost, 0);
  const btpUnusedSavings = isBtpOnly ? (unusedBtpCost > 0 ? unusedBtpCost * 0.8 : effectiveSpend.btp * 0.03) : 0;

  const fragSubs = MOCK_BTP_COSTS.subaccounts.filter((s) => s.cost > 0 && effectiveSpend.btp > 0 && s.cost / effectiveSpend.btp < 0.05);
  const btpConsolidationSavings = isBtpOnly && fragSubs.length > 1 ? fragSubs.reduce((sum, s) => sum + s.cost, 0) * 0.15 : 0;
  const btpOptTotal = btpCpeaSavings + btpPlanSavings + btpUnusedSavings + btpConsolidationSavings;

  const totalSavings = isBtpOnly ? btpOptTotal + cspBtp : optTotal + cspTotal;
  const savingsPct = annualisedCost > 0 ? Math.min((totalSavings / annualisedCost) * 100, 100) : 0;

  const showTaxCards = !isBtpOnly && providerFilter !== 'gcp';
  const preTax = showTaxCards ? totalCurrent * 0.977 : null;
  const salesTax = showTaxCards ? totalCurrent * 0.023 : null;

  const optimizationCategories: SavingsCategory[] = [
    { key: 'ri', label: 'RI & Savings Plan Opportunities (15%)', description: 'Convert eligible resources to RI / Savings Plans', hint: `Maitsys estimates 15% of your spend (${formatCurrency(totalCurrent)}) can be saved by committing steady-state workloads to Reserved Instances or Savings Plans — on your current run-rate that's ${formatCurrency(riSavings)}/month.`, amount: riSavings, percentageOfAnnual: pctOfAnnual(riSavings), recommendations: buckets.ri },
    { key: 'unused', label: 'Unused / Underutilized Resources (8%)', description: 'Right-size or remove over-provisioned resources', hint: `Maitsys benchmarks show ~8% of cloud spend is wasted on idle or oversized instances — ${formatCurrency(unusedRes)}/month on your current spend.`, amount: unusedRes, percentageOfAnnual: pctOfAnnual(unusedRes), recommendations: buckets.unused },
    { key: 'idle', label: 'Idle Public IP Addresses (1%)', description: 'Remove unassociated public IPs', hint: `Unattached public IPs accrue charges hourly — Maitsys estimates ~1% of spend (${formatCurrency(idleIps)}/month) is recoverable.`, amount: idleIps, percentageOfAnnual: pctOfAnnual(idleIps), recommendations: buckets.idle },
    { key: 'orphaned', label: 'Orphaned Disks & Snapshots (2%)', description: 'Remove unattached disks and stale snapshots', hint: `Disks/snapshots left behind after resource deletion silently accumulate costs — ~2% of spend (${formatCurrency(orphanedDisks)}/month) is recoverable.`, amount: orphanedDisks, percentageOfAnnual: pctOfAnnual(orphanedDisks), recommendations: buckets.orphaned },
    { key: 'others', label: 'Other Optimization Opportunities (4%)', description: 'Storage tiering, auto-scaling, lifecycle policies', hint: `An additional ~4% (${formatCurrency(others)}/month) is achievable through storage lifecycle policies and auto-scaling.`, amount: others, percentageOfAnnual: pctOfAnnual(others), recommendations: buckets.others },
  ].filter((c) => c.amount > 0);

  const cspCategories: SavingsCategory[] = [
    { key: 'azure', label: `Azure Maitsys MSP Discount (${(MSP_RATES.azure * 100).toFixed(1)}%)`, description: `${(MSP_RATES.azure * 100).toFixed(1)}% pricing advantage on Azure spend via Maitsys CSP`, hint: `Maitsys' Microsoft CSP partnership provides a contracted ${(MSP_RATES.azure * 100).toFixed(1)}% discount on Azure consumption — ${formatCurrency(cspAzure)} this month on ${formatCurrency(effectiveSpend.azure)} of Azure spend.`, amount: cspAzure, percentageOfAnnual: pctOfAnnual(cspAzure), recommendations: [] },
    { key: 'aws', label: `AWS Maitsys Partner Discount (${(MSP_RATES.aws * 100).toFixed(1)}%)`, description: `${(MSP_RATES.aws * 100).toFixed(1)}% pricing advantage on AWS spend via Maitsys`, hint: `Maitsys' AWS Partner Network status delivers a ${(MSP_RATES.aws * 100).toFixed(1)}% discount — ${formatCurrency(cspAws)} this month on ${formatCurrency(effectiveSpend.aws)} of AWS spend.`, amount: cspAws, percentageOfAnnual: pctOfAnnual(cspAws), recommendations: [] },
    { key: 'btp', label: `SAP BTP / Commitment Benefit (${(MSP_RATES.btp * 100).toFixed(1)}%)`, description: `${(MSP_RATES.btp * 100).toFixed(1)}% advantage on BTP & commitment-based billing`, hint: `Maitsys' SAP partnership provides a ${(MSP_RATES.btp * 100).toFixed(1)}% reduction on SAP BTP consumption.`, amount: cspBtp, percentageOfAnnual: pctOfAnnual(cspBtp), recommendations: [] },
    { key: 'gcp', label: `Google Cloud Partner Discount (${(MSP_RATES.gcp * 100).toFixed(1)}%)`, description: `${(MSP_RATES.gcp * 100).toFixed(1)}% pricing advantage on GCP spend via Maitsys`, hint: `Maitsys' Google Cloud Partner status delivers a ${(MSP_RATES.gcp * 100).toFixed(1)}% discount — ${formatCurrency(cspGcp)} this month on ${formatCurrency(effectiveSpend.gcp)} of GCP spend.`, amount: cspGcp, percentageOfAnnual: pctOfAnnual(cspGcp), recommendations: [] },
  ].filter((c) => (providerFilter ? c.key === providerFilter : c.amount > 0));

  const btpOptCategories: SavingsCategory[] = [
    { key: 'cpea', label: 'CPEA Commitment Model (10%)', description: 'Switch from PAYG to CPEA for ~10% lower consumption cost', hint: `SAP BTP's Cloud Platform Enterprise Agreement provides ~10% cost reduction vs Pay-As-You-Go — ${formatCurrency(btpCpeaSavings)}/month on your current BTP spend.`, amount: btpCpeaSavings, percentageOfAnnual: pctOfAnnual(btpCpeaSavings), recommendations: [] },
    { key: 'plan', label: 'Service Plan Optimisation', description: 'Downgrade eligible services to free-tier or lower-cost plans', hint: downgradableCost > 0 ? `Services detected on paid plans with free-tier alternatives — switching saves ${formatCurrency(btpPlanSavings)}/month.` : `Maitsys estimates ~4% of BTP spend (${formatCurrency(btpPlanSavings)}) is saveable by reviewing service plans.`, amount: btpPlanSavings, percentageOfAnnual: pctOfAnnual(btpPlanSavings), recommendations: [] },
    { key: 'unused', label: 'Unused Service Instances', description: 'Remove provisioned instances with zero or near-zero usage', hint: unusedBtpCost > 0 ? `Service instances incurring cost with minimal usage — deprovisioning saves ${formatCurrency(btpUnusedSavings)}/month.` : `Review BTP service instances for unused test provisioning — est. ${formatCurrency(btpUnusedSavings)}/month.`, amount: btpUnusedSavings, percentageOfAnnual: pctOfAnnual(btpUnusedSavings), recommendations: [] },
    ...(btpConsolidationSavings > 0 ? [{ key: 'consolidation', label: `Subaccount Consolidation (${fragSubs.length} small accounts)`, description: `${fragSubs.length} subaccounts each under 5% of total spend`, hint: `Subaccounts ${fragSubs.map((s) => s.name).join(', ')} each represent under 5% of total BTP spend — consolidating saves ${formatCurrency(btpConsolidationSavings)}/month.`, amount: btpConsolidationSavings, percentageOfAnnual: pctOfAnnual(btpConsolidationSavings), recommendations: [] }] : []),
  ].filter((c) => c.amount > 0);

  const donutData: DonutSlice[] = isBtpOnly
    ? [
      { name: 'CPEA Commitment', value: btpCpeaSavings },
      { name: 'Plan Optimisation', value: btpPlanSavings },
      { name: 'Unused Instances', value: btpUnusedSavings },
      { name: 'Subaccount Consolidation', value: btpConsolidationSavings },
      { name: `Maitsys MSP (${(MSP_RATES.btp * 100).toFixed(0)}%)`, value: cspBtp },
    ].filter((d) => d.value > 0)
    : [
      { name: 'RI & Savings Plan', value: riSavings },
      { name: 'Unused Resources', value: unusedRes },
      { name: 'Orphaned Disks', value: orphanedDisks },
      { name: 'Idle IPs', value: idleIps },
      { name: 'Others + MSP', value: others + cspTotal },
    ].filter((d) => d.value > 0);

  const topRecommendations: TopRecommendation[] = isBtpOnly
    ? [
      { title: 'Switch to CPEA Commitment Model', savings: btpCpeaSavings, impact: (btpCpeaSavings > 50 ? 'High' : 'Medium') as 'High' | 'Medium' },
      { title: 'Downgrade eligible services to free-tier plans', savings: btpPlanSavings, impact: 'Medium' as const },
      { title: 'Remove unused/zero-usage service instances', savings: btpUnusedSavings, impact: (unusedBtpCost > 0 ? 'High' : 'Low') as 'High' | 'Low' },
      { title: `Maitsys SAP BTP MSP Discount (${(MSP_RATES.btp * 100).toFixed(0)}%) — applied automatically`, savings: cspBtp, impact: 'Low' as const },
      ...(btpConsolidationSavings > 0 ? [{ title: `Consolidate ${fragSubs.length} low-spend subaccounts`, savings: btpConsolidationSavings, impact: 'Medium' as const }] : []),
    ].filter((r) => r.savings > 0).slice(0, 4)
    : recs.slice(0, 4).map((r) => ({ title: r.description || r.action || 'Optimize Resource', savings: r.estimated_savings, impact: r.estimated_savings > 1000 ? 'High' as const : 'Medium' as const }));

  return {
    totalCurrent, effectiveSpend, isBtpOnly, showTaxCards, preTax, salesTax,
    optTotal, cspTotal, btpOptTotal, totalSavings, savingsPct,
    optimizationCategories, cspCategories, btpOptCategories, donutData, topRecommendations,
  };
}
