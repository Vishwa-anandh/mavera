import type {
  AwsAccount,
  AwsAccountSummary,
  AwsBudget,
  AwsDetailRow,
  AwsFullResponse,
  AwsInstance,
  AwsRegionCost,
  AwsS3Bucket,
  AwsServiceCost,
  AwsTopService,
  AwsYearlyMonth,
  CspRecommendation,
} from '../../features/aws';

export const MOCK_AWS_ACCOUNTS: AwsAccount[] = [
  { id: 'aws-acc-1', name: 'Production AWS', region: 'us-east-1', accessKey: 'AKIA3F7QZX9K2M4N8P1R' },
  { id: 'aws-acc-2', name: 'Staging AWS', region: 'us-west-2', accessKey: 'AKIA7B2H4T6Y8W1Q3E5X' },
];

/** Simple deterministic PRNG (mulberry32) so the mock dataset is stable
 * across renders/tests rather than reshuffling on every reload — same
 * approach as mockAzureData.ts. */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(77);

function distribute(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => Math.round(((total * w) / sum) * 100) / 100);
}

const AWS_SERVICE_NAMES = ['Amazon EC2', 'Amazon S3', 'Amazon RDS', 'AWS Lambda', 'Amazon CloudFront', 'Amazon DynamoDB'];
const AWS_REGIONS = ['us-east-1', 'us-west-2', 'eu-west-1'];

function serviceBreakdown(total: number): AwsServiceCost[] {
  const weights = AWS_SERVICE_NAMES.map(() => 0.4 + rand() * 1.2);
  const costs = distribute(total, weights);
  return AWS_SERVICE_NAMES.map((name, i) => ({ name, cost: costs[i] })).sort((a, b) => b.cost - a.cost);
}

function regionBreakdown(total: number): AwsRegionCost[] {
  const weights = AWS_REGIONS.map(() => 0.4 + rand() * 1.2);
  const costs = distribute(total, weights);
  return AWS_REGIONS.map((region, i) => ({ region, cost: costs[i] })).sort((a, b) => b.cost - a.cost);
}

function dailyCosts(daysInMonth: number, monthTotal: number, year: number, month: number): { date: string; cost: number }[] {
  const weights = Array.from({ length: daysInMonth }, () => 0.6 + rand() * 0.8);
  const costs = distribute(monthTotal, weights);
  return costs.map((cost, i) => ({ date: `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`, cost }));
}

const CURRENT_MONTH_TOTAL = 9840.6;
const CURRENT_MONTH_DAYS = 27; // "today" is 2026-09-27 per this session's context
const CURRENT_MONTH_DAILY = dailyCosts(CURRENT_MONTH_DAYS, CURRENT_MONTH_TOTAL, 2026, 9);
const CURRENT_MONTH_SERVICES = serviceBreakdown(CURRENT_MONTH_TOTAL);
const CURRENT_MONTH_REGIONS = regionBreakdown(CURRENT_MONTH_TOTAL);

const USAGE_TYPES: Record<string, string[]> = {
  'Amazon EC2': ['BoxUsage:m5.large', 'BoxUsage:t3.medium', 'EBS:VolumeUsage.gp3', 'DataTransfer-Out-Bytes'],
  'Amazon S3': ['TimedStorage-ByteHrs', 'Requests-Tier1', 'Requests-Tier2'],
  'Amazon RDS': ['InstanceUsage:db.r5.large', 'RDS:StorageUsage', 'RDS:BackupUsage'],
  'AWS Lambda': ['Lambda-GB-Second', 'Lambda-Requests'],
  'Amazon CloudFront': ['DataTransfer-Out-Bytes', 'Requests-HTTPS'],
  'Amazon DynamoDB': ['ReadCapacityUnit-Hrs', 'WriteCapacityUnit-Hrs'],
};

const CURRENT_MONTH_DETAILS: AwsDetailRow[] = CURRENT_MONTH_SERVICES.flatMap((service) => {
  const types = USAGE_TYPES[service.name] ?? ['Usage'];
  const weights = types.map(() => 0.5 + rand());
  const costs = distribute(service.cost, weights);
  return types.map((usageType, i) => ({ service: service.name, usageType, cost: costs[i] }));
});

const RESOURCE_BY_TYPE = [
  { type: 'EC2 Instance', count: 8, icon: 'server' },
  { type: 'RDS Database', count: 3, icon: 'database' },
  { type: 'Lambda Function', count: 14, icon: 'zap' },
  { type: 'ECS Service', count: 2, icon: 'layers' },
  { type: 'S3 Bucket', count: 5, icon: 'shield' },
];

const MOCK_AWS_INSTANCES: AwsInstance[] = [
  { InstanceId: 'i-0a1b2c3d4e5f67890', InstanceType: 'm5.large', State: 'running', Region: 'us-east-1' },
  { InstanceId: 'i-0b2c3d4e5f6789012', InstanceType: 't3.medium', State: 'running', Region: 'us-east-1' },
  { InstanceId: 'i-0c3d4e5f678901234', InstanceType: 'm5.xlarge', State: 'running', Region: 'us-west-2' },
  { InstanceId: 'i-0d4e5f6789012345', InstanceType: 't3.small', State: 'stopped', Region: 'us-east-1' },
  { InstanceId: 'i-0e5f67890123456', InstanceType: 'c5.large', State: 'running', Region: 'us-west-2' },
  { InstanceId: 'i-0f678901234567', InstanceType: 't3.micro', State: 'stopped', Region: 'us-east-1' },
];

const MOCK_AWS_S3_BUCKETS: AwsS3Bucket[] = [
  { name: 'prod-app-assets', creationDate: '2025-03-12' },
  { name: 'prod-backups-nightly', creationDate: '2025-01-05' },
  { name: 'prod-logs-archive', creationDate: '2024-11-20' },
];

const MOCK_AWS_BUDGETS: AwsBudget[] = [
  { BudgetName: 'Production Monthly Budget', ActualSpend: CURRENT_MONTH_TOTAL, BudgetLimit: 12000, ForecastedSpend: 11250.5 },
];

export const MOCK_AWS_CSP_RECOMMENDATIONS: CspRecommendation[] = [
  {
    id: 'aws-csp-1', estimated_savings: 214.6, current_monthly_cost: 890.0, resource_type: 'EC2Instance',
    description: 'i-0d4e5f6789012345 has been stopped for 30+ days but still incurs EBS storage charges.', action: 'Stop',
    resource_name: 'i-0d4e5f6789012345', resource_id: 'i-0d4e5f6789012345',
  },
  {
    id: 'aws-csp-2', estimated_savings: 168.3, current_monthly_cost: 720.0, resource_type: 'EBSVolume',
    description: 'Unattached gp2 volumes detected — migrate to gp3 or delete.', action: 'RightSize',
    resource_name: 'vol-0a1b2c3d4e5f6', resource_id: 'vol-0a1b2c3d4e5f6',
  },
  {
    id: 'aws-csp-3', estimated_savings: 486.2, current_monthly_cost: 0, resource_type: 'SavingsPlan',
    description: 'Steady-state EC2/Lambda usage over the last 30 days qualifies for a 1-year Compute Savings Plan.', action: 'PurchaseSavingsPlans',
    resource_name: 'Account-wide', resource_id: MOCK_AWS_ACCOUNTS[0].id,
  },
];

const MONTHS_2025_2026: Array<{ year: number; month: number }> = [
  { year: 2025, month: 10 }, { year: 2025, month: 11 }, { year: 2025, month: 12 },
  { year: 2026, month: 1 }, { year: 2026, month: 2 }, { year: 2026, month: 3 },
  { year: 2026, month: 4 }, { year: 2026, month: 5 }, { year: 2026, month: 6 },
  { year: 2026, month: 7 }, { year: 2026, month: 8 }, { year: 2026, month: 9 },
];
const DAYS_IN_MONTH: Record<number, number> = { 1: 31, 2: 28, 3: 31, 4: 30, 5: 31, 6: 30, 7: 31, 8: 31, 9: 27, 10: 31, 11: 30, 12: 31 };

export const MOCK_AWS_YEARLY: AwsYearlyMonth[] = MONTHS_2025_2026.map(({ year, month }, index) => {
  const isCurrent = year === 2026 && month === 9;
  const total = isCurrent ? CURRENT_MONTH_TOTAL : Math.round((7200 + index * 210 + rand() * 900) * 100) / 100;
  const days = DAYS_IN_MONTH[month];
  const topServices = isCurrent ? CURRENT_MONTH_SERVICES : serviceBreakdown(total);
  return {
    year,
    month,
    totalCost: total,
    dailyCosts: isCurrent ? CURRENT_MONTH_DAILY : dailyCosts(days, total, year, month),
    topServices,
    topRegions: isCurrent ? CURRENT_MONTH_REGIONS : regionBreakdown(total),
    details: isCurrent ? [] : topServices.flatMap((service) => {
      const types = USAGE_TYPES[service.name] ?? ['Usage'];
      const weights = types.map(() => 0.5 + rand());
      const costs = distribute(service.cost, weights);
      return types.map((usageType, i) => ({ service: service.name, usageType, cost: costs[i] }));
    }),
  };
});

export const MOCK_AWS_FULL: AwsFullResponse = {
  costs: {
    totalCost: CURRENT_MONTH_TOTAL,
    forecast: Math.round(CURRENT_MONTH_TOTAL * (30 / CURRENT_MONTH_DAYS) * 100) / 100,
    dailyCosts: CURRENT_MONTH_DAILY,
    services: CURRENT_MONTH_SERVICES,
    regions: CURRENT_MONTH_REGIONS,
    // The reference keeps this on a separate live state var
    // (`detailsData`) that its own historical-month `displayData` bundle
    // never folds in for the current month — a reference quirk, not
    // reproduced here since this port resolves month-switching once, up
    // front, into a single `AwsCosts` shape every tab reads uniformly.
    details: CURRENT_MONTH_DETAILS,
  },
  resources: {
    total: RESOURCE_BY_TYPE.reduce((sum, r) => sum + r.count, 0),
    byType: RESOURCE_BY_TYPE,
  },
  budgets: MOCK_AWS_BUDGETS,
  instances: MOCK_AWS_INSTANCES,
  s3Buckets: MOCK_AWS_S3_BUCKETS,
  recommendations: MOCK_AWS_CSP_RECOMMENDATIONS,
};

export function awsAccountSummaries(): AwsAccountSummary[] {
  return [
    {
      id: MOCK_AWS_ACCOUNTS[0].id,
      totalCost: CURRENT_MONTH_TOTAL,
      todayCost: CURRENT_MONTH_DAILY[CURRENT_MONTH_DAILY.length - 1]?.cost ?? null,
      sparkline: MOCK_AWS_YEARLY.slice(-7).map((m) => Math.round(m.totalCost / 30)),
      budgetStatus: { pct: Math.round((CURRENT_MONTH_TOTAL / 12000) * 1000) / 10, name: 'Production Monthly Budget' },
    },
    {
      id: MOCK_AWS_ACCOUNTS[1].id,
      totalCost: 1265.4,
      todayCost: 41.6,
      sparkline: [38, 44, 36, 48, 45, 40, 42],
      budgetStatus: null,
    },
  ];
}

export function awsTopServicesAllAccounts(): AwsTopService[] {
  const staging = 1265.4;
  return CURRENT_MONTH_SERVICES
    .map((s) => ({ name: s.name, value: Math.round((s.cost + (staging * (0.4 + rand() * 0.8)) / AWS_SERVICE_NAMES.length) * 100) / 100 }))
    .sort((a, b) => b.value - a.value);
}
