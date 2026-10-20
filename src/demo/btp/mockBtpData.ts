import type {
  BtpAccount,
  BtpAccountSummary,
  BtpCosts,
  BtpDirectory,
  BtpServiceInstance,
  BtpServicesBySubaccount,
  BtpSmConfig,
  BtpSubaccount,
  BtpTopService,
  BtpYearlyMonth,
} from '../../features/btp';

export const MOCK_BTP_ACCOUNTS: BtpAccount[] = [
  { id: 'btp-acc-1', name: 'Mavera SAP Landscape', targetUrl: 'https://reporting.cf.eu10.hana.ondemand.com', region: 'eu10', hasCis: true },
  { id: 'btp-acc-2', name: 'Mavera Sandbox', targetUrl: 'https://reporting.cf.us10.hana.ondemand.com', region: 'us10', hasCis: false },
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
const rand = mulberry32(2026);

function distribute(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => Math.round(((total * w) / sum) * 100) / 100);
}

const CURRENT_MONTH_TOTAL = 6248.9;
const SANDBOX_TOTAL = 340.2;

const BTP_SERVICE_NAMES = ['SAP HANA Cloud', 'SAP Build Apps', 'Cloud Foundry Runtime', 'SAP Integration Suite', 'Kyma Runtime', 'Object Store'];

const serviceWeights = BTP_SERVICE_NAMES.map(() => 0.4 + rand() * 1.2);
const serviceCosts = distribute(CURRENT_MONTH_TOTAL, serviceWeights);
/** Month-over-month change per service, in BTP_SERVICE_NAMES order (fixed values, so the seeded random sequence is untouched). */
const SERVICE_CHANGE = [0.08, -0.05, 0.12, 0.03, -0.11, 0];
const CURRENT_MONTH_SERVICES = BTP_SERVICE_NAMES.map((name, i) => ({ name, cost: serviceCosts[i], previousCost: Math.round((serviceCosts[i] / (1 + SERVICE_CHANGE[i])) * 100) / 100 })).sort((a, b) => b.cost - a.cost);

// --- Directory / subaccount hierarchy (Mavera SAP Landscape only) ---
const DIR_PRODUCTION: BtpDirectory = { guid: 'dir-production', displayName: 'Production', subaccountGuids: ['sub-s4h-prod', 'sub-s4h-qa'] };
const DIR_NONPROD: BtpDirectory = { guid: 'dir-nonprod', displayName: 'Non-Production', subaccountGuids: ['sub-s4h-dev'] };

const subWeights = [0.5, 0.2, 0.15, 0.15].map(() => 0.6 + rand() * 0.8);
const [prodCost, qaCost, devCost, sharedCost] = distribute(CURRENT_MONTH_TOTAL, [0.5, 0.18, 0.14, 0.18].map((w, i) => w * subWeights[i]));

export const MOCK_BTP_SUBACCOUNTS: BtpSubaccount[] = [
  { guid: 'sub-s4h-prod', displayName: 'S4H-PROD', region: 'eu10', state: 'OK', subdomain: 'mavera-s4h-prod', technicalName: 's4h-prod-a1b2c3', environmentType: 'cloudfoundry', licenseType: 'SUBSCRIPTION', description: 'S/4HANA production landscape', directoryGuid: DIR_PRODUCTION.guid, cost: prodCost },
  { guid: 'sub-s4h-qa', displayName: 'S4H-QA', region: 'eu10', state: 'OK', subdomain: 'mavera-s4h-qa', technicalName: 's4h-qa-d4e5f6', environmentType: 'cloudfoundry', licenseType: 'SUBSCRIPTION', description: 'S/4HANA QA landscape', directoryGuid: DIR_PRODUCTION.guid, cost: qaCost },
  { guid: 'sub-s4h-dev', displayName: 'S4H-DEV', region: 'us10', state: 'OK', subdomain: 'mavera-s4h-dev', technicalName: 's4h-dev-g7h8i9', environmentType: 'kyma', licenseType: 'TRIAL', description: 'Development sandbox', directoryGuid: DIR_NONPROD.guid, cost: devCost },
  { guid: 'sub-shared-services', displayName: 'Shared-Services', region: 'eu10', state: 'OK', subdomain: 'mavera-shared-svc', technicalName: 'shared-svc-j1k2l3', environmentType: 'cloudfoundry', licenseType: 'SUBSCRIPTION', description: 'Cross-landscape shared services', directoryGuid: null, cost: sharedCost },
];

export const MOCK_BTP_DIRECTORIES: BtpDirectory[] = [DIR_PRODUCTION, DIR_NONPROD];

const SERVICE_USAGE_UNITS: Record<string, string> = {
  'SAP HANA Cloud': 'GB-hours', 'SAP Build Apps': 'app-runs', 'Cloud Foundry Runtime': 'GB-hours',
  'SAP Integration Suite': 'messages', 'Kyma Runtime': 'vCPU-hours', 'Object Store': 'GB-months',
};

function servicesForSubaccount(subaccountCost: number): Array<{ name: string; cost: number; usage: number; unit?: string; planName?: string }> {
  const picked = BTP_SERVICE_NAMES.slice(0, 3 + Math.floor(rand() * 3));
  const weights = picked.map(() => 0.5 + rand());
  const costs = distribute(subaccountCost, weights);
  return picked.map((name, i) => ({ name, cost: costs[i], usage: Math.round((50 + rand() * 900) * 10) / 10, unit: SERVICE_USAGE_UNITS[name], planName: rand() > 0.5 ? 'standard' : 'lite' }));
}

export const MOCK_BTP_SERVICES_BY_SUBACCOUNT: BtpServicesBySubaccount[] = MOCK_BTP_SUBACCOUNTS.map((sub) => ({
  subaccountGuid: sub.guid,
  subaccountName: sub.displayName,
  totalCost: sub.cost,
  services: servicesForSubaccount(sub.cost),
}));

export const MOCK_BTP_SERVICE_INSTANCES: Record<string, BtpServiceInstance[]> = {
  'sub-s4h-prod': [
    { id: 'si-1', name: 'hana-prod-db', serviceOfferingName: 'SAP HANA Cloud', servicePlanName: 'hana', platformType: 'cloudfoundry', status: 'create succeeded', createdAtSm: '2025-11-02T09:00:00Z', lastSyncedAt: '2026-09-27T06:00:00Z' },
    { id: 'si-2', name: 'integration-suite-prod', serviceOfferingName: 'SAP Integration Suite', servicePlanName: 'standard_edition', platformType: 'cloudfoundry', status: 'create succeeded', createdAtSm: '2025-11-05T09:00:00Z', lastSyncedAt: '2026-09-27T06:00:00Z' },
    { id: 'si-3', name: 'build-apps-prod', serviceOfferingName: 'SAP Build Apps', servicePlanName: 'standard', platformType: 'cloudfoundry', status: 'update succeeded', createdAtSm: '2026-01-14T09:00:00Z', lastSyncedAt: '2026-09-27T06:00:00Z' },
  ],
  'sub-s4h-qa': [
    { id: 'si-4', name: 'hana-qa-db', serviceOfferingName: 'SAP HANA Cloud', servicePlanName: 'hana', platformType: 'cloudfoundry', status: 'create succeeded', createdAtSm: '2025-11-10T09:00:00Z', lastSyncedAt: '2026-09-27T06:00:00Z' },
  ],
};

export const MOCK_BTP_SM_CONFIGS: Record<string, BtpSmConfig> = {
  'sub-s4h-prod': { lastSyncedAt: '2026-09-27T06:00:00Z', syncStatus: 'succeeded' },
  'sub-s4h-qa': { lastSyncedAt: '2026-09-26T18:00:00Z', syncStatus: 'succeeded' },
};

const MONTHS_2025_2026: Array<{ year: number; month: number }> = [
  { year: 2025, month: 10 }, { year: 2025, month: 11 }, { year: 2025, month: 12 },
  { year: 2026, month: 1 }, { year: 2026, month: 2 }, { year: 2026, month: 3 },
  { year: 2026, month: 4 }, { year: 2026, month: 5 }, { year: 2026, month: 6 },
  { year: 2026, month: 7 }, { year: 2026, month: 8 }, { year: 2026, month: 9 },
];

export const MOCK_BTP_YEARLY: BtpYearlyMonth[] = MONTHS_2025_2026.map(({ year, month }, index) => {
  const isCurrent = year === 2026 && month === 9;
  const total = isCurrent ? CURRENT_MONTH_TOTAL : Math.round((4800 + index * 140 + rand() * 700) * 100) / 100;
  return { year, month, totalCost: total };
});

const ENVIRONMENTS = ['cloudfoundry', 'kyma'];
const envWeights = ENVIRONMENTS.map(() => 0.5 + rand());
const envCosts = distribute(CURRENT_MONTH_TOTAL, envWeights);

export const MOCK_BTP_COSTS: BtpCosts = {
  currency: 'EUR',
  totalCost: CURRENT_MONTH_TOTAL,
  monthlySamples: MOCK_BTP_YEARLY.map((m) => ({ date: `${m.year}-${String(m.month).padStart(2, '0')}`, cost: m.totalCost })),
  services: CURRENT_MONTH_SERVICES,
  topServices: CURRENT_MONTH_SERVICES,
  environments: ENVIRONMENTS.map((type, i) => ({ type, cost: envCosts[i] })),
  forecastData: [
    { month: 'Sep 2026', projected_cost: Math.round(CURRENT_MONTH_TOTAL * (30 / 27) * 100) / 100 },
    { month: 'Oct 2026', projected_cost: Math.round(CURRENT_MONTH_TOTAL * (30 / 27) * 1.03 * 100) / 100 },
    { month: 'Nov 2026', projected_cost: Math.round(CURRENT_MONTH_TOTAL * (30 / 27) * 1.05 * 100) / 100 },
  ],
  subaccounts: MOCK_BTP_SUBACCOUNTS.map((s) => ({ name: s.displayName, cost: s.cost })),
  directories: MOCK_BTP_DIRECTORIES,
  subaccountHierarchy: MOCK_BTP_SUBACCOUNTS,
  globalAccount: { displayName: 'Mavera SAP Landscape', commercialModel: 'CPEA', licenseType: 'SUBSCRIPTION', contractStatus: 'ACTIVE', currency: 'EUR' },
  cisSucceeded: true,
  servicesBySubaccount: MOCK_BTP_SERVICES_BY_SUBACCOUNT,
};

/** The Sandbox account has no CIS_Central configured — flat subaccount cost
 * list only, matching the reference's graceful-degradation path. */
export const MOCK_BTP_COSTS_SANDBOX: BtpCosts = {
  currency: 'EUR',
  totalCost: SANDBOX_TOTAL,
  monthlySamples: MOCK_BTP_YEARLY.map((m) => ({ date: `${m.year}-${String(m.month).padStart(2, '0')}`, cost: Math.round(m.totalCost * 0.05 * 100) / 100 })),
  services: [{ name: 'Cloud Foundry Runtime', cost: SANDBOX_TOTAL * 0.7 }, { name: 'Object Store', cost: SANDBOX_TOTAL * 0.3 }],
  topServices: [{ name: 'Cloud Foundry Runtime', cost: SANDBOX_TOTAL * 0.7 }, { name: 'Object Store', cost: SANDBOX_TOTAL * 0.3 }],
  environments: [{ type: 'cloudfoundry', cost: SANDBOX_TOTAL }],
  forecastData: [{ month: 'Sep 2026', projected_cost: Math.round(SANDBOX_TOTAL * (30 / 27) * 100) / 100 }],
  subaccounts: [{ name: 'sandbox-trial', cost: SANDBOX_TOTAL }],
  directories: [],
  subaccountHierarchy: [],
  globalAccount: null,
  cisSucceeded: false,
  servicesBySubaccount: [],
};

export function btpAccountSummaries(): BtpAccountSummary[] {
  return [
    { id: MOCK_BTP_ACCOUNTS[0].id, totalCost: CURRENT_MONTH_TOTAL, currency: 'EUR', snapshotTime: '2026-09-27T06:00:00Z', region: 'eu10' },
    { id: MOCK_BTP_ACCOUNTS[1].id, totalCost: SANDBOX_TOTAL, currency: 'EUR', snapshotTime: '2026-09-27T05:00:00Z', region: 'us10' },
  ];
}

export function btpTopServices(): BtpTopService[] {
  return CURRENT_MONTH_SERVICES;
}

export function btpCostsForAccount(accountId: string): BtpCosts {
  return accountId === MOCK_BTP_ACCOUNTS[1].id ? MOCK_BTP_COSTS_SANDBOX : MOCK_BTP_COSTS;
}
