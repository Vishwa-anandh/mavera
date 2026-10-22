import type { BtpSecurityAssessment, GlobalAlertRow, GlobalAlertSeverity, SyncLogRecord } from '../contracts/alerts';
import { MOCK_ALERTS } from '../../demo/alerts/mockAlerts';
import { MOCK_SYNC_LOGS } from '../../demo/syncLogs/mockSyncLogsData';
import { MOCK_BTP_ROLES, MOCK_BTP_ROLE_COLLECTIONS, MOCK_BTP_USERS } from '../../demo/sap/mockBtpSecurity';
import { isEmptyWorkspace } from './workspaceProfile';
import { workspaceStore } from './workspaceStore';
import { smartAlertsRepository } from './smartAlertsRepository';
import { sapAdminRepository } from './sapAdminRepository';

/**
 * What the organisation's monitoring has been doing: the cross-module alert worklist, the sync audit log and the
 * BTP security assessment. PROTOTYPE: a populated organisation sees seeded samples; a new one sees only what its
 * own connected accounts and SAP systems have produced, so these stay empty until it connects something.
 */
const PROVIDER_LABEL = { azure: 'Azure', aws: 'AWS', btp: 'SAP BTP', gcp: 'GCP', all: 'Cloud' } as const;
/** The sample world's "now": its sync and alert timestamps are all on 28 September 2026. */
const SAMPLE_NOW = '2026-09-28T05:00:00Z';

const clock = (iso: string): string => {
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? '' : `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
};

const cloudSeverity = (severity: string): GlobalAlertSeverity => (severity === 'critical' ? 'critical' : severity === 'low' ? 'info' : 'warning');
const sapSeverity = (severity: string): GlobalAlertSeverity => (severity === 'Critical' ? 'critical' : severity === 'Low' ? 'info' : 'warning');

function derivedAlerts(): GlobalAlertRow[] {
  const cloud = smartAlertsRepository.list()
    .filter((a) => !a.ignored && a.status !== 'resolved')
    .map((a) => ({
      sortKey: a.detected_at,
      row: {
        id: `cloud-${a.id}`,
        timestamp: clock(a.detected_at),
        module: 'Cloud' as const,
        source: `${PROVIDER_LABEL[a.provider]} · ${a.provider === 'all' ? 'All accounts' : workspaceStore.get(a.provider, a.account_id)?.name ?? a.account_id}`,
        summary: a.message,
        severity: cloudSeverity(a.severity),
        status: a.status === 'unread' ? ('Open' as const) : ('Acknowledged' as const),
      },
    }));
  const sap = sapAdminRepository.alerts.list()
    .filter((a) => a.state === 'active')
    .map((a) => ({
      sortKey: a.detectedAt,
      row: {
        id: `sap-${a.id}`,
        timestamp: clock(a.detectedAt),
        module: 'SAP' as const,
        source: a.system.length > 14 ? `${a.system.slice(0, 8)}…` : a.system,
        summary: `${a.type} anomaly: ${a.message}`,
        severity: sapSeverity(a.severity),
        status: a.read ? ('Acknowledged' as const) : ('Open' as const),
      },
    }));
  return [...cloud, ...sap].sort((a, b) => b.sortKey.localeCompare(a.sortKey)).map((entry) => entry.row);
}

function derivedSyncLogs(): SyncLogRecord[] {
  return (['azure', 'aws', 'gcp', 'btp'] as const).flatMap((provider) =>
    workspaceStore.list(provider).map((account): SyncLogRecord => ({
      id: `sync-${account.id}`,
      accountName: account.name,
      provider,
      triggeredBy: 'system',
      startedAt: SAMPLE_NOW,
      completedAt: '2026-09-28T05:00:41Z',
      status: 'success',
    })),
  );
}

export const activityRepository = {
  listAlerts(): GlobalAlertRow[] {
    return isEmptyWorkspace() ? derivedAlerts() : structuredClone(MOCK_ALERTS);
  },
  listSyncLogs(): SyncLogRecord[] {
    return isEmptyWorkspace() ? derivedSyncLogs() : structuredClone(MOCK_SYNC_LOGS);
  },
  getBtpSecurity(): BtpSecurityAssessment {
    return structuredClone({ users: MOCK_BTP_USERS, roleCollections: MOCK_BTP_ROLE_COLLECTIONS, roles: MOCK_BTP_ROLES });
  },
};
