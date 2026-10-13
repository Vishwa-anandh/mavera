/* Public API of the superAdmin feature. Other features and app/ import only from here. */
export { SuperAdminGuard } from './components/SuperAdminGuard';
export { SuperAdminShell } from './components/SuperAdminShell';
export { DEMO_PASSWORD, DEMO_USERNAME, SuperAdminAuthProvider, useSuperAdminAuth } from './model/SuperAdminAuthContext';
export type { MspRate, Organization } from './model/superAdminTypes';
export { SuperAdminBillingPage } from './pages/SuperAdminBillingPage';
export { SuperAdminOrganizationPage } from './pages/SuperAdminOrganizationPage';
export { SuperAdminOrganizationsPage } from './pages/SuperAdminOrganizationsPage';
export { SuperAdminOverviewPage } from './pages/SuperAdminOverviewPage';
