import type {
  AzureAccount,
  AzureAccountSummary,
  AzureAdvisorRecommendation,
  AzureAlert,
  AzureBudget,
  AzureFullResponse,
  AzureInvoice,
  AzureReservationUtilization,
  AzureTopService,
  AzureYearlyMonth,
  CspRecommendation,
} from '../../features/azure';
import { seededRandom, splitDailyByService, splitToTheCent } from '../shared/costSplit';

export const MOCK_AZURE_ACCOUNTS: AzureAccount[] = [
  { id: 'az-acc-1', name: 'Production Environment', subscriptionId: 'a1b2c3d4-5e6f-4789-9abc-def012345678', tenantId: 'f0e1d2c3-4b5a-4978-8765-43210fedcba9', clientId: '11223344-5566-4778-899a-abbccddeeff0' },
  { id: 'az-acc-2', name: 'Development Environment', subscriptionId: '9f8e7d6c-5b4a-4392-8271-605f4e3d2c1b', tenantId: 'f0e1d2c3-4b5a-4978-8765-43210fedcba9', clientId: '22334455-6677-4889-9aab-bccddeeff001' },
];

const SERVICE_NAMES = ['Virtual Machines', 'Storage Accounts', 'SQL Database', 'App Service', 'Azure Kubernetes Service', 'Networking', 'Cosmos DB', 'Redis Cache'];
const RESOURCE_GROUPS = ['rg-production-eastus', 'rg-shared-services', 'rg-data-platform', 'rg-networking-hub'];
const LOCATIONS = ['East US', 'West Europe', 'Central US'];
/** Smaller locations and the buckets Azure bills outside a region. Own PRNG, so the rest of the fixture keeps its values. */
const EXTRA_LOCATIONS: Array<[string, number]> = [['Global', 0.2], ['North Europe', 0.18], ['UK South', 0.12], ['Southeast Asia', 0.08], ['Unassigned', 0.02]];
const extraLocationRand = seededRandom(2288);
const DAILY_SPLIT_SEED = 4242;
const METER_SEED = 9090;

/** The meters each service is billed on; a service's cost is split across them to build its usage lines. */
const METERS: Record<string, string[]> = {
  'Virtual Machines': ['D4s v5 compute hours', 'E8s v5 compute hours', 'Premium SSD managed disks', 'Outbound bandwidth'],
  'Storage Accounts': ['Hot LRS data stored', 'Write operations', 'Read operations', 'Archive tier storage'],
  'SQL Database': ['General Purpose vCore', 'Backup storage', 'Zone redundancy'],
  'App Service': ['P1v3 plan hours', 'S1 plan hours', 'SSL bindings'],
  'Azure Kubernetes Service': ['D8s v5 node pool', 'Uptime SLA', 'Standard load balancer'],
  'Networking': ['Application Gateway v2', 'Public IP addresses', 'Outbound data processed', 'VPN gateway'],
  'Cosmos DB': ['Provisioned throughput (RU/s)', 'Transactional storage', 'Multi-region writes'],
  'Redis Cache': ['Premium P1 cache hours', 'Geo-replication'],
};

/** One usage line per meter; the lines of a service add up to that service's cost exactly. */
function meterLines(services: Array<{ name: string; cost: number }>, seed: number) {
  const random = seededRandom(seed);
  return services.flatMap((service) => {
    const meters = METERS[service.name] ?? ['Usage'];
    const costs = splitToTheCent(service.cost, meters.map(() => 0.5 + random()));
    return meters.map((meter, index) => ({ service: service.name, meter, cost: costs[index] }));
  });
}

/** Simple deterministic PRNG (mulberry32) so the mock dataset is stable
 * across renders/tests rather than reshuffling on every reload. */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(42);

/** Splits `total` by `weights` to the cent. Any rounding remainder goes to the largest part, so the parts
 * always add up to `total` (daily costs sum to the month-to-date, services to the total). */
function distribute(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  const parts = weights.map((w) => Math.round((total * w) / sum * 100) / 100);
  const remainder = Math.round((total - parts.reduce((a, b) => a + b, 0)) * 100) / 100;
  if (remainder !== 0) {
    const largest = parts.indexOf(Math.max(...parts));
    parts[largest] = Math.round((parts[largest] + remainder) * 100) / 100;
  }
  return parts;
}

function serviceBreakdown(total: number) {
  const weights = SERVICE_NAMES.map(() => 0.4 + rand() * 1.2);
  const costs = distribute(total, weights);
  return SERVICE_NAMES.map((name, i) => ({ name, cost: costs[i] }));
}

function dailyCosts(daysInMonth: number, monthTotal: number): { date: string; cost: number }[] {
  const weights = Array.from({ length: daysInMonth }, () => 0.6 + rand() * 0.8);
  const costs = distribute(monthTotal, weights);
  return costs.map((cost, i) => ({
    date: `2026-${String(9).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`,
    cost,
  }));
}

const CURRENT_MONTH_TOTAL = 14280.55;
const CURRENT_MONTH_DAYS = 27; // "today" is 2026-09-27 per this session's context
const CURRENT_MONTH_DAILY_TOTALS = dailyCosts(CURRENT_MONTH_DAYS, CURRENT_MONTH_TOTAL);
const CURRENT_MONTH_SERVICES = serviceBreakdown(CURRENT_MONTH_TOTAL);
/** Each day carries its services; they add up to that day's cost, so the month-to-date total is unchanged. */
const CURRENT_MONTH_DAILY = splitDailyByService(CURRENT_MONTH_DAILY_TOTALS, CURRENT_MONTH_SERVICES, DAILY_SPLIT_SEED);
const CURRENT_MONTH_DETAILS = meterLines(CURRENT_MONTH_SERVICES, METER_SEED);

const RESOURCE_NAMES: Record<string, string[]> = {
  'Virtual Machines': ['vm-web-01', 'vm-web-02', 'vm-api-01', 'vm-batch-worker'],
  'Storage Accounts': ['stprodmedia001', 'stprodbackup002', 'stsharedlogs003'],
  'SQL Database': ['sql-prod-orders', 'sql-prod-inventory'],
  'App Service': ['app-customer-portal', 'app-internal-tools'],
  'Azure Kubernetes Service': ['aks-prod-cluster'],
  'Networking': ['vnet-prod-hub', 'lb-prod-gateway'],
  'Cosmos DB': ['cosmos-prod-catalog'],
  'Redis Cache': ['redis-prod-session'],
};

export const MOCK_AZURE_TOP_RESOURCES = CURRENT_MONTH_SERVICES.flatMap((service) => {
  const names = RESOURCE_NAMES[service.name] ?? [`${service.name.toLowerCase()}-resource`];
  const weights = names.map(() => 0.5 + rand());
  const costs = distribute(service.cost, weights);
  return names.map((name, i) => ({
    id: `/subscriptions/a1b2c3d4/resourceGroups/${RESOURCE_GROUPS[i % RESOURCE_GROUPS.length]}/providers/${service.name}/${name}`,
    name,
    service: service.name,
    cost: costs[i],
    resourceGroup: RESOURCE_GROUPS[i % RESOURCE_GROUPS.length],
  }));
}).sort((a, b) => b.cost - a.cost);

const RESOURCE_GROUP_COSTS = (() => {
  const weights = RESOURCE_GROUPS.map(() => 0.6 + rand());
  const costs = distribute(CURRENT_MONTH_TOTAL, weights);
  return RESOURCE_GROUPS.map((name, i) => ({ name, cost: costs[i] }));
})();

const LOCATION_COSTS = (() => {
  const weights = LOCATIONS.map(() => 0.5 + rand());
  const extraWeights = EXTRA_LOCATIONS.map(([, base]) => base * (0.85 + extraLocationRand() * 0.3));
  const names = [...LOCATIONS, ...EXTRA_LOCATIONS.map(([name]) => name)];
  const costs = distribute(CURRENT_MONTH_TOTAL, [...weights, ...extraWeights]);
  return names.map((name, i) => ({ name, cost: costs[i] }));
})();

const ALL_RESOURCES = MOCK_AZURE_TOP_RESOURCES.map((r) => ({
  id: r.id,
  name: r.name,
  type: r.service,
  resourceGroup: r.resourceGroup ?? RESOURCE_GROUPS[0],
  cost: r.cost,
  hasSpend: r.cost > 0,
})).concat(
  // A handful of provisioned-but-unused resources — a real, meaningful
  // distinction the reference app calls out explicitly (§ "Resource
  // Inventory": used-vs-unused).
  ['disk-orphaned-01', 'nic-unused-legacy', 'publicip-reserved-standby'].map((name) => ({
    id: `/subscriptions/a1b2c3d4/resourceGroups/${RESOURCE_GROUPS[2]}/providers/Misc/${name}`,
    name,
    type: 'Other',
    resourceGroup: RESOURCE_GROUPS[2],
    cost: 0,
    hasSpend: false,
  })),
);

const RESOURCE_TYPE_COUNTS = Object.entries(
  ALL_RESOURCES.reduce<Record<string, number>>((acc, r) => {
    acc[r.type] = (acc[r.type] ?? 0) + 1;
    return acc;
  }, {}),
).map(([type, count]) => ({ type, count }));

export const MOCK_AZURE_FULL: AzureFullResponse = {
  costs: {
    totalCost: CURRENT_MONTH_TOTAL,
    forecast: Math.round(CURRENT_MONTH_TOTAL * (30 / CURRENT_MONTH_DAYS) * 100) / 100,
    currency: 'USD',
    dailyCosts: CURRENT_MONTH_DAILY,
    services: CURRENT_MONTH_SERVICES,
    topResources: MOCK_AZURE_TOP_RESOURCES,
    details: CURRENT_MONTH_DETAILS,
    resourceGroups: RESOURCE_GROUP_COSTS,
    locations: LOCATION_COSTS,
    resources: {
      total: ALL_RESOURCES.length,
      active: ALL_RESOURCES.filter((r) => r.hasSpend).length,
      byType: RESOURCE_TYPE_COUNTS,
      allResources: ALL_RESOURCES,
    },
    forecastData: dailyCosts(30, CURRENT_MONTH_TOTAL * (30 / CURRENT_MONTH_DAYS)),
  },
  budgets: [
    { name: 'Production Monthly Budget', amount: 18000, currentSpend: { amount: CURRENT_MONTH_TOTAL } },
    { name: 'Data Platform Budget', amount: 4000, currentSpend: { amount: 3120.4 } },
    { name: 'Networking Hub Budget', amount: 1500, currentSpend: { amount: 1612.35 } },
  ],
  recommendations: [
    {
      shortDescription: { problem: 'Low utilisation virtual machines detected', solution: 'Resize or shut down underused VMs' },
      extendedProperties: { savingsAmount: '412.50', annualSavingsAmount: '4950.00', term: 'P1Y' },
      impact: 'High',
      category: 'Cost',
    },
    {
      shortDescription: { problem: 'Unattached managed disks', solution: 'Delete disks not attached to any VM' },
      extendedProperties: { savingsAmount: '86.20', annualSavingsAmount: '1034.40', term: 'P1Y' },
      impact: 'Medium',
      category: 'Cost',
    },
    {
      shortDescription: { problem: 'Reserved Instance opportunity for SQL Database', solution: 'Purchase a 3-year reserved capacity plan' },
      extendedProperties: { savingsAmount: '640.00', annualSavingsAmount: '7680.00', term: 'P3Y' },
      impact: 'High',
      category: 'Cost',
    },
    {
      shortDescription: { problem: 'Cosmos DB provisioned throughput is higher than needed', solution: 'Reduce provisioned RU/s or switch to autoscale' },
      extendedProperties: { savingsAmount: '148.90', annualSavingsAmount: '1786.80', term: 'P1Y' },
      impact: 'Medium',
      category: 'Cost',
    },
    {
      shortDescription: { problem: 'aks-prod-cluster node pool is over-provisioned outside business hours', solution: 'Enable the cluster autoscaler on the node pool' },
      extendedProperties: { savingsAmount: '96.00', annualSavingsAmount: '1152.00' },
      impact: 'Low',
      category: 'Cost',
    },
  ],
  alerts: [
    { name: 'Budget threshold exceeded', description: 'Production Monthly Budget has reached 79% of its cap.' },
    { name: 'Budget exceeded', description: 'Networking Hub Budget has passed its $1,500.00 cap.' },
  ],
  invoices: [
    { billingPeriod: '2026-08', invoiceDate: '2026-09-01', totalAmount: { amount: 13940.2 }, name: 'Invoice-2026-08-AZ', downloadUrl: '#' },
    { billingPeriod: '2026-07', invoiceDate: '2026-08-01', totalAmount: { amount: 12810.75 }, name: 'Invoice-2026-07-AZ', downloadUrl: '#' },
  ],
  reservationRecommendations: [],
  reservationUtilization: Array.from({ length: CURRENT_MONTH_DAYS }, (_, i) => ({
    usageDate: `2026-09-${String(i + 1).padStart(2, '0')}`,
    utilizationPercentage: Math.round((72 + rand() * 20) * 10) / 10,
  })),
  billingMetadata: { name: 'Production Environment' },
};

const MONTH_NAMES_2025_2026: Array<{ year: number; month: number }> = [
  { year: 2025, month: 10 }, { year: 2025, month: 11 }, { year: 2025, month: 12 },
  { year: 2026, month: 1 }, { year: 2026, month: 2 }, { year: 2026, month: 3 },
  { year: 2026, month: 4 }, { year: 2026, month: 5 }, { year: 2026, month: 6 },
  { year: 2026, month: 7 }, { year: 2026, month: 8 }, { year: 2026, month: 9 },
];

const DAYS_IN_MONTH: Record<number, number> = { 1: 31, 2: 28, 3: 31, 4: 30, 5: 31, 6: 30, 7: 31, 8: 31, 9: 27, 10: 31, 11: 30, 12: 31 };

export const MOCK_AZURE_YEARLY: AzureYearlyMonth[] = MONTH_NAMES_2025_2026.map(({ year, month }, index) => {
  const isCurrent = year === 2026 && month === 9;
  const total = isCurrent ? CURRENT_MONTH_TOTAL : Math.round((10500 + index * 320 + rand() * 1400) * 100) / 100;
  const days = DAYS_IN_MONTH[month];
  const rawDaily = isCurrent ? CURRENT_MONTH_DAILY_TOTALS : dailyCosts(days, total).map((d) => ({ ...d, date: `${year}-${String(month).padStart(2, '0')}-${d.date.slice(-2)}` }));
  const topServices = isCurrent ? CURRENT_MONTH_SERVICES : serviceBreakdown(total);
  return {
    year,
    month,
    totalCost: total,
    dailyCosts: isCurrent ? CURRENT_MONTH_DAILY : splitDailyByService(rawDaily, topServices, DAILY_SPLIT_SEED + index),
    topServices,
    details: isCurrent ? CURRENT_MONTH_DETAILS : meterLines(topServices, METER_SEED + index),
    resourceGroups: RESOURCE_GROUP_COSTS,
    // Each month's regions add up to that month's total, in the same proportions as the current month.
    locations: isCurrent ? LOCATION_COSTS : splitToTheCent(total, LOCATION_COSTS.map((location) => location.cost)).map((cost, i) => ({ name: LOCATION_COSTS[i].name, cost })),
  };
});

export const MOCK_AZURE_CSP_RECOMMENDATIONS: CspRecommendation[] = [
  {
    id: 'csp-1', estimated_savings: 298.4, current_monthly_cost: 1420.0, resource_type: 'virtualMachines',
    description: 'Right-size vm-batch-worker — sustained CPU under 12% for 30 days.', action: 'Resize to a smaller SKU',
    resource_name: 'vm-batch-worker', resource_id: MOCK_AZURE_TOP_RESOURCES.find((r) => r.name === 'vm-batch-worker')?.id ?? '',
  },
  {
    id: 'csp-2', estimated_savings: 154.1, current_monthly_cost: 610.0, resource_type: 'storage',
    description: 'Move cold blobs in stprodbackup002 to Archive tier.', action: 'Change access tier',
    resource_name: 'stprodbackup002', resource_id: MOCK_AZURE_TOP_RESOURCES.find((r) => r.name === 'stprodbackup002')?.id ?? '',
  },
  {
    id: 'csp-3', estimated_savings: 512.75, current_monthly_cost: 0, resource_type: 'subscription',
    description: 'Consolidate two underused App Service plans onto one.', action: 'Merge App Service plans',
    resource_name: 'Subscription-wide', resource_id: MOCK_AZURE_ACCOUNTS[0].subscriptionId,
  },
];

export function azureAccountSummaries(): AzureAccountSummary[] {
  const prodSparkline = MOCK_AZURE_YEARLY.slice(-7).map((m) => Math.round(m.totalCost / 30));
  return [
    {
      id: MOCK_AZURE_ACCOUNTS[0].id,
      name: MOCK_AZURE_ACCOUNTS[0].name,
      subscriptionId: MOCK_AZURE_ACCOUNTS[0].subscriptionId,
      totalCost: CURRENT_MONTH_TOTAL,
      todayCost: CURRENT_MONTH_DAILY[CURRENT_MONTH_DAILY.length - 1]?.cost ?? null,
      sparkline: prodSparkline,
      budgetStatus: { pct: Math.round((CURRENT_MONTH_TOTAL / 18000) * 1000) / 10, name: 'Production Monthly Budget' },
    },
    {
      id: MOCK_AZURE_ACCOUNTS[1].id,
      name: MOCK_AZURE_ACCOUNTS[1].name,
      subscriptionId: MOCK_AZURE_ACCOUNTS[1].subscriptionId,
      totalCost: 2140.3,
      todayCost: 68.2,
      sparkline: [61, 70, 58, 74, 69, 72, 68],
      budgetStatus: null,
    },
  ];
}

export function azureTopServicesAllAccounts(): AzureTopService[] {
  const dev = 2140.3;
  return CURRENT_MONTH_SERVICES.map((s) => ({ name: s.name, value: Math.round((s.cost + (dev * (0.4 + rand() * 0.8)) / SERVICE_NAMES.length) * 100) / 100 }))
    .sort((a, b) => b.value - a.value);
}

export const MOCK_AZURE_ALERTS: AzureAlert[] = MOCK_AZURE_FULL.alerts;
export const MOCK_AZURE_BUDGETS: AzureBudget[] = MOCK_AZURE_FULL.budgets;
export const MOCK_AZURE_INVOICES: AzureInvoice[] = MOCK_AZURE_FULL.invoices;
export const MOCK_AZURE_RESERVATION_UTILIZATION: AzureReservationUtilization[] = MOCK_AZURE_FULL.reservationUtilization;
export const MOCK_AZURE_ADVISOR_RECOMMENDATIONS: AzureAdvisorRecommendation[] = MOCK_AZURE_FULL.recommendations;
