import type { CloudResource, CostAnalyticsDataset, CostBreakdownRow, OptimizationOpportunity, Reservation } from '../../data-access';
import { MOCK_AZURE_ACCOUNTS, MOCK_AZURE_ADVISOR_RECOMMENDATIONS, MOCK_AZURE_CSP_RECOMMENDATIONS, MOCK_AZURE_FULL, MOCK_AZURE_RESERVATION_UTILIZATION, MOCK_AZURE_YEARLY, azureAccountSummaries } from '../azure/mockAzureData';
import { MOCK_AWS_ACCOUNTS, MOCK_AWS_CSP_RECOMMENDATIONS, MOCK_AWS_FULL, MOCK_AWS_YEARLY, awsAccountSummaries } from '../aws/mockAwsData';
import { MOCK_GCP_ACCOUNTS, MOCK_GCP_COSTS } from '../gcp/mockGcpData';
import { MOCK_BTP_COSTS, MOCK_BTP_SERVICE_INSTANCES, MOCK_BTP_SUBACCOUNTS, MOCK_BTP_YEARLY } from '../btp/mockBtpData';

/**
 * PROTOTYPE MOCK DATA for the cross-provider Cloud Cost pages, composed from each provider's
 * existing sample data so every page tells the same story. Tags, reservations and opportunity
 * metadata are invented sample values. "Current month" is September 2026, as in the provider
 * samples.
 */
const ym = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`;
const round = (n: number) => Math.round(n * 100) / 100;
const CURRENT = '2026-09';

// ---- Cost analytics --------------------------------------------------------------------------

const azureCurrent = MOCK_AZURE_YEARLY[MOCK_AZURE_YEARLY.length - 1];
const azurePrevious = MOCK_AZURE_YEARLY[MOCK_AZURE_YEARLY.length - 2];
const awsCurrent = MOCK_AWS_YEARLY[MOCK_AWS_YEARLY.length - 1];
const awsPrevious = MOCK_AWS_YEARLY[MOCK_AWS_YEARLY.length - 2];

function compare<T>(current: T[], previous: T[] | null, name: (row: T) => string, cost: (row: T) => number, provider: CostBreakdownRow['provider'], currency: string): CostBreakdownRow[] {
  return current.map((row) => {
    const match = previous?.find((p) => name(p) === name(row));
    return { provider, name: name(row), cost: round(cost(row)), previousCost: match ? round(cost(match)) : null, currency };
  });
}

const awsSummaries = awsAccountSummaries();

export const MOCK_COST_ANALYTICS: CostAnalyticsDataset = {
  currentMonth: CURRENT,
  monthly: [
    ...MOCK_AZURE_YEARLY.map((m) => ({ month: ym(m.year, m.month), provider: 'azure' as const, cost: round(m.totalCost), currency: 'USD' })),
    ...MOCK_AWS_YEARLY.map((m) => ({ month: ym(m.year, m.month), provider: 'aws' as const, cost: round(m.totalCost), currency: 'USD' })),
    { month: CURRENT, provider: 'gcp' as const, cost: round(MOCK_GCP_COSTS.totalCost), currency: MOCK_GCP_COSTS.currency },
    ...MOCK_BTP_YEARLY.map((m) => ({ month: ym(m.year, m.month), provider: 'btp' as const, cost: round(m.totalCost), currency: MOCK_BTP_COSTS.currency })),
  ],
  services: [
    ...compare(azureCurrent.topServices, azurePrevious.topServices, (r) => r.name, (r) => r.cost, 'azure', 'USD'),
    ...compare(awsCurrent.topServices, awsPrevious.topServices, (r) => r.name, (r) => r.cost, 'aws', 'USD'),
    ...compare(MOCK_GCP_COSTS.services, null, (r) => r.name, (r) => r.cost, 'gcp', MOCK_GCP_COSTS.currency),
    ...compare(MOCK_BTP_COSTS.topServices, null, (r) => r.name, (r) => r.cost, 'btp', MOCK_BTP_COSTS.currency),
  ],
  regions: [
    ...compare(azureCurrent.locations, azurePrevious.locations, (r) => r.name, (r) => r.cost, 'azure', 'USD'),
    ...compare(awsCurrent.topRegions, awsPrevious.topRegions, (r) => r.region, (r) => r.cost, 'aws', 'USD'),
    ...compare(MOCK_GCP_COSTS.locations, null, (r) => r.name, (r) => r.cost, 'gcp', MOCK_GCP_COSTS.currency),
  ],
  accounts: [
    ...azureAccountSummaries().map((s) => ({ provider: 'azure' as const, name: s.name, cost: round(s.totalCost), previousCost: null, currency: 'USD' })),
    ...MOCK_AWS_ACCOUNTS.map((a) => ({ provider: 'aws' as const, name: a.name, cost: round(awsSummaries.find((s) => s.id === a.id)?.totalCost ?? 0), previousCost: null, currency: 'USD' })),
    ...MOCK_GCP_COSTS.projects.map((p) => ({ provider: 'gcp' as const, name: p.name, cost: round(p.cost), previousCost: null, currency: MOCK_GCP_COSTS.currency })),
    ...MOCK_BTP_SUBACCOUNTS.map((s) => ({ provider: 'btp' as const, name: s.displayName, cost: round(s.cost), previousCost: null, currency: MOCK_BTP_COSTS.currency })),
  ],
  providersWithoutHistory: ['gcp'],
};

// ---- Resource inventory ----------------------------------------------------------------------

const AZURE_REGION_BY_GROUP: Record<string, string> = {
  'rg-production-eastus': 'East US', 'rg-shared-services': 'West Europe', 'rg-data-platform': 'Central US', 'rg-networking-hub': 'East US',
};
const OWNERS = ['platform-team', 'data-team', 'web-team', 'finance-it'];
/** Roughly one in four resources has no tags, so the "Untagged" view has real content. */
function sampleTags(index: number, env: string): Record<string, string> {
  if (index % 4 === 3) return {};
  return { env, owner: OWNERS[index % OWNERS.length], 'cost-center': index % 2 ? 'CC-1200' : 'CC-1100' };
}

const azureResources: CloudResource[] = MOCK_AZURE_FULL.costs.resources.allResources.map((r, i) => ({
  id: r.id,
  name: r.name,
  provider: 'azure',
  type: r.type,
  group: r.resourceGroup,
  account: MOCK_AZURE_ACCOUNTS[0].name,
  region: AZURE_REGION_BY_GROUP[r.resourceGroup] ?? null,
  state: r.hasSpend ? 'Active' : 'Unused',
  monthlyCost: round(r.cost),
  currency: 'USD',
  tags: sampleTags(i, 'production'),
}));

const awsResources: CloudResource[] = [
  ...MOCK_AWS_FULL.instances.map((instance, i) => ({
    id: instance.InstanceId,
    name: instance.InstanceId,
    provider: 'aws' as const,
    type: `EC2 instance (${instance.InstanceType})`,
    group: MOCK_AWS_ACCOUNTS[instance.Region === 'us-west-2' ? 1 : 0].name,
    account: MOCK_AWS_ACCOUNTS[instance.Region === 'us-west-2' ? 1 : 0].name,
    region: instance.Region,
    state: instance.State === 'running' ? 'Running' : 'Stopped',
    monthlyCost: null,
    currency: 'USD',
    tags: sampleTags(i + 1, instance.Region === 'us-west-2' ? 'staging' : 'production'),
  })),
  ...MOCK_AWS_FULL.s3Buckets.map((bucket, i) => ({
    id: `arn:aws:s3:::${bucket.name}`,
    name: bucket.name,
    provider: 'aws' as const,
    type: 'S3 bucket',
    group: MOCK_AWS_ACCOUNTS[0].name,
    account: MOCK_AWS_ACCOUNTS[0].name,
    region: 'us-east-1',
    state: 'Active',
    monthlyCost: null,
    currency: 'USD',
    tags: sampleTags(i + 2, 'production'),
  })),
];

const gcpResources: CloudResource[] = MOCK_GCP_COSTS.projects.map((project, i) => ({
  id: `projects/${project.name}`,
  name: project.name,
  provider: 'gcp',
  type: 'Project',
  group: project.name,
  account: MOCK_GCP_ACCOUNTS[0]?.name ?? 'Google Cloud',
  region: null,
  state: 'Active',
  monthlyCost: round(project.cost),
  currency: MOCK_GCP_COSTS.currency,
  tags: sampleTags(i, 'production'),
}));

const btpResources: CloudResource[] = Object.entries(MOCK_BTP_SERVICE_INSTANCES).flatMap(([subaccountGuid, instances]) => {
  const subaccount = MOCK_BTP_SUBACCOUNTS.find((s) => s.guid === subaccountGuid);
  return instances.map((instance, i) => ({
    id: instance.id,
    name: instance.name,
    provider: 'btp' as const,
    type: `${instance.serviceOfferingName} (${instance.servicePlanName})`,
    group: subaccount?.displayName ?? subaccountGuid,
    account: 'Mavera SAP Landscape',
    region: subaccount?.region ?? null,
    state: instance.status.includes('succeeded') ? 'Active' : instance.status,
    monthlyCost: null,
    currency: MOCK_BTP_COSTS.currency,
    tags: sampleTags(i + 3, subaccount?.displayName.toLowerCase().includes('prod') ? 'production' : 'qa'),
  }));
});

export const MOCK_CLOUD_RESOURCES: CloudResource[] = [...azureResources, ...awsResources, ...gcpResources, ...btpResources];

// ---- Reservations ----------------------------------------------------------------------------

const azureTrend = MOCK_AZURE_RESERVATION_UTILIZATION.map((u) => ({ date: u.usageDate, percent: u.utilizationPercentage }));
const average = (points: Array<{ percent: number }>) => Math.round((points.reduce((sum, p) => sum + p.percent, 0) / Math.max(1, points.length)) * 10) / 10;
const shiftTrend = (delta: number) => azureTrend.map((p, i) => ({ date: p.date, percent: Math.max(0, Math.min(100, round(p.percent + delta + ((i % 5) - 2) * 1.5))) }));

const sqlTrend = shiftTrend(-24);
const savingsPlanTrend = shiftTrend(8);
const rdsTrend = shiftTrend(4);

export const MOCK_RESERVATIONS: Reservation[] = [
  { id: 'az-ri-d4sv5', name: 'VM D4s v5 — East US', provider: 'azure', kind: 'Reserved VM Instance', service: 'Virtual Machines', scope: 'Production Environment (subscription)', region: 'East US', quantity: 4, term: '1 year', start: '2025-11-15', end: '2026-11-14', utilizationPercent: average(azureTrend), utilizationBasis: 'reserved hours used, last 30 days', trend: azureTrend },
  { id: 'az-ri-sql-gp', name: 'SQL Database vCore — General Purpose', provider: 'azure', kind: 'Reserved capacity', service: 'SQL Database', scope: 'Shared (all subscriptions)', region: 'West Europe', quantity: 8, term: '3 years', start: '2024-02-01', end: '2027-01-31', utilizationPercent: average(sqlTrend), utilizationBasis: 'reserved vCore hours used, last 30 days', trend: sqlTrend },
  { id: 'aws-sp-compute', name: 'Compute Savings Plan', provider: 'aws', kind: 'Savings Plan', service: 'EC2 / Lambda', scope: 'Production AWS (account)', region: null, quantity: 1, term: '1 year', start: '2025-10-20', end: '2026-10-19', utilizationPercent: average(savingsPlanTrend), utilizationBasis: 'hourly commitment used, last 30 days', trend: savingsPlanTrend },
  { id: 'aws-ri-rds', name: 'RDS db.r6g.large — PostgreSQL', provider: 'aws', kind: 'Reserved DB Instance', service: 'RDS', scope: 'Production AWS (account)', region: 'us-east-1', quantity: 2, term: '1 year', start: '2026-03-01', end: '2027-02-28', utilizationPercent: average(rdsTrend), utilizationBasis: 'reserved instance hours used, last 30 days', trend: rdsTrend },
];

// ---- Optimization opportunities --------------------------------------------------------------

/** AWS returns action codes ("PurchaseSavingsPlans"); show people a sentence instead. */
const ACTION_TITLE: Record<string, string> = {
  Stop: 'Stop or remove the idle EC2 instance',
  RightSize: 'Move unattached volumes to gp3 or delete them',
  PurchaseSavingsPlans: 'Buy a 1-year Compute Savings Plan',
};

const advisorCategory = (problem: string): OptimizationOpportunity['category'] =>
  /reserved/i.test(problem) ? 'Commitments' : /unattached|idle/i.test(problem) ? 'Idle resources' : 'Rightsizing';

export const MOCK_OPTIMIZATION_OPPORTUNITIES: OptimizationOpportunity[] = [
  ...MOCK_AZURE_ADVISOR_RECOMMENDATIONS.map((rec, i) => ({
    id: `az-adv-${i + 1}`,
    provider: 'azure' as const,
    title: rec.shortDescription.solution,
    resource: /SQL/.test(rec.shortDescription.problem) ? 'SQL Database (subscription-wide)' : 'Production Environment',
    resourceId: MOCK_AZURE_ACCOUNTS[0].subscriptionId,
    rationale: rec.shortDescription.problem,
    category: advisorCategory(rec.shortDescription.problem),
    impact: rec.impact,
    monthlySaving: Number(rec.extendedProperties.savingsAmount ?? 0),
    currency: 'USD',
    source: 'Azure Advisor',
    assumptions: `Advisor estimate based on the last 30 days of usage${rec.extendedProperties.term ? `; term ${rec.extendedProperties.term === 'P3Y' ? '3 years' : '1 year'}` : ''}.`,
    // Advisor's "low utilisation VMs" covers the same spend as the CSP right-size of vm-batch-worker.
    overlapsWith: /Low utilisation/i.test(rec.shortDescription.problem) ? 'csp-1' : undefined,
  })),
  ...[...MOCK_AZURE_CSP_RECOMMENDATIONS.map((r) => ({ ...r, provider: 'azure' as const })), ...MOCK_AWS_CSP_RECOMMENDATIONS.map((r) => ({ ...r, provider: 'aws' as const }))].map((rec) => ({
    id: rec.id,
    provider: rec.provider,
    title: ACTION_TITLE[rec.action] ?? rec.action,
    resource: rec.resource_name,
    resourceId: rec.resource_id,
    rationale: rec.description,
    category: (/savings ?plan/i.test(rec.resource_type + rec.action) ? 'Commitments' : /storage|ebs|tier/i.test(rec.resource_type + rec.action) ? 'Storage tiering' : /merge|consolidat/i.test(rec.action) ? 'Consolidation' : /stop/i.test(rec.action) ? 'Idle resources' : 'Rightsizing') as OptimizationOpportunity['category'],
    impact: (rec.estimated_savings >= 400 ? 'High' : rec.estimated_savings >= 150 ? 'Medium' : 'Low') as OptimizationOpportunity['impact'],
    monthlySaving: rec.estimated_savings,
    currency: 'USD',
    source: 'Maitsys CSP analysis',
    assumptions: rec.current_monthly_cost > 0 ? `Compared with the current ${rec.current_monthly_cost.toFixed(2)} USD/month for this resource.` : 'Estimated from 30 days of account-wide usage.',
  })),
];
