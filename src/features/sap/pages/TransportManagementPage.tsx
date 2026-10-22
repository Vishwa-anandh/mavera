import { SearchField } from '../../../shared/ui/SearchField';
import { SapConnectionGate } from '../components/SapConnectionGate';
import { FilterBar } from '../../../shared/ui/FilterBar';
import { useState } from 'react';
import { sapAdminRepository, type TransportState, type TransportStatus } from '../../../data-access';
import { downloadCsv } from '../../../shared/lib/csv';
import { fireToast } from '../../../shared/lib/toastEvents';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Pagination } from '../../../shared/ui/Pagination';
import { SegmentedToggle } from '../../../shared/ui/SegmentedToggle';
import { StatusTag } from '../../../shared/ui/StatusTag';
import { usePagination } from '../../../shared/ui/usePagination';
import { PlusIcon, RefreshIcon, SwapIcon, UploadIcon } from '../../../shared/ui/icons';
import { ActivityList, ActivityLogDrawer } from '../components/ActivityLogDrawer';
import { DestinationSwitcher } from '../components/DestinationSwitcher';
import { formatStampWithYear, plural } from '../model/sapFormat';
import {
  LATEST_ACTIVITY_COUNT, TRANSPORT_STATUSES, TRANSPORT_TONE, filterTransports, importQueue, sortActivity, transportCounts, transportSummary, validateRoute,
} from '../model/transports';
import { useActor } from '../model/useSecurityNotes';

const repo = sapAdminRepository.transport;
type StatusFilter = TransportStatus | 'All';

/**
 * SAP landscape transport intelligence (MIO /transport-management): counts, the import route, a filterable
 * list of requests, the latest activity and the import queue. View All Logs opens the full activity log.
 * The STMS data is sample data held in the data-access store; refreshing, setting a route, exporting and
 * importing all leave an entry in the log.
 */
function TransportManagementPageContent() {
  const actor = useActor();
  const [state, setState] = useState<TransportState>(() => repo.getState());
  const [status, setStatus] = useState<StatusFilter>('All');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const [routeAttempted, setRouteAttempted] = useState(false);
  const [busy, setBusy] = useState<'refresh' | 'import' | null>(null);
  const [logOpen, setLogOpen] = useState(false);

  const summary = transportSummary(state.transports);
  const counts = transportCounts(state.transports);
  const rows = filterTransports(state.transports, status, search);
  const paging = usePagination(rows, 10, `${status}|${search}`);
  const queue = importQueue(state.transports);
  const activity = sortActivity(state.activity);
  const routeErrors = routeAttempted ? validateRoute(source, target) : {};
  const selectable = rows.filter((t) => t.status === 'Released');
  const chosen = selected.filter((tr) => state.transports.some((t) => t.trNumber === tr && t.status === 'Released'));

  const refresh = async () => {
    setBusy('refresh');
    setState(await repo.refresh(actor));
    setBusy(null);
    fireToast({ type: 'success', message: 'STMS queue refreshed.' });
  };

  const setRoute = () => {
    setRouteAttempted(true);
    if (Object.keys(validateRoute(source, target)).length > 0) return;
    setState(repo.setRoute(source.trim().toUpperCase(), target.trim().toUpperCase(), actor));
    setSource('');
    setTarget('');
    setRouteAttempted(false);
    fireToast({ type: 'success', message: `Import route set to ${source.trim().toUpperCase()} → ${target.trim().toUpperCase()}.` });
  };

  const importSelected = async () => {
    setBusy('import');
    setState(await repo.importTransports(chosen, actor));
    setBusy(null);
    setSelected([]);
    fireToast({ type: 'success', message: `${plural(chosen.length, 'request')} imported.` });
  };

  const exportList = () => {
    downloadCsv('transports.csv', ['TR Number', 'Description', 'Type', 'Priority', 'Owner', 'Status', 'Route', 'Date'],
      rows.map((t) => [t.trNumber, t.description, t.type, t.priority, t.owner, t.status, t.route ?? '', t.date]));
    setState(repo.recordExport(rows.length, actor));
  };

  const toggle = (tr: string) => setSelected((cur) => (cur.includes(tr) ? cur.filter((x) => x !== tr) : [...cur, tr]));
  const allSelected = selectable.length > 0 && selectable.every((t) => chosen.includes(t.trNumber));

  return (
    <div>
      <PageHeader title="Transport Management" subtitle="SAP landscape transport intelligence & operations.">
        <DestinationSwitcher />
        <button type="button" className="mv-secondary-button" disabled={busy !== null} onClick={refresh}><RefreshIcon size={14} style={{ marginRight: '0.375rem' }} />{busy === 'refresh' ? 'Refreshing…' : 'Refresh'}</button>
      </PageHeader>

      <p className="mv-status-line">
        <StatusTag tone={state.stmsConnected ? 'success' : 'danger'}>{state.stmsConnected ? 'STMS Connected' : 'STMS Disconnected'}</StatusTag>
        <span className="mv-muted">Last Sync: {state.lastSync ? formatStampWithYear(state.lastSync) : '—'}</span>
        <span className="mv-muted">Sample data</span>
      </p>

      <div className="mv-columns-16-8" style={{ marginBottom: '1.25rem' }}>
        <div className="mv-kpi-row-4">
          <article className="mv-kpi"><span className="mv-kpi-label">Pending Imports</span><strong className="mv-kpi-value">{summary.pendingImports}</strong><span className="mv-muted">Awaiting Import</span></article>
          <article className="mv-kpi"><span className="mv-kpi-label">Successfully Imported</span><strong className="mv-kpi-value">{summary.successfullyImported}</strong><span className="mv-muted">Completed</span></article>
          <article className="mv-kpi"><span className="mv-kpi-label">Failed / Errors</span><strong className="mv-kpi-value">{summary.failedErrors}</strong><span className="mv-muted">Requires Attention</span></article>
          <article className="mv-kpi"><span className="mv-kpi-label">Successfully Released</span><strong className="mv-kpi-value">{summary.successfullyReleased}</strong><span className="mv-muted">Released</span></article>
        </div>
        <section className="mv-panel" aria-label="Import Route">
          <h2 className="mv-panel-title"><SwapIcon size={16} style={{ verticalAlign: -3, marginRight: '0.375rem' }} />Import Route <span className="mv-muted">Source → Target</span></h2>
          <p className="mv-muted mv-route-current">{state.route ? <>Current route: <strong>{state.route.source} → {state.route.target}</strong></> : 'No route set yet. Enter the source and target system IDs.'}</p>
          <form className="mv-route-form" noValidate onSubmit={(e) => { e.preventDefault(); setRoute(); }}>
            <label className="mv-field mv-field--flex">Source System
              <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. DEV" maxLength={3} aria-invalid={Boolean(routeErrors.source)} />
              {routeErrors.source && <span className="mv-field-error" role="alert">{routeErrors.source}</span>}
            </label>
            <label className="mv-field mv-field--flex">Target System
              <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="e.g. QAS" maxLength={3} aria-invalid={Boolean(routeErrors.target)} />
              {routeErrors.target && <span className="mv-field-error" role="alert">{routeErrors.target}</span>}
            </label>
            <button type="submit" className="mv-secondary-button" disabled={!source.trim() || !target.trim()}><PlusIcon size={14} style={{ marginRight: '0.375rem' }} />Set Route</button>
          </form>
        </section>
      </div>

      <section className="mv-panel" style={{ marginBottom: '1.25rem' }} aria-label="Transport requests">
        <FilterBar label="Filter transports">
          <SegmentedToggle<StatusFilter>
            label="Transport status"
            value={status}
            onChange={setStatus}
            options={[...TRANSPORT_STATUSES, 'All' as const].map((s) => ({ value: s, label: <>{s === 'All' ? 'All Transports' : s} <span className="mv-muted">{counts[s]}</span></>, ariaLabel: `${s === 'All' ? 'All Transports' : s}, ${counts[s]}` }))}
          />
          <SearchField label="Search by TR number, description or owner" placeholder="Search by TR number, description, owner..." value={search} onChange={setSearch} />
          <button type="button" className="mv-secondary-button" disabled={chosen.length === 0 || busy !== null} onClick={importSelected}><UploadIcon size={14} style={{ marginRight: '0.375rem' }} />{busy === 'import' ? 'Importing…' : chosen.length > 0 ? `Import Selected (${chosen.length})` : 'Import Selected'}</button>
          <button type="button" className="mv-secondary-button" disabled={rows.length === 0} onClick={exportList}>Export</button>
        </FilterBar>
        {rows.length === 0 ? (
          <div className="mv-empty-inline"><p><strong>No transports found.</strong></p></div>
        ) : (
          <>
            <div className="mv-table-wrap">
              <table className="mv-table mv-table--stack mv-sap-table">
                <caption className="mv-sr-only">Transport requests</caption>
                <thead>
                  <tr>
                    <th><input type="checkbox" aria-label="Select all released requests" checked={allSelected} disabled={selectable.length === 0} onChange={() => setSelected(allSelected ? [] : selectable.map((t) => t.trNumber))} /></th>
                    <th>TR Number</th><th>Description</th><th>Type / Priority</th><th className="mv-hide-phone">Owner</th><th>Status</th><th className="mv-hide-phone">Route</th><th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {paging.pageItems.map((t) => (
                    <tr key={t.trNumber}>
                      <td data-label="Select" className="mv-col-check"><input type="checkbox" aria-label={`Select ${t.trNumber}`} checked={chosen.includes(t.trNumber)} disabled={t.status !== 'Released'} onChange={() => toggle(t.trNumber)} /></td>
                      <td data-label="TR Number" className="mv-stack-title"><strong>{t.trNumber}</strong></td>
                      <td data-label="Description">{t.description}</td>
                      <td data-label="Type / Priority">{t.type} / {t.priority}</td>
                      <td data-label="Owner" className="mv-hide-phone">{t.owner}</td>
                      <td data-label="Status"><StatusTag tone={TRANSPORT_TONE[t.status]}>{t.status}</StatusTag></td>
                      <td data-label="Route" className="mv-muted mv-hide-phone">{t.route ?? '—'}</td>
                      <td data-label="Date" className="mv-muted">{formatStampWithYear(t.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={paging.page} pageSize={paging.pageSize} total={paging.total} onPageChange={paging.onPageChange} onPageSizeChange={paging.onPageSizeChange} noun="requests" />
          </>
        )}
      </section>

      <div className="mv-columns-16-8">
        <section className="mv-panel" aria-label="Activity Log">
          <div className="mv-panel-header">
            <h2 className="mv-panel-title">Activity Log</h2>
            <button type="button" className="mv-quiet-button" onClick={() => setLogOpen(true)}>View All Logs</button>
          </div>
          {activity.length === 0 ? <p className="mv-muted">No activity yet.</p> : <ActivityList entries={activity.slice(0, LATEST_ACTIVITY_COUNT)} label="Latest activity" />}
        </section>
        <section className="mv-panel" aria-label="Import Queue">
          <h2 className="mv-panel-title">Import Queue</h2>
          {queue.length === 0 ? <p className="mv-muted">Queue is empty.</p> : (
            <ol className="mv-transport-queue" aria-label="Requests waiting to be imported">
              {queue.map((t) => <li key={t.trNumber}><strong>{t.trNumber}</strong><span className="mv-muted">{t.description}</span></li>)}
            </ol>
          )}
        </section>
      </div>

      {logOpen && <ActivityLogDrawer entries={state.activity} onClose={() => setLogOpen(false)} />}
    </div>
  );
}


export function TransportManagementPage() {
  return (
    <SapConnectionGate title='Transport Management' subtitle='SAP landscape transport intelligence & operations.' willShow='transport requests and the import queue'>
      <TransportManagementPageContent />
    </SapConnectionGate>
  );
}
