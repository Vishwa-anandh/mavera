/**
 * Field names/shapes mirror the reference CCM app's real BTP endpoints
 * (`GET /btp/accounts`, `/btp/costs`, `/btp/yearly`, `/btp/summary`,
 * `/btp/top-services`, `/btp/service-manager/*`). This prototype has no
 * backend behind `VITE_API_URL`, so every page here renders realistic mock
 * data instead — but the shapes are real, so wiring a live backend later
 * is a data-source swap, not a rewrite.
 *
 * BTP's hierarchy is 3 levels: Global Account (= our `BtpAccount` — the
 * connection the user adds) → Directory (optional organizational folder,
 * only present when CIS_Central is configured) → Subaccount (the real
 * spend/entitlement unit, BTP's rough equivalent of an Azure subscription
 * or AWS linked account) → Service Instances (Cloud Foundry/Kyma service
 * bindings, discovered via a third, per-subaccount credential set).
 *
 * The reference joins COST_API's flat subaccount cost rows to CIS's
 * directory/subaccount metadata tree client-side, by fragile
 * case-insensitive name matching. This port does that join once, server
 * side (i.e. in mockBtpData.ts), so `BtpSubaccount` below is already one
 * canonical merged shape with `cost` included — no spread-everywhere
 * matching logic needed in the UI layer.
 */

export interface BtpAccount {
  id: string;
  name: string;
  targetUrl: string;
  region?: string;
  /** Whether CIS_Central (the optional 2nd credential set) is configured —
   * without it, only a flat subaccount cost list is available, no
   * directory tree. */
  hasCis: boolean;
  /** True for an account connected in this session: its cost data is the provider's sample dataset ("Sample data"). */
  sample?: boolean;
}

export interface BtpDirectory {
  guid: string;
  displayName: string;
  /** guids of member subaccounts — resolved against `subaccountHierarchy`. */
  subaccountGuids: string[];
}

/** Canonical merged subaccount — COST_API's cost figure plus CIS's rich
 * metadata, already joined (see module doc comment). */
export interface BtpSubaccount {
  guid: string;
  displayName: string;
  region: string;
  state: string;
  subdomain: string;
  technicalName: string;
  environmentType: string;
  licenseType: string;
  description?: string;
  /** null when this subaccount isn't a member of any directory ("Direct
   * Sub-Accounts - No Directory" in the reference). */
  directoryGuid: string | null;
  cost: number;
}

export interface BtpServiceInstance {
  id: string;
  name: string;
  serviceOfferingName: string;
  servicePlanName: string;
  platformType: string;
  status: string;
  createdAtSm: string;
  lastSyncedAt: string;
}

export interface BtpSmConfig {
  lastSyncedAt: string | null;
  syncStatus: 'syncing' | 'failed' | 'succeeded' | null;
  syncError?: string;
}

export interface BtpSubaccountService {
  name: string;
  cost: number;
  usage: number;
  unit?: string;
  planName?: string;
}

export interface BtpServicesBySubaccount {
  subaccountGuid: string;
  subaccountName: string;
  totalCost: number;
  services: BtpSubaccountService[];
}

export interface BtpEnvironmentCost {
  type: string;
  cost: number;
}

export interface BtpNamedCost {
  name: string;
  cost: number;
}

export interface BtpForecastMonth {
  month: string;
  projected_cost: number;
}

export interface BtpGlobalAccountInfo {
  displayName: string;
  commercialModel: string;
  licenseType: string;
  contractStatus: string;
  currency: string;
}

/** `GET /btp/costs` response — the reference names this page's monthly
 * series `dailyCosts` despite it actually holding month buckets (confirmed
 * via research); named `monthlySamples` here instead since that's what it
 * really is. */
export interface BtpCosts {
  currency: string;
  totalCost: number;
  monthlySamples: Array<{ date: string; cost: number }>;
  services: BtpNamedCost[];
  topServices: BtpNamedCost[];
  environments: BtpEnvironmentCost[];
  forecastData: BtpForecastMonth[];
  /** Flat COST_API subaccount cost rows — always present regardless of CIS. */
  subaccounts: BtpNamedCost[];
  directories: BtpDirectory[];
  /** CIS-derived subaccount metadata, cost already merged in (see module
   * doc comment) — empty when `cisSucceeded` is false. */
  subaccountHierarchy: BtpSubaccount[];
  globalAccount: BtpGlobalAccountInfo | null;
  cisSucceeded: boolean;
  servicesBySubaccount: BtpServicesBySubaccount[];
}

export interface BtpYearlyMonth {
  year: number;
  month: number;
  totalCost: number;
}

export interface BtpTopService {
  name: string;
  cost: number;
  /** Same service last month; absent when there is nothing to compare with. */
  previousCost?: number;
}

export interface BtpAccountSummary {
  id: string;
  totalCost: number;
  currency: string;
  snapshotTime: string | null;
  region?: string;
}
