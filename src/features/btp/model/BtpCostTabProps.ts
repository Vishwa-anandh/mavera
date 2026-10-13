import type { BtpAccount, BtpCosts, BtpYearlyMonth } from './btpTypes';

/** Shared contract for the four cost-page tabs (Executive/Operations/
 * Hierarchy/Technical — BTP has one more than Azure/AWS/GCP, for the
 * directory/subaccount drill-down). Unlike Azure/AWS, BTP has no month
 * picker in the reference — `data` is always the current live snapshot;
 * `yearlyData` exists only for the MoM comparison and the 12-month trend
 * chart. */
export interface BtpCostTabProps {
  account: BtpAccount;
  data: BtpCosts;
  yearlyData: BtpYearlyMonth[];
  mspRate: number;
  chartColors: { primary: string; secondary: string; tertiary: string; grid: string; axis: string };
}
