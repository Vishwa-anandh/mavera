/**
 * Contracts for the cross-provider Cloud Cost pages (analytics, resources, reservations,
 * optimization). Every amount carries its currency: SAP BTP bills in EUR while the other
 * providers report USD, and the pages never add the two together (MAVERA_DESIGN_SYSTEM.md
 * CLOUD-03).
 */
export type CloudProviderId = 'azure' | 'aws' | 'gcp' | 'btp';

export interface MonthlyProviderCost {
  /** "YYYY-MM". */
  month: string;
  provider: CloudProviderId;
  cost: number;
  currency: string;
}

export interface CostBreakdownRow {
  provider: CloudProviderId;
  name: string;
  cost: number;
  /** Same dimension last month; null when the provider has no history for it. */
  previousCost: number | null;
  currency: string;
}

export interface CostAnalyticsDataset {
  monthly: MonthlyProviderCost[];
  services: CostBreakdownRow[];
  regions: CostBreakdownRow[];
  accounts: CostBreakdownRow[];
  /** Providers whose monthly history isn't available yet (only the current month is synced). */
  providersWithoutHistory: CloudProviderId[];
  currentMonth: string;
}

export interface CloudResource {
  id: string;
  name: string;
  provider: CloudProviderId;
  type: string;
  /** Resource group, account, subaccount or project, depending on the provider. */
  group: string;
  account: string;
  region: string | null;
  state: string;
  /** Month-to-date cost; null when the provider doesn't report cost per resource. */
  monthlyCost: number | null;
  currency: string;
  tags: Record<string, string>;
}

export interface Reservation {
  id: string;
  name: string;
  provider: CloudProviderId;
  /** e.g. "Reserved VM Instance", "Compute Savings Plan". */
  kind: string;
  service: string;
  scope: string;
  region: string | null;
  quantity: number;
  term: '1 year' | '3 years';
  start: string;
  end: string;
  /** Used share of reserved hours (or committed spend for savings plans) over the last 30 days. */
  utilizationPercent: number;
  utilizationBasis: string;
  trend: Array<{ date: string; percent: number }>;
}

/** Where in the estate a saving sits, for the "Savings by category" breakdown. */
export type OpportunityArea = 'Compute' | 'Storage' | 'Network' | 'Database' | 'Reservations' | 'Platform';

export interface OptimizationOpportunity {
  id: string;
  provider: CloudProviderId;
  title: string;
  resource: string;
  resourceId: string;
  rationale: string;
  category: 'Rightsizing' | 'Idle resources' | 'Storage tiering' | 'Commitments' | 'Consolidation';
  area: OpportunityArea;
  impact: 'High' | 'Medium' | 'Low';
  /** How much work the change is for the resource owner (a commitment is a purchase decision, deleting an orphan is not). */
  effort: 'Low' | 'Medium' | 'High';
  /** Estimated monthly saving as supplied by the source. */
  monthlySaving: number;
  currency: string;
  source: string;
  assumptions: string;
  /** Another opportunity covering the same spend; excluded from totals to avoid double counting. */
  overlapsWith?: string;
}

/**
 * How much of the identified optimisation saving had actually been applied by the end of each month
 * (0 to 1). Sample data until the backend reports implemented changes; it is what separates "realised"
 * from "potential" on the Savings Trend. Maitsys MSP discounts are always realised.
 */
export interface SavingsRealisationPoint {
  /** "YYYY-MM". */
  month: string;
  appliedShare: number;
}
