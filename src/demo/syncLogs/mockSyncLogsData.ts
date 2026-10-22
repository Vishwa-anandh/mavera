import type { SyncLogRecord } from '../../data-access';

export const MOCK_SYNC_LOGS: SyncLogRecord[] = [
  { id: 'log-1', accountName: 'Production Azure', provider: 'azure', triggeredBy: 'system', startedAt: '2026-09-28T05:00:00Z', completedAt: '2026-09-28T05:00:42Z', status: 'success' },
  { id: 'log-2', accountName: 'AWS Primary', provider: 'aws', triggeredBy: 'system', startedAt: '2026-09-28T05:00:00Z', completedAt: '2026-09-28T05:01:18Z', status: 'success' },
  { id: 'log-3', accountName: 'SAP BTP Global Account', provider: 'btp', triggeredBy: 'system', startedAt: '2026-09-28T05:00:00Z', status: 'running' },
  { id: 'log-4', accountName: 'GCP Analytics', provider: 'gcp', triggeredBy: 'sarah.johnson@maitsys.com', startedAt: '2026-09-28T03:12:07Z', completedAt: '2026-09-28T03:12:55Z', status: 'success' },
  { id: 'log-5', accountName: 'Production Azure', provider: 'azure', triggeredBy: 'marcus.chen@maitsys.com', startedAt: '2026-09-28T01:45:00Z', completedAt: '2026-09-28T01:45:03Z', status: 'failed', errorMessage: 'Client secret expired — reconnect the account to resume syncing.' },
  { id: 'log-6', accountName: 'AWS Secondary', provider: 'aws', triggeredBy: 'system', startedAt: '2026-09-27T17:00:00Z', completedAt: '2026-09-27T17:00:39Z', status: 'success' },
  { id: 'log-7', accountName: 'SAP BTP Global Account', provider: 'btp', triggeredBy: 'system', startedAt: '2026-09-27T17:00:00Z', completedAt: '2026-09-27T17:02:11Z', status: 'success' },
  { id: 'log-8', accountName: 'GCP Analytics', provider: 'gcp', triggeredBy: 'system', startedAt: '2026-09-27T17:00:00Z', completedAt: '2026-09-27T17:00:08Z', status: 'failed', errorMessage: 'Service account key rejected by Cloud Billing API (403).' },
  { id: 'log-9', accountName: 'Production Azure', provider: 'azure', triggeredBy: 'system', startedAt: '2026-09-27T05:00:00Z', completedAt: '2026-09-27T05:00:37Z', status: 'success' },
  { id: 'log-10', accountName: 'AWS Primary', provider: 'aws', triggeredBy: 'priya.sharma@maitsys.com', startedAt: '2026-09-27T02:20:11Z', completedAt: '2026-09-27T02:21:04Z', status: 'success' },
  { id: 'log-11', accountName: 'AWS Secondary', provider: 'aws', triggeredBy: 'system', startedAt: '2026-09-27T05:00:00Z', completedAt: '2026-09-27T05:00:29Z', status: 'success' },
  { id: 'log-12', accountName: 'SAP BTP Global Account', provider: 'btp', triggeredBy: 'system', startedAt: '2026-09-27T05:00:00Z', completedAt: '2026-09-27T05:04:52Z', status: 'success' },
  { id: 'log-13', accountName: 'GCP Analytics', provider: 'gcp', triggeredBy: 'system', startedAt: '2026-09-27T05:00:00Z', completedAt: '2026-09-27T05:00:46Z', status: 'success' },
  { id: 'log-14', accountName: 'Production Azure', provider: 'azure', triggeredBy: 'system', startedAt: '2026-09-26T17:00:00Z', completedAt: '2026-09-26T17:00:40Z', status: 'success' },
  { id: 'log-15', accountName: 'AWS Primary', provider: 'aws', triggeredBy: 'system', startedAt: '2026-09-26T17:00:00Z', completedAt: '2026-09-26T17:00:05Z', status: 'failed', errorMessage: 'Cost Explorer API rate limit exceeded — will retry next cycle.' },
  { id: 'log-16', accountName: 'AWS Secondary', provider: 'aws', triggeredBy: 'tom.wu@maitsys.com', startedAt: '2026-09-26T14:05:33Z', completedAt: '2026-09-26T14:06:19Z', status: 'success' },
  { id: 'log-17', accountName: 'SAP BTP Global Account', provider: 'btp', triggeredBy: 'system', startedAt: '2026-09-26T17:00:00Z', completedAt: '2026-09-26T17:03:02Z', status: 'success' },
  { id: 'log-18', accountName: 'GCP Analytics', provider: 'gcp', triggeredBy: 'system', startedAt: '2026-09-26T17:00:00Z', completedAt: '2026-09-26T17:00:51Z', status: 'success' },
  { id: 'log-19', accountName: 'Production Azure', provider: 'azure', triggeredBy: 'system', startedAt: '2026-09-26T05:00:00Z', completedAt: '2026-09-26T05:00:33Z', status: 'success' },
  { id: 'log-20', accountName: 'AWS Primary', provider: 'aws', triggeredBy: 'system', startedAt: '2026-09-26T05:00:00Z', completedAt: '2026-09-26T05:00:44Z', status: 'success' },
];
