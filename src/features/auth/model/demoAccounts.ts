import type { User } from '../../../shared/types/auth';
import type { WorkspaceProfile } from '../../../data-access';

/**
 * The demo accounts offered on the login page ("Demo mode"). Each signs in locally with no backend: the owner
 * organisation (all modules), the same organisation as an Admin, Analyst or Viewer (to see what each role
 * can reach), two organisations that subscribe to a single module, and a brand-new organisation with nothing
 * connected yet (every module subscribed) for walking through first-time setup.
 */
export interface DemoAccount {
  /** Short label on the login page. */
  label: string;
  email: string;
  user: User;
  /** What the organisation starts with; `populated` (the default) is today's sample data, `empty` is a new organisation. */
  workspace?: WorkspaceProfile;
}

export const DEMO_PASSWORD = 'Mavera@2026';
export const DEMO_EMAIL = 'demo@mavera.local';
export const DEMO_CLOUD_EMAIL = 'cloud@mavera.local';
export const DEMO_SAP_EMAIL = 'sap@mavera.local';
export const DEMO_NEW_ORG_EMAIL = 'new@mavera.local';
export const DEMO_USER_ID = 'dev-preview-user';

const ALL_CLOUDS: User['cloudAccess'] = ['azure', 'aws', 'btp', 'gcp'];

const fullOrg = (id: string, email: string, name: string, demoRoleId?: string): User => ({
  id,
  email,
  name,
  orgName: 'Maitsys Demo Org',
  role: 'admin',
  demoRoleId,
  canViewAzure: true,
  canViewAws: true,
  canViewBtp: true,
  canViewGcp: true,
  cloudAccess: ALL_CLOUDS,
  invoiceOnly: false,
});

const subscribed = {
  maxUsers: 10,
  planType: 'premium' as const,
  aiEnabled: true,
  subscriptionStartsAt: '2026-05-27T00:00:00.000Z',
  subscriptionExpiresAt: '2027-05-27T00:00:00.000Z',
  subscriptionActive: true,
};

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  { label: 'Owner', email: DEMO_EMAIL, user: fullOrg(DEMO_USER_ID, DEMO_EMAIL, 'Dev Preview') },
  { label: 'Admin', email: 'admin@mavera.local', user: fullOrg('demo-admin-user', 'admin@mavera.local', 'Admin Preview', 'admin') },
  { label: 'Analyst', email: 'analyst@mavera.local', user: fullOrg('demo-analyst-user', 'analyst@mavera.local', 'Analyst Preview', 'analyst') },
  { label: 'Viewer', email: 'viewer@mavera.local', user: fullOrg('demo-viewer-user', 'viewer@mavera.local', 'Viewer Preview', 'viewer') },
  {
    label: 'Cloud Cost only',
    email: DEMO_CLOUD_EMAIL,
    user: {
      ...fullOrg('demo-cloud-user', DEMO_CLOUD_EMAIL, 'Cloud Preview'),
      orgName: 'Northwind Cloud (Cloud Cost only)',
      modules: { cloudCost: true, sapMonitoring: false },
      ...subscribed,
    },
  },
  {
    label: 'SAP Monitoring only',
    email: DEMO_SAP_EMAIL,
    user: {
      ...fullOrg('demo-sap-user', DEMO_SAP_EMAIL, 'SAP Preview'),
      orgName: 'Contoso SAP (SAP Monitoring only)',
      cloudAccess: [],
      canViewAzure: false,
      canViewAws: false,
      canViewBtp: false,
      canViewGcp: false,
      modules: { cloudCost: false, sapMonitoring: true },
      ...subscribed,
    },
  },
  {
    label: 'New organisation',
    email: DEMO_NEW_ORG_EMAIL,
    workspace: 'empty',
    user: {
      ...fullOrg('demo-new-org-user', DEMO_NEW_ORG_EMAIL, 'Nora Newman'),
      orgName: 'Northwind (new organisation)',
      modules: { cloudCost: true, sapMonitoring: true },
      ...subscribed,
    },
  },
];

const BY_EMAIL = new Map(DEMO_ACCOUNTS.map((account) => [account.email, account]));
const DEMO_IDS = new Set(DEMO_ACCOUNTS.map((account) => account.user.id));

/** The demo account for an e-mail address (any case), if it is one. */
export function demoAccountFor(email: string): DemoAccount | undefined {
  return BY_EMAIL.get(email.trim().toLowerCase());
}

export const isDemoUserId = (id: string | undefined): boolean => Boolean(id && DEMO_IDS.has(id));
