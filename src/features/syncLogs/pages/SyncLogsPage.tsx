import { useMemo, useState } from 'react';
import { AppBreadcrumb } from '../../../shared/ui/AppBreadcrumb';
import { useAuth } from '../../auth';
import { RefreshIcon, ClockIcon, ServerIcon, UserIcon, FilterIcon } from '../../../shared/ui/icons';
import { Tooltip } from '../../../shared/ui/Tooltip';
import { MOCK_SYNC_LOGS } from '../../../demo/syncLogs/mockSyncLogsData';
import { STATUS_LABELS, STATUS_TONE, formatDuration, formatTimestamp } from '../model/syncLogsDerivations';
import type { SyncLogStatus } from '../model/syncLogsTypes';
import type { CloudProvider } from '../../../shared/types/auth';

const STATUS_FILTERS: Array<{ key: SyncLogStatus | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'success', label: 'Success' },
  { key: 'failed', label: 'Failed' },
  { key: 'running', label: 'Running' },
];

const PROVIDER_LABELS: Record<CloudProvider, string> = { azure: 'Azure', aws: 'AWS', btp: 'SAP BTP', gcp: 'GCP' };

/**
 * Ported from the reference CCM app's SyncLogsPage.jsx: a read-only audit
 * trail of every scheduled/user-triggered cloud data fetch. The reference
 * paginates from a real backend with infinite scroll and only offers
 * Azure/AWS provider filters; this prototype has one fixed mock log set (so
 * it renders as a single list) and generalizes the provider filter to every
 * provider the org actually has connected, matching the fuller 4-provider
 * scope the rest of Mavera's Cloud Cost module already covers.
 */
export function SyncLogsPage() {
  const { cloudAccess } = useAuth();
  const [statusFilter, setStatusFilter] = useState<SyncLogStatus | 'all'>('all');
  const [providerFilter, setProviderFilter] = useState<CloudProvider | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const providerFilters = cloudAccess.length > 0 ? cloudAccess : (['azure', 'aws', 'btp', 'gcp'] as CloudProvider[]);

  const filtered = useMemo(() => {
    return MOCK_SYNC_LOGS
      .filter((log) => statusFilter === 'all' || log.status === statusFilter)
      .filter((log) => providerFilter === 'all' || log.provider === providerFilter)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }, [statusFilter, providerFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    window.setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <div>
      <AppBreadcrumb items={[{ label: 'Administration' }, { label: 'Sync Logs' }]} />
      <div className="mv-page-heading">
        <div>
          <h1 className="mv-title">Sync Audit Logs</h1>
          <p className="mv-subtitle">Every cloud data fetch — scheduled and user-triggered.</p>
        </div>
        <button className="mv-secondary-button" disabled={refreshing} onClick={handleRefresh}>
          <RefreshIcon size={16} style={{ marginRight: 6 }} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <section className="mv-panel" style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
        <FilterIcon size={16} />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span className="mv-muted" style={{ fontSize: 12, fontWeight: 500 }}>Status</span>
          {STATUS_FILTERS.map((f) => (
            <button key={f.key} className={`mv-segmented-btn${statusFilter === f.key ? ' is-active' : ''}`} style={{ minHeight: 30, padding: '0 10px' }} onClick={() => setStatusFilter(f.key)}>{f.label}</button>
          ))}
        </div>
        <div style={{ width: 1, height: 20, background: 'var(--mv-divider)' }} />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="mv-muted" style={{ fontSize: 12, fontWeight: 500 }}>Provider</span>
          <button className={`mv-segmented-btn${providerFilter === 'all' ? ' is-active' : ''}`} style={{ minHeight: 30, padding: '0 10px' }} onClick={() => setProviderFilter('all')}>All</button>
          {providerFilters.map((p) => (
            <button key={p} className={`mv-segmented-btn${providerFilter === p ? ' is-active' : ''}`} style={{ minHeight: 30, padding: '0 10px' }} onClick={() => setProviderFilter(p)}>{PROVIDER_LABELS[p]}</button>
          ))}
        </div>
      </section>

      <section className="mv-panel">
        {filtered.length === 0 ? (
          <div className="mv-empty" style={{ margin: 0 }}>
            <div className="mv-empty-icon" aria-hidden><ClockIcon size={28} /></div>
            <h2>No sync logs</h2>
            <p>No logs match the selected filters.</p>
          </div>
        ) : (
          <div className="mv-table-wrap">
            <table className="mv-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Provider</th>
                  <th>Triggered By</th>
                  <th>Started</th>
                  <th>Status</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{log.accountName}</p>
                      {log.errorMessage && <Tooltip content={log.errorMessage}><p className="mv-muted" style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--mv-danger)', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.errorMessage}</p></Tooltip>}
                    </td>
                    <td><span className="mv-status mv-status--neutral">{PROVIDER_LABELS[log.provider]}</span></td>
                    <td>
                      <span className="mv-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        {log.triggeredBy === 'system' ? <><ServerIcon size={13} />System</> : <><UserIcon size={13} />{log.triggeredBy}</>}
                      </span>
                    </td>
                    <td className="mv-muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{formatTimestamp(log.startedAt)}</td>
                    <td><span className={`mv-status mv-status--${STATUS_TONE[log.status]}`}>{STATUS_LABELS[log.status]}</span></td>
                    <td className="mv-muted" style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{formatDuration(log.startedAt, log.completedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="mv-muted" style={{ textAlign: 'right', marginTop: 12 }}>Showing {filtered.length} of {MOCK_SYNC_LOGS.length} logs</p>
    </div>
  );
}
