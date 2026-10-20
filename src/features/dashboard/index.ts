/* Public API of the dashboard feature. Other features and app/ import only from here. */
export { activeAlertsOf, alertSeverityCountsOf, budgetUtilPctOf, buildOverviewInsights, connectedProvidersOf, forecastByProviderOf, forecastEomOf, invoiceStatsOf, invoiceSummaryOf, monthlyByProviderOf, monthlyTrendOf, mspProviderRowsOf, mspSavingsTotalOf, providerMoversOf, providerTotalsOf, recommendationCountOf, spendChangePctOf, totalAccountsOf, totalBudgetOf, totalSpendOf, useDashboardData } from './model/useDashboardData';
export type { DashboardData, InvoiceItem, InvoiceSummary, ProviderKey, SmartAlertItem } from './model/useDashboardData';
export { DEFAULT_SPEND_PERIOD, SPEND_PERIOD_OPTIONS, periodTrendOf } from './model/spendPeriods';
export type { PeriodTrend, SpendPeriod } from './model/spendPeriods';
export { HomePage } from './pages/HomePage';
