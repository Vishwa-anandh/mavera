/**
 * Field names/shapes below mirror the reference CCM app's real AWS
 * endpoints (`GET /aws/accounts`, `/aws/summary`, `/aws/top-services`,
 * `/aws/aggregate`, `/aws/yearly`, `/recommendations?provider=aws`). This
 * prototype has no backend behind `VITE_API_URL`, so every page here
 * renders realistic mock data instead — but the shapes are real, so wiring
 * a live backend later is a data-source swap, not a rewrite.
 *
 * Two deliberate normalizations vs. the reference's own raw state (see the
 * research notes this was ported from):
 * - The reference keeps cost-line-item rows in two casings at once
 *   (`ServiceName`/`service`, `Cost`/`cost`) depending on which card reads
 *   them. Collapsed here to one shape: `{ service, usageType, cost }`.
 * - The reference's Executive-tab savings KPI reads
 *   `estimatedMonthlySavings ?? savings` while every other consumer reads
 *   `estimated_savings` on the same recommendation objects — a real bug
 *   (silently $0 optimization-savings KPIs whenever a backend only
 *   populates `estimated_savings`). Not reproduced: `CspRecommendation`
 *   here has exactly one savings field, used everywhere.
 *
 * `AwsBudget`/`AwsInstance` intentionally keep the reference's PascalCase
 * fields (`BudgetName`, `InstanceId`, ...) — those mirror the raw AWS
 * Budgets/EC2 API shapes the reference passes through unnormalized.
 */

export interface AwsAccount {
  id: string;
  name: string;
  region: string;
  /** Never the full secret — the reference API never returns it either. */
  accessKey: string;
}

export interface AwsAccountSummary {
  id: string;
  totalCost: number;
  todayCost: number | null;
  sparkline: number[];
  budgetStatus: { pct: number | null; name: string } | null;
}

export interface AwsTopService {
  name: string;
  value: number;
}

export interface AwsDailyCost {
  date: string;
  cost: number;
}

export interface AwsServiceCost {
  name: string;
  cost: number;
}

export interface AwsRegionCost {
  region: string;
  cost: number;
}

export interface AwsDetailRow {
  service: string;
  usageType: string;
  cost: number;
}

/** Resolved-for-selected-month cost data — bundles what the reference keeps
 * as several separate `useState`s (`costData`/`serviceData`/`regionData`/
 * `detailsData`/`forecast`) into one object, same simplification already
 * used for Azure's `AzureCosts`: the page shell resolves current-vs-
 * historical-month ONCE, so tabs never need month-switching logic. */
export interface AwsCosts {
  totalCost: number;
  forecast: number | null;
  dailyCosts: AwsDailyCost[];
  services: AwsServiceCost[];
  regions: AwsRegionCost[];
  /** Only ever populated for a historical month in the reference — the
   * live/current-month state never sets an equivalent field. Empty array
   * for the current month here. */
  details: AwsDetailRow[];
}

export interface AwsYearlyMonth {
  year: number;
  month: number;
  totalCost: number;
  dailyCosts: AwsDailyCost[];
  topServices: AwsServiceCost[];
  topRegions: AwsRegionCost[];
  details: AwsDetailRow[];
}

export interface AwsResourceTypeCount {
  type: string;
  count: number;
  icon: string;
}

export interface AwsResources {
  total: number;
  byType: AwsResourceTypeCount[];
}

/** Raw AWS Budgets API shape, passed through unnormalized (matches the
 * reference's own BudgetsCard.jsx). */
export interface AwsBudget {
  BudgetName: string;
  ActualSpend: number;
  BudgetLimit: number;
  ForecastedSpend: number;
}

/** Raw EC2 describe-instances shape, passed through unnormalized (matches
 * the reference's own InstancesCard.jsx). */
export interface AwsInstance {
  InstanceId: string;
  InstanceType: string;
  State: string;
  Region: string;
}

export interface AwsS3Bucket {
  name: string;
  creationDate: string;
}

/** Maitsys CSP savings recommendation — `GET /recommendations?provider=aws`.
 * Same envelope shape as Azure's equivalent; only the vocabulary inside
 * `resource_type`/`action` differs (EC2Instance/RDSDB/EBSVolume/SavingsPlan,
 * RightSize/Stop/PurchaseSavingsPlans/etc.) */
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

/** `GET /aws/aggregate` envelope, resolved into one bundle at the page
 * shell (see AwsCosts doc comment). */
export interface AwsFullResponse {
  costs: AwsCosts;
  resources: AwsResources;
  budgets: AwsBudget[];
  instances: AwsInstance[];
  s3Buckets: AwsS3Bucket[];
  recommendations: CspRecommendation[];
}
