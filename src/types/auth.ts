export type CloudProvider = 'azure' | 'aws' | 'btp' | 'gcp';

export interface User {
  id: string;
  email: string;
  name?: string;
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
}
