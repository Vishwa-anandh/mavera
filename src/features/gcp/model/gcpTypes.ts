/**
 * Field names/shapes mirror the reference CCM app's real GCP endpoints
 * (`GET /gcp/accounts`, `/gcp/summary`, `/gcp/top-services`). This
 * prototype has no backend behind `VITE_API_URL`, so every page here
 * renders realistic mock data instead — but the shapes are real, so wiring
 * a live backend later is a data-source swap, not a rewrite.
 */

export interface GcpAccount {
  id: string;
  name: string;
  projectId: string;
}

export interface GcpAccountSummary {
  id: string;
  name: string;
  totalCost: number;
  /** ISO timestamp of the last cost sync, or null if never synced. */
  snapshotTime: string | null;
}

export interface GcpTopService {
  name: string;
  cost: number;
}

export interface GcpDailyCost {
  date: string;
  cost: number;
}

export interface GcpServiceCost {
  name: string;
  cost: number;
  percent: number;
}

export interface GcpNamedCost {
  name: string;
  cost: number;
}

export interface GcpForecastMonth {
  month: string;
  projected_cost: number;
}

/**
 * `GET /gcp/costs` response. Notably leaner than Azure/AWS's equivalent —
 * confirmed via research that this reference page has no month picker, no
 * yearly-history endpoint, and no itemized CSP recommendation list; the
 * Maitsys CSP savings figure here is a flat `totalCost * mspRate`
 * calculation only.
 */
export interface GcpCosts {
  totalCost: number;
  currency: string;
  dailyCosts: GcpDailyCost[];
  services: GcpServiceCost[];
  projects: GcpNamedCost[];
  locations: GcpNamedCost[];
  forecastData: GcpForecastMonth[];
  resourceTypes: GcpNamedCost[];
  snapshotTime: string | null;
}
