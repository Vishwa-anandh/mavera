import type { GcpAccount, GcpAccountSummary, GcpCosts, GcpTopService } from '../../features/gcp';

export const MOCK_GCP_ACCOUNTS: GcpAccount[] = [
  { id: 'gcp-acc-1', name: 'Production GCP', projectId: 'mavera-prod-482913' },
  { id: 'gcp-acc-2', name: 'Analytics GCP', projectId: 'mavera-analytics-118820' },
];

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(101);

const GCP_SERVICE_NAMES = ['Compute Engine', 'Cloud Storage', 'BigQuery', 'Google Kubernetes Engine', 'Cloud SQL'];

function distribute(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => Math.round(((total * w) / sum) * 100) / 100);
}

const CURRENT_MONTH_TOTAL = 4360.85;

export function gcpAccountSummaries(): GcpAccountSummary[] {
  return [
    { id: MOCK_GCP_ACCOUNTS[0].id, name: MOCK_GCP_ACCOUNTS[0].name, totalCost: CURRENT_MONTH_TOTAL, snapshotTime: '2026-09-27T06:00:00Z' },
    { id: MOCK_GCP_ACCOUNTS[1].id, name: MOCK_GCP_ACCOUNTS[1].name, totalCost: 1180.4, snapshotTime: '2026-09-27T05:30:00Z' },
  ];
}

export function gcpTopServices(): GcpTopService[] {
  const weights = GCP_SERVICE_NAMES.map(() => 0.4 + rand() * 1.2);
  const costs = distribute(CURRENT_MONTH_TOTAL, weights);
  return GCP_SERVICE_NAMES.map((name, i) => ({ name, cost: costs[i] })).sort((a, b) => b.cost - a.cost);
}

const GCP_PROJECTS = ['mavera-prod-482913', 'mavera-analytics-118820', 'mavera-shared-services-004417'];
const GCP_LOCATIONS = ['us-central1', 'europe-west1', 'asia-east1'];
const GCP_RESOURCE_TYPES = ['Compute Instance', 'Storage Bucket', 'BigQuery Dataset', 'GKE Cluster', 'Cloud SQL Instance'];

function dailyCosts(daysInMonth: number, monthTotal: number): { date: string; cost: number }[] {
  const weights = Array.from({ length: daysInMonth }, () => 0.6 + rand() * 0.8);
  const costs = distribute(monthTotal, weights);
  return costs.map((cost, i) => ({ date: `2026-09-${String(i + 1).padStart(2, '0')}`, cost }));
}

export const MOCK_GCP_COSTS: GcpCosts = (() => {
  const services = gcpTopServices();
  const servicesWithPercent = services.map((s) => ({ ...s, percent: Math.round((s.cost / CURRENT_MONTH_TOTAL) * 1000) / 10 }));

  const projectWeights = GCP_PROJECTS.map(() => 0.4 + rand() * 1.2);
  const projectCosts = distribute(CURRENT_MONTH_TOTAL, projectWeights);
  const projects = GCP_PROJECTS.map((name, i) => ({ name, cost: projectCosts[i] })).sort((a, b) => b.cost - a.cost);

  const locationWeights = GCP_LOCATIONS.map(() => 0.4 + rand() * 1.2);
  const locationCosts = distribute(CURRENT_MONTH_TOTAL, locationWeights);
  const locations = GCP_LOCATIONS.map((name, i) => ({ name, cost: locationCosts[i] })).sort((a, b) => b.cost - a.cost);

  const resourceWeights = GCP_RESOURCE_TYPES.map(() => 0.4 + rand() * 1.2);
  const resourceCosts = distribute(CURRENT_MONTH_TOTAL, resourceWeights);
  const resourceTypes = GCP_RESOURCE_TYPES.map((name, i) => ({ name, cost: resourceCosts[i] })).sort((a, b) => b.cost - a.cost);

  const eomForecast = Math.round(CURRENT_MONTH_TOTAL * (30 / 27) * 100) / 100;

  return {
    totalCost: CURRENT_MONTH_TOTAL,
    currency: 'USD',
    dailyCosts: dailyCosts(27, CURRENT_MONTH_TOTAL),
    services: servicesWithPercent,
    projects,
    locations,
    forecastData: [
      { month: 'Sep 2026', projected_cost: eomForecast },
      { month: 'Oct 2026', projected_cost: Math.round(eomForecast * 1.03 * 100) / 100 },
      { month: 'Nov 2026', projected_cost: Math.round(eomForecast * 1.05 * 100) / 100 },
    ],
    resourceTypes,
    snapshotTime: '2026-09-27T06:00:00Z',
  };
})();
