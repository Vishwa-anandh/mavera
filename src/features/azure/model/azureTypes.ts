/**
 * Field names and shapes below mirror the reference CCM app's real Azure
 * endpoints exactly (see the reconnaissance in this session's history —
 * `GET /azure/accounts`, `/azure/summary`, `/azure/full`, `/azure/yearly`,
 * `/recommendations?provider=azure`). This prototype has no backend behind
 * `VITE_API_URL`, so every page here renders realistic mock data instead —
 * but the shapes are real, so wiring a live backend later is a data-source
 * swap, not a rewrite.
 */

export interface AzureAccount {
  id: string;
  name: string;
  subscriptionId: string;
  tenantId: string;
  clientId: string;
}

export interface AzureAccountSummary {
  id: string;
  name: string;
  subscriptionId: string;
  totalCost: number;
  todayCost: number | null;
  sparkline: number[];
  budgetStatus: { pct: number | null; name: string } | null;
}

export interface AzureTopService {
  name: string;
  value: number;
}

export interface AzureDailyCost {
  date: string;
  cost: number;
}

export interface AzureServiceCost {
  name: string;
  cost: number;
}

export interface AzureResourceCost {
  id: string;
  name: string;
  service: string;
  cost: number;
  resourceGroup?: string;
}

export interface AzureNamedCost {
  name: string;
  cost: number;
}

export interface AzureResourceTypeCount {
  type: string;
  count: number;
}

export interface AzureResourceItem {
  id: string;
  name: string;
  type: string;
  resourceGroup: string;
  cost: number;
  hasSpend: boolean;
}

export interface AzureResources {
  total: number;
  active: number;
  byType: AzureResourceTypeCount[];
  allResources: AzureResourceItem[];
}

/** `GET /azure/full` → `costs` */
export interface AzureCosts {
  totalCost: number;
  forecast: number;
  currency: string;
  dailyCosts: AzureDailyCost[];
  services: AzureServiceCost[];
  topResources: AzureResourceCost[];
  resourceGroups: AzureNamedCost[];
  locations: AzureNamedCost[];
  resources: AzureResources;
  forecastData: AzureDailyCost[];
}

export interface AzureBudget {
  name: string;
  amount: number;
  currentSpend: { amount: number };
}

/** Azure Advisor recommendation (distinct from Maitsys CSP recommendations). */
export interface AzureAdvisorRecommendation {
  shortDescription: { problem: string; solution: string };
  extendedProperties: Record<string, string>;
  impact: 'High' | 'Medium' | 'Low';
  category: string;
}

export interface AzureAlert {
  name: string;
  description: string;
}

export interface AzureInvoice {
  billingPeriod: string;
  invoiceDate: string;
  totalAmount: { amount: number };
  name: string;
  downloadUrl?: string;
}

export interface AzureReservationUtilization {
  usageDate: string;
  utilizationPercentage: number;
}

/** Maitsys CSP savings recommendation — `GET /recommendations?provider=azure`. */
export interface CspRecommendation {
  id: string;
  estimated_savings: number;
  current_monthly_cost: number;
  resource_type: string;
  description: string;
  action: string;
  resource_name: string;
  resource_id: string;
}

/** `GET /azure/full` envelope. */
export interface AzureFullResponse {
  costs: AzureCosts;
  budgets: AzureBudget[];
  recommendations: AzureAdvisorRecommendation[];
  alerts: AzureAlert[];
  invoices: AzureInvoice[];
  reservationRecommendations: unknown[];
  reservationUtilization: AzureReservationUtilization[];
  billingMetadata: { name?: string } | null;
}

/** One row of `GET /azure/yearly`. */
export interface AzureYearlyMonth {
  year: number;
  month: number;
  totalCost: number;
  dailyCosts: AzureDailyCost[];
  topServices: AzureServiceCost[];
  resourceGroups: AzureNamedCost[];
  locations: AzureNamedCost[];
}
