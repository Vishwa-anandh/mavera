export type CloudProvider = 'azure' | 'aws' | 'btp' | 'gcp';

export interface User {
  id: string;
  email: string;
  name?: string;
  /** Display name of the user's organization (tenant), shown beside their identity in the
   * header (MAVERA_DESIGN_SYSTEM.md §6.2). Optional until /auth/me sends it. */
  orgName?: string;
  role: 'admin' | 'owner' | 'member';
  canViewAzure?: boolean;
  canViewAws?: boolean;
  canViewBtp?: boolean;
  canViewGcp?: boolean;
  azureReadOnly?: boolean;
  awsReadOnly?: boolean;
  btpReadOnly?: boolean;
  gcpReadOnly?: boolean;
  invoiceOnly?: boolean;
  cloudAccess?: CloudProvider[];
  features?: Partial<{
    budgets: boolean;
    smartAlerts: boolean;
    syncLogs: boolean;
    recommendations: boolean;
    cloudManagement: boolean;
    invoices: boolean;
  }>;
  accountLimits?: Partial<{ azure: number; aws: number; btp: number; gcp: number }>;
  aiEnabled?: boolean;
  /**
   * Which of the platform's 2 modules (Cloud Cost, SAP
   * Monitoring) the super admin has subscribed this org to — set from the
   * separate super-admin portal, not by the org itself. Undefined fields
   * default to enabled so existing accounts (and every test fixture) keep
   * seeing every module until a real backend starts sending this.
   */
  modules?: Partial<{ cloudCost: boolean; sapMonitoring: boolean }>;
  /** Seat limit the super admin granted this org, alongside its modules. */
  maxUsers?: number;
  /** Org-wide plan tier, set by the super admin — matches the reference's
   * `plan_type` field exactly (see SubscriptionManagementPage.jsx). */
  planType?: 'free' | 'basic' | 'premium' | 'enterprise';
  subscriptionStartsAt?: string;
  /** null means the subscription never expires. */
  subscriptionExpiresAt?: string | null;
  subscriptionActive?: boolean;
  /** Free-text note the super admin can leave on this org's subscription
   * (e.g. "Extended per renewal agreement, invoice #1234"). */
  subscriptionNotes?: string;
}
