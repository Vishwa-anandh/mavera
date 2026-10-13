import type { AwsAccount, AwsBudget, AwsCosts, AwsDailyCost, AwsInstance, AwsResources, AwsS3Bucket, AwsYearlyMonth, CspRecommendation } from './awsTypes';

/**
 * Shared contract for the three cost-page tabs (Executive/Operations/
 * Technical). `data` is already resolved to whichever month is selected
 * (current live data or a historical `yearlyData` row) — tabs never need
 * to know about that switch themselves. Same pattern as Azure's
 * AzureCostTabProps.
 */
export interface AwsCostTabProps {
  account: AwsAccount;
  data: AwsCosts;
  forecastSeries: AwsDailyCost[];
  yearlyData: AwsYearlyMonth[];
  resources: AwsResources;
  budgets: AwsBudget[];
  instances: AwsInstance[];
  s3Buckets: AwsS3Bucket[];
  cspRecommendations: CspRecommendation[];
  isCurrentMonth: boolean;
  hasData: boolean;
  mspRate: number;
  chartColors: { primary: string; secondary: string; tertiary: string; grid: string; axis: string };
  onSelectMonth: (year: number, month: number) => void;
}
