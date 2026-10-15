
/**
 * Single source of truth for every URL the app serves. `AppRoutes` registers routes only through
 * `appPaths`, navigation destinations in `navConfig` are checked against this list by a test, and
 * the architecture check rejects literal route paths in `AppRoutes`.
 *
 * Access is enforced by the layout the route sits in (AppShell for `authenticated`,
 * SuperAdminGuard for `super-admin`) and by the API; UI visibility is never the security boundary.
 */
export type RouteAccess = { kind: 'public' } | { kind: 'authenticated' } | { kind: 'super-admin' };

export type RouteLayout = 'full-screen' | 'app' | 'admin';

export interface AppRouteDefinition {
  id: string;
  path: string;
  access: RouteAccess;
  layout: RouteLayout;
}

export const appPaths = {
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  subscriptionExpired: '/subscription-expired',
  publicInvoice: '/invoice/:token',

  adminLogin: '/admin/login',
  adminDashboard: '/admin/dashboard',
  adminOrganizations: '/admin/organizations',
  adminOrganizationNew: '/admin/organizations/new',
  adminOrganization: '/admin/organizations/:orgId',
  adminBilling: '/admin/billing',
  adminBillingGenerate: '/admin/billing/generate',
  adminBillingCustomers: '/admin/billing/customers',

  root: '/',
  costOverview: '/cloud/overview',
  azure: '/azure',
  azureAccount: '/azure/:accountId',
  aws: '/aws/*',
  gcp: '/gcp/*',
  btp: '/btp/*',
  budgets: '/budgets',
  recommendations: '/recommendations',
  smartAlerts: '/smart-alerts',
  sapSystems: '/sap/systems',
  sapDatabases: '/sap/databases',
  sapHealth: '/sap/health',
  sapJobs: '/sap/jobs',
  sapDumps: '/sap/dumps',
  sapPerformance: '/sap/performance',
  sapAlerts: '/sap/alerts',
  sapTransport: '/sap/transport-management',
  sapSecurityNotes: '/sap/security-notes',
  sapBtpSecurity: '/sap/btp-security',
  sapConfiguration: '/sap/configuration',
  alerts: '/alerts',
  reports: '/reports',
  aiAssistant: '/ai-assistant',
  account: '/account',
  subscription: '/subscription',
  users: '/users',
  syncLogs: '/sync-logs',
  invoices: '/invoices',
  invoiceBuilder: '/invoice-builder',
  billing: '/billing',

  cloudAnalytics: '/cloud/analytics',
  cloudOptimization: '/cloud/optimization',
  cloudReservations: '/cloud/reservations',
  cloudResources: '/cloud/resources',

  catchAll: '*',
} as const;

export type AppPathKey = keyof typeof appPaths;

const pub = { kind: 'public' } as const;
const member = { kind: 'authenticated' } as const;
const superAdmin = { kind: 'super-admin' } as const;

export const routeManifest: readonly AppRouteDefinition[] = [
  { id: 'login', path: appPaths.login, access: pub, layout: 'full-screen' },
  { id: 'register', path: appPaths.register, access: pub, layout: 'full-screen' },
  { id: 'forgot-password', path: appPaths.forgotPassword, access: pub, layout: 'full-screen' },
  { id: 'reset-password', path: appPaths.resetPassword, access: pub, layout: 'full-screen' },
  { id: 'subscription-expired', path: appPaths.subscriptionExpired, access: pub, layout: 'full-screen' },
  { id: 'public-invoice', path: appPaths.publicInvoice, access: pub, layout: 'full-screen' },

  { id: 'admin-login', path: appPaths.adminLogin, access: pub, layout: 'full-screen' },
  // Legacy org-side URL: redirects to the super-admin invoice generator below.
  { id: 'invoice-builder', path: appPaths.invoiceBuilder, access: pub, layout: 'full-screen' },
  { id: 'admin-dashboard', path: appPaths.adminDashboard, access: superAdmin, layout: 'admin' },
  { id: 'admin-organizations', path: appPaths.adminOrganizations, access: superAdmin, layout: 'admin' },
  { id: 'admin-organization-new', path: appPaths.adminOrganizationNew, access: superAdmin, layout: 'admin' },
  { id: 'admin-organization', path: appPaths.adminOrganization, access: superAdmin, layout: 'admin' },
  { id: 'admin-billing', path: appPaths.adminBilling, access: superAdmin, layout: 'admin' },
  { id: 'admin-billing-generate', path: appPaths.adminBillingGenerate, access: superAdmin, layout: 'admin' },
  { id: 'admin-billing-customers', path: appPaths.adminBillingCustomers, access: superAdmin, layout: 'admin' },

  { id: 'dashboard', path: appPaths.root, access: member, layout: 'app' },
  { id: 'cost-overview', path: appPaths.costOverview, access: member, layout: 'app' },
  { id: 'azure', path: appPaths.azure, access: member, layout: 'app' },
  { id: 'azure-account', path: appPaths.azureAccount, access: member, layout: 'app' },
  { id: 'aws', path: appPaths.aws, access: member, layout: 'app' },
  { id: 'gcp', path: appPaths.gcp, access: member, layout: 'app' },
  { id: 'btp', path: appPaths.btp, access: member, layout: 'app' },
  { id: 'budgets', path: appPaths.budgets, access: member, layout: 'app' },
  { id: 'recommendations', path: appPaths.recommendations, access: member, layout: 'app' },
  { id: 'smart-alerts', path: appPaths.smartAlerts, access: member, layout: 'app' },
  { id: 'sap-systems', path: appPaths.sapSystems, access: member, layout: 'app' },
  { id: 'sap-databases', path: appPaths.sapDatabases, access: member, layout: 'app' },
  { id: 'sap-health', path: appPaths.sapHealth, access: member, layout: 'app' },
  { id: 'sap-jobs', path: appPaths.sapJobs, access: member, layout: 'app' },
  { id: 'sap-dumps', path: appPaths.sapDumps, access: member, layout: 'app' },
  { id: 'sap-performance', path: appPaths.sapPerformance, access: member, layout: 'app' },
  { id: 'sap-alerts', path: appPaths.sapAlerts, access: member, layout: 'app' },
  { id: 'sap-transport', path: appPaths.sapTransport, access: member, layout: 'app' },
  { id: 'sap-security-notes', path: appPaths.sapSecurityNotes, access: member, layout: 'app' },
  { id: 'sap-btp-security', path: appPaths.sapBtpSecurity, access: member, layout: 'app' },
  { id: 'sap-configuration', path: appPaths.sapConfiguration, access: member, layout: 'app' },
  { id: 'alerts', path: appPaths.alerts, access: member, layout: 'app' },
  { id: 'reports', path: appPaths.reports, access: member, layout: 'app' },
  { id: 'ai-assistant', path: appPaths.aiAssistant, access: member, layout: 'app' },
  { id: 'account', path: appPaths.account, access: member, layout: 'app' },
  { id: 'subscription', path: appPaths.subscription, access: member, layout: 'app' },
  { id: 'users', path: appPaths.users, access: member, layout: 'app' },
  { id: 'sync-logs', path: appPaths.syncLogs, access: member, layout: 'app' },
  { id: 'invoices', path: appPaths.invoices, access: member, layout: 'app' },
  { id: 'billing', path: appPaths.billing, access: member, layout: 'app' },

  { id: 'cloud-analytics', path: appPaths.cloudAnalytics, access: member, layout: 'app' },
  { id: 'cloud-optimization', path: appPaths.cloudOptimization, access: member, layout: 'app' },
  { id: 'cloud-reservations', path: appPaths.cloudReservations, access: member, layout: 'app' },
  { id: 'cloud-resources', path: appPaths.cloudResources, access: member, layout: 'app' },

  { id: 'not-found', path: appPaths.catchAll, access: pub, layout: 'full-screen' },
];

export function routeById(id: AppRouteDefinition['id']): AppRouteDefinition {
  const route = routeManifest.find((item) => item.id === id);
  if (!route) throw new Error(`Unknown route id: ${id}`);
  return route;
}

/** True when `path` is served by a manifest entry, including `/aws/*`-style splat routes. */
export function isRegisteredPath(path: string): boolean {
  return routeManifest.some((route) => {
    if (route.path === path) return true;
    if (route.path.endsWith('/*')) {
      const base = route.path.slice(0, -2);
      return path === base || path.startsWith(`${base}/`);
    }
    return false;
  });
}
