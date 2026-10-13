import type { GcpAccount, GcpCosts } from './gcpTypes';

/** Shared contract for the three cost-page tabs. Unlike Azure/AWS, GCP has
 * no month picker or yearly history in the reference — `data` is always
 * the current live snapshot. */
export interface GcpCostTabProps {
  account: GcpAccount;
  data: GcpCosts;
  mspRate: number;
  chartColors: { primary: string; secondary: string; tertiary: string; grid: string; axis: string };
}
