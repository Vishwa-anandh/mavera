import {
  CSP_DISCOUNT_RATES,
  budgetsRepository,
  cloudInsightsRepository,
  smartAlertsRepository,
  workspaceRepository,
  type WorkspaceProvider,
} from '../../../data-access';
import type {
  DashboardData, DashboardMonthlyRow, DashboardSource, DashboardSummary, InvoiceItem, MspSavings, ProviderKey, RecommendationsResponse, SmartAlertItem,
} from './useDashboardData';
import { DEMO_LAST_DAY, DEMO_MONTHLY, demoDailySpend } from './demoSpendHistory';

/*
 * What the dashboard shows for a brand-new organisation (the "New organisation" demo account): only what it has
 * connected. Nothing connected means zero spend, no accounts and no history, so the page can offer its first
 * connection; once accounts exist, every figure is built from the same sample dataset the provider pages show for
 * them, so the dashboard, Cost Overview, alerts and the assistant all agree.
 */
const PROVIDERS: ProviderKey[] = ['azure', 'aws', 'btp', 'gcp'];
const round = (n: number) => Math.round(n * 100) / 100;
/** September's sample forecast is month-to-date through the 28th, projected over a 30-day month. */
const FORECAST_FACTOR = 30 / 28;

const loaded = <T,>(data: T): DashboardSource<T> => ({ data, loading: false, error: null });

const SAMPLE_LAST_MONTH = DEMO_MONTHLY[DEMO_MONTHLY.length - 1];

/** The sample monthly history re-scaled so the current month equals what the connected accounts spend. */
function scaledMonthly(totals: Record<ProviderKey, number>): DashboardMonthlyRow[] {
  const factor = (provider: ProviderKey) => (SAMPLE_LAST_MONTH[provider] > 0 ? totals[provider] / SAMPLE_LAST_MONTH[provider] : 0);
  return DEMO_MONTHLY.map((row) => {
    const scaled = { azure: round(row.azure * factor('azure')), aws: round(row.aws * factor('aws')), btp: round(row.btp * factor('btp')), gcp: round(row.gcp * factor('gcp')) };
    return { key: row.key, ...scaled, total: round(scaled.azure + scaled.aws + scaled.btp + scaled.gcp) };
  });
}

export function newOrganisationData(invoices: InvoiceItem[]): DashboardData {
  const spend = workspaceRepository.sampleSpend();
  const totals: Record<ProviderKey, number> = { azure: 0, aws: 0, btp: 0, gcp: 0 };
  for (const row of spend) totals[row.provider] = row.total;
  const connected = spend.length > 0;
  const grand = PROVIDERS.reduce((sum, p) => sum + totals[p], 0);

  const accountIds = (provider: WorkspaceProvider) => workspaceRepository.listAccounts(provider).map((a) => ({ id: a.id }));
  const monthly = connected ? scaledMonthly(totals) : [];
  const summary: DashboardSummary = {
    totals: {
      ...totals,
      forecast: connected ? round(grand * FORECAST_FACTOR) : null,
      forecastByProvider: Object.fromEntries(spend.map((row) => [row.provider, round(row.total * FORECAST_FACTOR)])),
    },
    accounts: { azure: accountIds('azure'), aws: accountIds('aws'), btp: accountIds('btp'), gcp: accountIds('gcp') },
    monthly,
    daily: connected ? demoDailySpend(monthly, '2026-07', DEMO_LAST_DAY) : [],
  };

  const opportunities = cloudInsightsRepository.listOptimizationOpportunities();
  const counted = opportunities.filter((o) => !o.overlapsWith || !opportunities.some((x) => x.id === o.overlapsWith));
  const recommendations: RecommendationsResponse = {
    data: opportunities.map((o) => ({ id: o.id, estimated_savings: o.monthlySaving })),
    summary: { totalRecommendations: opportunities.length, totalEstimatedSavings: round(counted.reduce((sum, o) => sum + o.monthlySaving, 0)) },
  };

  const alerts: SmartAlertItem[] = smartAlertsRepository.list()
    .sort((a, b) => b.detected_at.localeCompare(a.detected_at))
    .map((a) => ({ id: a.id, severity: a.severity, status: a.ignored || a.status === 'resolved' ? 'resolved' : 'open', title: a.message, alert_type: a.alert_type, detected_at: a.detected_at }));

  const breakdown = spend.map((row) => {
    const rate = CSP_DISCOUNT_RATES[row.provider];
    return { provider: row.provider, totalCost: row.total, savingsRate: rate, savingsAmount: round(row.total * rate) };
  });
  const mspSavings: MspSavings = { totalSpend: grand, totalSavings: round(breakdown.reduce((sum, row) => sum + row.savingsAmount, 0)), invoiceSavings: null, breakdown };

  return {
    summary: loaded(summary),
    recommendations: loaded(recommendations),
    smartAlerts: loaded({ alerts, summary: { bySeverity: {} } }),
    budgets: loaded(budgetsRepository.listBudgets().map((b) => ({ id: b.id, target_amount: b.target_amount }))),
    mspSavings: loaded(mspSavings),
    invoices: loaded({ data: invoices }),
  };
}
