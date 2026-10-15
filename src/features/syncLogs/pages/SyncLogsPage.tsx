import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth';
import { RefreshIcon, ClockIcon, ServerIcon, UserIcon, FilterIcon } from '../../../shared/ui/icons';
import { Tooltip } from '../../../shared/ui/Tooltip';
import { Pagination } from '../../../shared/ui/Pagination';
import { usePagination } from '../../../shared/ui/usePagination';
import { MOCK_SYNC_LOGS } from '../../../demo/syncLogs/mockSyncLogsData';
import { STATUS_LABELS, STATUS_TONE, formatDuration, formatTimestamp } from '../model/syncLogsDerivations';
import type { SyncLog, SyncLogStatus } from '../model/syncLogsTypes';
import type { CloudProvider } from '../../../shared/types/auth';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { DetailDrawer, DetailList } from '../../../shared/ui/DetailDrawer';
import { CopyButton } from '../../../shared/ui/CopyButton';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { TableSkeleton } from '../../../shared/ui/LoadStates';

const STATUS_FILTERS: Array<{ key: SyncLogStatus | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'success', label: 'Success' },
  { key: 'failed', label: 'Failed' },
  { key: 'running', label: 'Running' },
];

const PROVIDER_LABELS: Record<CloudProvider, string> = { azure: 'Azure', aws: 'AWS', btp: 'SAP BTP', gcp: 'GCP' };
const PROVIDER_PATHS: Record<CloudProvider, string> = { azure: '/azure', aws: '/aws', btp: '/btp', gcp: '/gcp' };

/** The most recent sync start across the whole log — what "last updated" means for this page. */
const LATEST_SYNC = new Date(Math.max(...MOCK_SYNC_LOGS.map((log) => new Date(log.startedAt).getTime())));

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
  const [openId, setOpenId] = useState<string | null>(null);

  const providerFilters = cloudAccess.length > 0 ? cloudAccess : (['azure', 'aws', 'btp', 'gcp'] as CloudProvider[]);

  const filtered = useMemo(() => {
    return MOCK_SYNC_LOGS
      .filter((log) => statusFilter === 'all' || log.status === statusFilter)
      .filter((log) => providerFilter === 'all' || log.provider === providerFilter)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }, [statusFilter, providerFilter]);

  const paging = usePagination(filtered, 10, `${statusFilter}|${providerFilter}`);

  const openLog: SyncLog | undefined = MOCK_SYNC_LOGS.find((log) => log.id === openId);
  const clearFilters = () => { setStatusFilter('all'); setProviderFilter('all'); };

  const handleRefresh = () => {
    setRefreshing(true);
    window.setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <div>
      <PageHeader title="Sync Audit Logs" subtitle="Every cloud data fetch — scheduled and user-triggered." updatedAt={LATEST_SYNC}>
        <button className="mv-secondary-button" disabled={refreshing} onClick={handleRefresh}>
          <RefreshIcon size={16} style={{ marginRight: '0.375rem' }} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </PageHeader>

      <section className="mv-toolbar" aria-label="Filters">
        <FilterIcon size={16} />
        <div className="mv-toolbar-group">
          <span className="mv-toolbar-label">Status</span>
          {STATUS_FILTERS.map((f) => (
            <button key={f.key} className={`mv-segmented-btn${statusFilter === f.key ? ' is-active' : ''}`} onClick={() => setStatusFilter(f.key)}>{f.label}</button>
          ))}
        </div>
        <div className="mv-filter-divider" />
        <div className="mv-toolbar-group">
          <span className="mv-toolbar-label">Provider</span>
          <button className={`mv-segmented-btn${providerFilter === 'all' ? ' is-active' : ''}`} onClick={() => setProviderFilter('all')}>All</button>
          {providerFilters.map((p) => (
            <button key={p} className={`mv-segmented-btn${providerFilter === p ? ' is-active' : ''}`} onClick={() => setProviderFilter(p)}>{PROVIDER_LABELS[p]}</button>
          ))}
        </div>
      </section>

      <section className="mv-panel mv-panel--table">
        {refreshing ? (
          <TableSkeleton columns={6} rows={8} label="Refreshing sync logs" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ClockIcon size={28} />}
            heading="No sync logs match these filters"
            explanation="Try a different status or provider, or clear the filters to see every sync."
            actionLabel="Clear filters"
            onAction={clearFilters}
          />
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
                {paging.pageItems.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <button type="button" className="mv-link-button" onClick={() => setOpenId(log.id)} aria-label={`View sync details for ${log.accountName}`}>{log.accountName}</button>
                      {log.errorMessage && <Tooltip content={log.errorMessage}><p className="mv-muted" style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--mv-danger)', maxWidth: '20rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.errorMessage}</p></Tooltip>}
                    </td>
                    <td><span className="mv-status mv-status--neutral">{PROVIDER_LABELS[log.provider]}</span></td>
                    <td>
                      <span className="mv-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem' }}>
                        {log.triggeredBy === 'system' ? <><ServerIcon size={13} />System</> : <><UserIcon size={13} />{log.triggeredBy}</>}
                      </span>
                    </td>
                    <td className="mv-muted mv-date" style={{ fontSize: '0.75rem' }}>{formatTimestamp(log.startedAt)}</td>
                    <td><span className={`mv-status mv-status--${STATUS_TONE[log.status]}`}>{STATUS_LABELS[log.status]}</span></td>
                    <td className="mv-muted" style={{ fontSize: '0.75rem', fontVariantNumeric: 'tabular-nums' }}>{formatDuration(log.startedAt, log.completedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!refreshing && <Pagination {...paging} noun="logs" />}
      </section>

      {openLog && (
        <DetailDrawer
          title={openLog.accountName}
          subtitle={<span className={`mv-status mv-status--${STATUS_TONE[openLog.status]}`}>{STATUS_LABELS[openLog.status]}</span>}
          onClose={() => setOpenId(null)}
          footer={
            <>
              <CopyButton value={openLog.id} label="Copy log ID" />
              <Link className="mv-secondary-button" to={PROVIDER_PATHS[openLog.provider]}>Open {PROVIDER_LABELS[openLog.provider]} accounts</Link>
            </>
          }
        >
          {openLog.errorMessage && <p className="mv-inline-error" role="alert">{openLog.errorMessage}</p>}
          <h3 className="mv-detail-heading">Sync run</h3>
          <DetailList
            items={[
              { label: 'Provider', value: PROVIDER_LABELS[openLog.provider] },
              { label: 'Triggered by', value: openLog.triggeredBy === 'system' ? 'System (scheduled)' : openLog.triggeredBy },
              { label: 'Started', value: formatTimestamp(openLog.startedAt) },
              { label: 'Finished', value: openLog.completedAt ? formatTimestamp(openLog.completedAt) : 'Still running' },
              { label: 'Duration', value: formatDuration(openLog.startedAt, openLog.completedAt) },
              { label: 'Log ID', value: openLog.id },
            ]}
          />
        </DetailDrawer>
      )}
    </div>
  );
}
