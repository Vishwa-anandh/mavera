/** The cross-module alert worklist (Alerts page): one row per active alert from any subscribed module. */
export type GlobalAlertSeverity = 'critical' | 'warning' | 'info';
export type GlobalAlertModule = 'SAP' | 'Cloud';

export interface GlobalAlertRow {
  id: string;
  timestamp: string;
  module: GlobalAlertModule;
  source: string;
  summary: string;
  severity: GlobalAlertSeverity;
  status: 'Open' | 'Acknowledged' | 'Resolved';
}

/** SAP BTP security assessment of the connected destination: users, role collections and roles. */
export interface BtpSecurityUser {
  fullName: string;
  usernameEmail: string;
  groups: string[];
  status: 'Active' | 'Inactive';
  verified: boolean;
  lastLogin: string | null;
  createdAt: string;
}

export interface BtpSecurityAssessment {
  users: BtpSecurityUser[];
  roleCollections: Array<{ name: string; roles: number; assignedUsers: number }>;
  roles: Array<{ name: string; description: string; scope: string }>;
}

/** One cloud data sync, as listed on the Sync Audit Logs page. */
export interface SyncLogRecord {
  id: string;
  accountName: string;
  provider: 'azure' | 'aws' | 'btp' | 'gcp';
  /** 'system' for a scheduled sync, otherwise the triggering user's email. */
  triggeredBy: string;
  startedAt: string;
  completedAt?: string;
  status: 'success' | 'failed' | 'running';
  errorMessage?: string;
}
