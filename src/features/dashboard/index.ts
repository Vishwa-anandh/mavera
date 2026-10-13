/* Public API of the dashboard feature. Other features and app/ import only from here. */
export { activeAlertsOf, alertSeverityCountsOf, budgetUtilPctOf, buildOverviewInsights, connectedProvidersOf, forecastByProviderOf, forecastEomOf, invoiceStatsOf, monthlyTrendOf, mspProviderRowsOf, mspSavingsTotalOf, providerTotalsOf, recommendationCountOf, spendChangePctOf, totalAccountsOf, totalBudgetOf, totalSpendOf, useDashboardData } from './model/useDashboardData';
export type { DashboardData, ProviderKey, SmartAlertItem } from './model/useDashboardData';
export { HomePage } from './pages/HomePage';
