import { Suspense, lazy, type ComponentType, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from '../layouts/AppShell';
import { CompanySignupPage, ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage, SubscriptionExpiredPage } from '../../features/auth';
import { NotFoundPage } from '../../features/system';
import { PublicInvoicePage } from '../../features/billing';
import { InvoiceDemoPage } from '../../features/invoiceDemo';
import { SetupPage, SetupRedirect } from '../../features/setup';
import { SuperAdminGuard, SuperAdminShell } from '../../features/superAdmin';
import { PageSkeleton, type PageSkeletonVariant } from '../../shared/ui/PageSkeleton';
import { appPaths } from './route-manifest';

/**
 * Signed-in pages load on demand, so the first screen ships less code and every page shows its skeleton while
 * its code arrives. `lazyPage` picks one named export from a feature's public index.
 */
function lazyPage<M extends Record<string, unknown>>(load: () => Promise<M>, name: keyof M & string) {
  return lazy(async () => ({ default: (await load())[name] as ComponentType }));
}

const HomePage = lazyPage(() => import('../../features/dashboard'), 'HomePage');
const CostAnalyticsPage = lazyPage(() => import('../../features/cloud'), 'CostAnalyticsPage');
const CostOverviewPage = lazyPage(() => import('../../features/cloud'), 'CostOverviewPage');
const OptimizationAdvisorPage = lazyPage(() => import('../../features/cloud'), 'OptimizationAdvisorPage');
const ReservationsPage = lazyPage(() => import('../../features/cloud'), 'ReservationsPage');
const ResourceInventoryPage = lazyPage(() => import('../../features/cloud'), 'ResourceInventoryPage');
const BtpSecurityPage = lazyPage(() => import('../../features/sap'), 'BtpSecurityPage');
const HanaMonitoringPage = lazyPage(() => import('../../features/sap'), 'HanaMonitoringPage');
const SapAlertsPage = lazyPage(() => import('../../features/sap'), 'SapAlertsPage');
const SapJobsPage = lazyPage(() => import('../../features/sap'), 'SapJobsPage');
const SapOverviewPage = lazyPage(() => import('../../features/sap'), 'SapOverviewPage');
const SapPerformancePage = lazyPage(() => import('../../features/sap'), 'SapPerformancePage');
const SecurityNotesPage = lazyPage(() => import('../../features/sap'), 'SecurityNotesPage');
const SystemConfigurationPage = lazyPage(() => import('../../features/sap'), 'SystemConfigurationPage');
const TransportManagementPage = lazyPage(() => import('../../features/sap'), 'TransportManagementPage');
const AccountPage = lazyPage(() => import('../../features/account'), 'AccountPage');
const AlertsPage = lazyPage(() => import('../../features/alerts'), 'AlertsPage');
const AiAssistantPage = lazyPage(() => import('../../features/assistant'), 'AiAssistantPage');
const AzureCostPage = lazyPage(() => import('../../features/azure'), 'AzureCostPage');
const AzureRoot = lazyPage(() => import('../../features/azure'), 'AzureRoot');
const AwsRoot = lazyPage(() => import('../../features/aws'), 'AwsRoot');
const GcpRoot = lazyPage(() => import('../../features/gcp'), 'GcpRoot');
const BtpRoot = lazyPage(() => import('../../features/btp'), 'BtpRoot');
const BudgetsPage = lazyPage(() => import('../../features/budgets'), 'BudgetsPage');
const SmartAlertsPage = lazyPage(() => import('../../features/smartAlerts'), 'SmartAlertsPage');
const SubscriptionPage = lazyPage(() => import('../../features/subscription'), 'SubscriptionPage');
const UserManagementPage = lazyPage(() => import('../../features/users'), 'UserManagementPage');
const AuditTrailPage = lazyPage(() => import('../../features/audit'), 'AuditTrailPage');
const SyncLogsPage = lazyPage(() => import('../../features/syncLogs'), 'SyncLogsPage');
const InvoicesPage = lazyPage(() => import('../../features/invoices'), 'InvoicesPage');
const BillingPage = lazyPage(() => import('../../features/billing'), 'BillingPage');
const CustomersPage = lazyPage(() => import('../../features/billing'), 'CustomersPage');
const GenerateInvoicePage = lazyPage(() => import('../../features/billing'), 'GenerateInvoicePage');
const SuperAdminBillingPage = lazyPage(() => import('../../features/superAdmin'), 'SuperAdminBillingPage');
const SuperAdminOrganizationPage = lazyPage(() => import('../../features/superAdmin'), 'SuperAdminOrganizationPage');
const SuperAdminOrganizationsPage = lazyPage(() => import('../../features/superAdmin'), 'SuperAdminOrganizationsPage');
const SuperAdminOverviewPage = lazyPage(() => import('../../features/superAdmin'), 'SuperAdminOverviewPage');

/**
 * Shows the page-shaped skeleton until the page's code has loaded. Keyed by path: React Router navigates inside
 * a transition, which would otherwise keep the previous page on screen (and no skeleton) until the next is ready.
 */
function Page({ children, variant = 'default' }: { children: ReactNode; variant?: PageSkeletonVariant }) {
  const { pathname } = useLocation();
  return <Suspense key={pathname} fallback={<PageSkeleton variant={variant} />}>{children}</Suspense>;
}

/** Every path comes from route-manifest.ts; nothing here spells out a URL. */
export function AppRoutes() {
  return (
    <Routes>
      <Route path={appPaths.login} element={<LoginPage />} />
      <Route path={appPaths.register} element={<RegisterPage />} />
      <Route path={appPaths.companySignup} element={<CompanySignupPage />} />
      <Route path={appPaths.forgotPassword} element={<ForgotPasswordPage />} />
      <Route path={appPaths.resetPassword} element={<ResetPasswordPage />} />
      <Route path={appPaths.subscriptionExpired} element={<SubscriptionExpiredPage />} />
      {/* The guided first-time setup: its own full page, outside the app menus. */}
      <Route path={appPaths.setup} element={<SetupPage />} />

      {/* Fully public — reached only via the token embedded in a "sent" invoice email link,
          no login, no app shell. */}
      <Route path={appPaths.publicInvoice} element={<PublicInvoicePage />} />
      <Route path={appPaths.invoiceDemo} element={<InvoiceDemoPage />} />

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
          <Route path={appPaths.adminDashboard} element={<Page variant="dashboard"><SuperAdminOverviewPage /></Page>} />
          <Route path={appPaths.adminOrganizations} element={<Page variant="table"><SuperAdminOrganizationsPage /></Page>} />
          <Route path={appPaths.adminOrganizationNew} element={<Page><SuperAdminOrganizationPage /></Page>} />
          <Route path={appPaths.adminOrganization} element={<Page><SuperAdminOrganizationPage /></Page>} />
          <Route path={appPaths.adminBilling} element={<Page><SuperAdminBillingPage /></Page>} />
          <Route path={appPaths.adminBillingGenerate} element={<Page><GenerateInvoicePage /></Page>} />
          <Route path={appPaths.adminBillingCustomers} element={<Page variant="table"><CustomersPage /></Page>} />
        </Route>
      </Route>

      <Route element={<AppShell />}>
        <Route path={appPaths.root} element={<SetupRedirect><Page variant="dashboard"><HomePage /></Page></SetupRedirect>} />
        <Route path={appPaths.costOverview} element={<Page><CostOverviewPage /></Page>} />
        <Route path={appPaths.azure} element={<Page><AzureRoot /></Page>} />
        <Route path={appPaths.azureAccount} element={<Page><AzureCostPage /></Page>} />
        <Route path={appPaths.aws} element={<Page><AwsRoot /></Page>} />
        <Route path={appPaths.gcp} element={<Page><GcpRoot /></Page>} />
        <Route path={appPaths.btp} element={<Page><BtpRoot /></Page>} />
        <Route path={appPaths.budgets} element={<Page><BudgetsPage /></Page>} />
        <Route path={appPaths.recommendations} element={<Navigate to={appPaths.cloudOptimization} replace />} />
        <Route path={appPaths.smartAlerts} element={<Page variant="table"><SmartAlertsPage /></Page>} />
        <Route path={appPaths.sapSystems} element={<Page variant="dashboard"><SapOverviewPage /></Page>} />
        <Route path={appPaths.sapDatabases} element={<Page><HanaMonitoringPage /></Page>} />
        {/* Merged pages: the former URLs land on the page that now holds their content. */}
        <Route path={appPaths.sapHealth} element={<Navigate to={appPaths.sapSystems} replace />} />
        <Route path={appPaths.sapJobs} element={<Page variant="table"><SapJobsPage /></Page>} />
        <Route path={appPaths.sapDumps} element={<Navigate to={`${appPaths.sapJobs}#dumps`} replace />} />
        <Route path={appPaths.sapPerformance} element={<Page><SapPerformancePage /></Page>} />
        <Route path={appPaths.sapAlerts} element={<Page variant="table"><SapAlertsPage /></Page>} />
        <Route path={appPaths.sapTransport} element={<Page><TransportManagementPage /></Page>} />
        <Route path={appPaths.sapSecurityNotes} element={<Page><SecurityNotesPage /></Page>} />
        <Route path={appPaths.sapBtpSecurity} element={<Page><BtpSecurityPage /></Page>} />
        <Route path={appPaths.sapConfiguration} element={<Page><SystemConfigurationPage /></Page>} />
        <Route path={appPaths.alerts} element={<Page variant="table"><AlertsPage /></Page>} />
        <Route path={appPaths.reports} element={<Navigate to={appPaths.cloudAnalytics} replace />} />
        <Route path={appPaths.aiAssistant} element={<Page><AiAssistantPage /></Page>} />
        <Route path={appPaths.account} element={<Page><AccountPage /></Page>} />
        <Route path={appPaths.subscription} element={<Page><SubscriptionPage /></Page>} />
        <Route path={appPaths.users} element={<Page variant="table"><UserManagementPage /></Page>} />
        <Route path={appPaths.auditTrail} element={<Page variant="table"><AuditTrailPage /></Page>} />
        <Route path={appPaths.syncLogs} element={<Page variant="table"><SyncLogsPage /></Page>} />
        <Route path={appPaths.invoices} element={<Page variant="table"><InvoicesPage /></Page>} />
        <Route path={appPaths.billing} element={<Page><BillingPage /></Page>} />
        <Route path={appPaths.cloudAnalytics} element={<Page><CostAnalyticsPage /></Page>} />
        <Route path={appPaths.cloudOptimization} element={<Page><OptimizationAdvisorPage /></Page>} />
        <Route path={appPaths.cloudReservations} element={<Page><ReservationsPage /></Page>} />
        <Route path={appPaths.cloudResources} element={<Page><ResourceInventoryPage /></Page>} />
      </Route>

      <Route path={appPaths.catchAll} element={<NotFoundPage />} />
    </Routes>
  );
}
