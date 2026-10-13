import type {
  AzureAccount,
  AzureAdvisorRecommendation,
  AzureAlert,
  AzureBudget,
  AzureCosts,
  AzureDailyCost,
  AzureInvoice,
  AzureReservationUtilization,
  AzureYearlyMonth,
  CspRecommendation,
} from './azureTypes';

/**
 * Shared contract for the three cost-page tabs (Executive/Operations/
 * Technical). `data` is already resolved to whichever month is selected
 * (current live data or a historical `yearlyData` row) — tabs never need to
 * know about that switch themselves, matching the reference app's
 * `display*` variables but resolved once in the page shell instead of
 * re-derived in every card.
 */
export interface AzureCostTabProps {
  account: AzureAccount;
  data: AzureCosts;
  forecast: AzureDailyCost[];
  yearlyData: AzureYearlyMonth[];
  budgets: AzureBudget[];
  advisorRecommendations: AzureAdvisorRecommendation[];
  cspRecommendations: CspRecommendation[];
  alerts: AzureAlert[];
  invoices: AzureInvoice[];
  reservationUtilization: AzureReservationUtilization[];
  isCurrentMonth: boolean;
  hasData: boolean;
  isZeroCycle: boolean;
  mspRate: number;
  chartColors: { primary: string; secondary: string; tertiary: string; grid: string; axis: string };
  onSelectMonth: (year: number, month: number) => void;
}
