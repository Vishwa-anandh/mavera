import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '../layouts/AppShell';
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage, SubscriptionExpiredPage } from '../../features/auth';
import { HomePage } from '../../features/dashboard';
import { CostAnalyticsPage, CostOverviewPage, OptimizationAdvisorPage, ReservationsPage, ResourceInventoryPage } from '../../features/cloud';
import {
  BtpSecurityPage,
  HanaMonitoringPage,
  SapAlertsPage,
  SapDumpsPage,
  SapHealthPage,
  SapJobsPage,
  SapOverviewPage,
  SapPerformancePage,
  SapTeamManagementPage,
  SecurityNotesPage,
  SystemConfigurationPage,
  TransportManagementPage,
} from '../../features/sap';
import { FailedIdocsPage, IdocAlertsReportsPage, IdocAnalyticsPage, IdocOverviewPage, IdocTrafficPage, PartnerMonitoringPage, ProcessingStatusPage } from '../../features/idoc';
import { AccountPage } from '../../features/account';
import { AlertsPage } from '../../features/alerts';
import { ReportsPage } from '../../features/reports';
import { AiAssistantPage } from '../../features/assistant';
import { NotFoundPage } from '../../features/system';
import { AzureCostPage, AzureRoot } from '../../features/azure';
import { AwsRoot } from '../../features/aws';
import { GcpRoot } from '../../features/gcp';
import { BtpRoot } from '../../features/btp';
import { BudgetsPage } from '../../features/budgets';
import { RecommendationsPage } from '../../features/recommendations';
import { SmartAlertsPage } from '../../features/smartAlerts';
import { SubscriptionPage } from '../../features/subscription';
import { UserManagementPage } from '../../features/users';
import { SyncLogsPage } from '../../features/syncLogs';
import { InvoicesPage } from '../../features/invoices';
import { BillingPage, CustomersPage, GenerateInvoicePage, PublicInvoicePage } from '../../features/billing';
import {
  SuperAdminBillingPage,
  SuperAdminGuard,
  SuperAdminOrganizationPage,
  SuperAdminOrganizationsPage,
  SuperAdminOverviewPage,
  SuperAdminShell,
} from '../../features/superAdmin';
import { appPaths } from './route-manifest';

/** Every path comes from route-manifest.ts; nothing here spells out a URL. */
export function AppRoutes() {
  return (
    <Routes>
      <Route path={appPaths.login} element={<LoginPage />} />
      <Route path={appPaths.register} element={<RegisterPage />} />
      <Route path={appPaths.forgotPassword} element={<ForgotPasswordPage />} />
      <Route path={appPaths.resetPassword} element={<ResetPasswordPage />} />
      <Route path={appPaths.subscriptionExpired} element={<SubscriptionExpiredPage />} />

      {/* Fully public — reached only via the token embedded in a "sent" invoice email link,
          no login, no app shell. */}
      <Route path={appPaths.publicInvoice} element={<PublicInvoicePage />} />

      {/* Super Admin portal: its own session (sa_token), no org nav/shell — entirely separate from
          the org-level app below. There's no dedicated Super Admin login page: the unified /login
          form routes Super Admin credentials into this portal, so an old link/bookmark to
          /admin/login just lands there instead. */}
      <Route path={appPaths.adminLogin} element={<Navigate to={appPaths.login} replace />} />
      {/* Invoice building is a Maitsys super-admin tool; the old org-side URL forwards to it (the
          guard sends anyone without a super-admin session to sign in). */}
      <Route path={appPaths.invoiceBuilder} element={<Navigate to={appPaths.adminBillingGenerate} replace />} />
      <Route element={<SuperAdminGuard />}>
        <Route element={<SuperAdminShell />}>
          <Route path={appPaths.adminDashboard} element={<SuperAdminOverviewPage />} />
          <Route path={appPaths.adminOrganizations} element={<SuperAdminOrganizationsPage />} />
          <Route path={appPaths.adminOrganizationNew} element={<SuperAdminOrganizationPage />} />
          <Route path={appPaths.adminOrganization} element={<SuperAdminOrganizationPage />} />
          <Route path={appPaths.adminBilling} element={<SuperAdminBillingPage />} />
          <Route path={appPaths.adminBillingGenerate} element={<GenerateInvoicePage />} />
          <Route path={appPaths.adminBillingCustomers} element={<CustomersPage />} />
        </Route>
      </Route>

      <Route element={<AppShell />}>
        <Route path={appPaths.root} element={<HomePage />} />
        <Route path={appPaths.costOverview} element={<CostOverviewPage />} />
        <Route path={appPaths.azure} element={<AzureRoot />} />
        <Route path={appPaths.azureAccount} element={<AzureCostPage />} />
        <Route path={appPaths.aws} element={<AwsRoot />} />
        <Route path={appPaths.gcp} element={<GcpRoot />} />
        <Route path={appPaths.btp} element={<BtpRoot />} />
        <Route path={appPaths.budgets} element={<BudgetsPage />} />
        <Route path={appPaths.recommendations} element={<RecommendationsPage />} />
        <Route path={appPaths.smartAlerts} element={<SmartAlertsPage />} />
        <Route path={appPaths.sapSystems} element={<SapOverviewPage />} />
        <Route path={appPaths.sapDatabases} element={<HanaMonitoringPage />} />
        <Route path={appPaths.sapHealth} element={<SapHealthPage />} />
        <Route path={appPaths.sapJobs} element={<SapJobsPage />} />
        <Route path={appPaths.sapDumps} element={<SapDumpsPage />} />
        <Route path={appPaths.sapPerformance} element={<SapPerformancePage />} />
        <Route path={appPaths.sapAlerts} element={<SapAlertsPage />} />
        <Route path={appPaths.sapTransport} element={<TransportManagementPage />} />
        <Route path={appPaths.sapSecurityNotes} element={<SecurityNotesPage />} />
        <Route path={appPaths.sapBtpSecurity} element={<BtpSecurityPage />} />
        <Route path={appPaths.sapTeam} element={<SapTeamManagementPage />} />
        <Route path={appPaths.sapConfiguration} element={<SystemConfigurationPage />} />
        <Route path={appPaths.idocOverview} element={<IdocOverviewPage />} />
        <Route path={appPaths.alerts} element={<AlertsPage />} />
        <Route path={appPaths.reports} element={<ReportsPage />} />
        <Route path={appPaths.aiAssistant} element={<AiAssistantPage />} />
        <Route path={appPaths.account} element={<AccountPage />} />
        <Route path={appPaths.subscription} element={<SubscriptionPage />} />
        <Route path={appPaths.users} element={<UserManagementPage />} />
        <Route path={appPaths.syncLogs} element={<SyncLogsPage />} />
        <Route path={appPaths.invoices} element={<InvoicesPage />} />
        <Route path={appPaths.billing} element={<BillingPage />} />
        <Route path={appPaths.cloudAnalytics} element={<CostAnalyticsPage />} />
        <Route path={appPaths.cloudOptimization} element={<OptimizationAdvisorPage />} />
        <Route path={appPaths.cloudReservations} element={<ReservationsPage />} />
        <Route path={appPaths.cloudResources} element={<ResourceInventoryPage />} />
        <Route path={appPaths.idocTraffic} element={<IdocTrafficPage />} />
        <Route path={appPaths.idocFailed} element={<FailedIdocsPage />} />
        <Route path={appPaths.idocStatus} element={<ProcessingStatusPage />} />
        <Route path={appPaths.idocAnalytics} element={<IdocAnalyticsPage />} />
        <Route path={appPaths.idocPartners} element={<PartnerMonitoringPage />} />
        <Route path={appPaths.idocAlertsReports} element={<IdocAlertsReportsPage />} />
      </Route>

      <Route path={appPaths.catchAll} element={<NotFoundPage />} />
    </Routes>
  );
}
