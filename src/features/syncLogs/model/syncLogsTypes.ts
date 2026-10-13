import type { CloudProvider } from '../../../shared/types/auth';

export type SyncLogStatus = 'success' | 'failed' | 'running';

export interface SyncLog {
  id: string;
  accountName: string;
  provider: CloudProvider;
  /** 'system' for a scheduled sync, otherwise the triggering user's email. */
  triggeredBy: string;
  startedAt: string;
  completedAt?: string;
  status: SyncLogStatus;
  errorMessage?: string;
}
