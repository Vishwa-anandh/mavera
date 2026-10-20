import { useState } from 'react';
import { sapAdminRepository, type SapSmartAlert } from '../../../data-access';
import { fireToast } from '../../../shared/lib/toastEvents';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Pagination } from '../../../shared/ui/Pagination';
import { SegmentedToggle } from '../../../shared/ui/SegmentedToggle';
import { Select } from '../../../shared/ui/Select';
import { StatusTag, type StatusTone } from '../../../shared/ui/StatusTag';
import { Tooltip } from '../../../shared/ui/Tooltip';
import { usePagination } from '../../../shared/ui/usePagination';
import { CheckIcon, EyeSlashIcon, MailIcon, RefreshIcon, SettingsIcon } from '../../../shared/ui/icons';
import { AlertRecipientsDialog } from '../components/AlertRecipientsDialog';
import { AlertSettingsDrawer } from '../components/AlertSettingsDrawer';
import { DestinationSwitcher } from '../components/DestinationSwitcher';
import { ALERT_TYPES, ALERT_VIEWS, SEVERITY_TONE, alertCounts, alertSummary, filterAlerts, type AlertFilters, type SourceFilter } from '../model/sapAlerts';
import { formatStamp } from '../model/sapFormat';

const repo = sapAdminRepository.alerts;
const SOURCES: Array<{ value: SourceFilter; label: string }> = [
  { value: 'All', label: 'All sources' },
  { value: 'HANA', label: 'HANA Monitoring' },
  { value: 'SAP', label: 'SAP Monitoring' },
];

function statusOf(alert: SapSmartAlert): { label: string; tone: StatusTone } {
  if (alert.state === 'resolved') return { label: 'Resolved', tone: 'success' };
  if (alert.state === 'ignored') return { label: 'Ignored', tone: 'neutral' };
  return alert.read ? { label: 'Read', tone: 'neutral' } : { label: 'Unread', tone: 'info' };
}

/**
 * SAP and HANA anomaly alerts (MIO /smart-alerts), distinct from the org-wide cost alerts. A source switch
 * narrows everything on the page to HANA or SAP Monitoring; alerts can be marked read, resolved or ignored
 * and brought back. Detection settings and recipients open from the header. State lives in the data-access
 * store, so it survives moving between pages.
 */
export function SapAlertsPage() {
  const [alerts, setAlerts] = useState<SapSmartAlert[]>(() => repo.list());
  const [adjustments, setAdjustments] = useState<string[]>(() => repo.listAdjustments());
  const [source, setSource] = useState<SourceFilter>('All');
  const [view, setView] = useState<AlertFilters['view']>('active');
  const [type, setType] = useState<AlertFilters['type']>('All');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [recipientsOpen, setRecipientsOpen] = useState(false);

  const reload = () => { setAlerts(repo.list()); setAdjustments(repo.listAdjustments()); };
  const counts = alertCounts(alerts, source);
  const summary = alertSummary(alerts, source, adjustments);
  const filtered = filterAlerts(alerts, { source, view, type });
  const paging = usePagination(filtered, 10, `${source}|${view}|${type}`);
  const filtersActive = view !== 'active' || type !== 'All';

  const act = (change: () => unknown, message: string) => {
    change();
    reload();
    fireToast({ type: 'success', message });
  };

  const markAll = () => {
    const changed = repo.markAllRead(source === 'All' ? undefined : source);
    reload();
    fireToast({ type: changed > 0 ? 'success' : 'info', message: changed > 0 ? `${changed} alert${changed === 1 ? '' : 's'} marked as read.` : 'There are no unread alerts.' });
  };

  const refresh = () => {
    reload();
    fireToast({ type: 'info', message: 'Alerts refreshed. Detection runs nightly, so there is nothing newer yet.' });
  };

  return (
    <div>
      <PageHeader title="Alerts & Escalations" subtitle="Automated detection of threshold breaches across SAP HANA and ABAP monitoring metrics.">
        <div className="mv-actions-wrap">
        <DestinationSwitcher />
        <button type="button" className="mv-secondary-button" onClick={() => setRecipientsOpen(true)}><MailIcon size={14} style={{ marginRight: '0.375rem' }} />Recipients</button>
        <button type="button" className="mv-secondary-button" onClick={() => setSettingsOpen(true)}><SettingsIcon size={14} style={{ marginRight: '0.375rem' }} />Settings</button>
        <button type="button" className="mv-secondary-button" onClick={markAll}><CheckIcon size={14} style={{ marginRight: '0.375rem' }} />Mark All Read</button>
        <button type="button" className="mv-secondary-button" onClick={refresh}><RefreshIcon size={14} style={{ marginRight: '0.375rem' }} />Refresh</button>
        </div>
      </PageHeader>

      <div className="mv-alert-scope">
        <SegmentedToggle<SourceFilter> label="Alert source" value={source} onChange={setSource} options={SOURCES} />
        <p className="mv-muted mv-alert-summary" aria-live="polite">
          Last alert: <strong>{summary.lastAlert ?? 'none yet'}</strong>. Ignored this month: <strong>{summary.ignoredThisMonth}</strong>. Threshold adjustments: <strong>{summary.adjustmentsThisMonth}</strong>. Detection {repo.detectionSchedule()}.
        </p>
      </div>

      <div className="mv-kpi-row-4" style={{ marginBottom: '1.25rem' }}>
        <article className="mv-kpi"><span className="mv-kpi-label">Total Active</span><strong className="mv-kpi-value">{counts.totalActive}</strong></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Unread</span><strong className="mv-kpi-value">{counts.unread}</strong></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Critical</span><strong className="mv-kpi-value">{counts.critical}</strong></article>
        <article className="mv-kpi"><span className="mv-kpi-label">New Breaches</span><strong className="mv-kpi-value">{counts.newBreaches}</strong><span className="mv-muted">Unread, last 24 hours</span></article>
      </div>

      <section className="mv-panel" aria-label="Smart Alerts & Anomalies">
        <div className="mv-filter-bar" role="search" aria-label="Filter alerts">
          <Select label="Status" hideLabel value={view} onChange={setView} options={ALERT_VIEWS.map((v) => ({ value: v.value, label: v.label }))} />
          <Select label="Type" hideLabel value={type} onChange={setType} options={[{ value: 'All', label: 'All types' }, ...ALERT_TYPES.map((t) => ({ value: t, label: t }))]} />
          {filtersActive && <button type="button" className="mv-quiet-button" onClick={() => { setView('active'); setType('All'); }}>Clear filters</button>}
        </div>

        {filtered.length === 0 ? (
          <div className="mv-empty-inline">
            <p><strong>{view === 'resolved' ? 'No resolved alerts.' : view === 'ignored' ? 'No ignored alerts.' : 'No alerts match this filter.'}</strong></p>
            {filtersActive && <button type="button" className="mv-quiet-button" onClick={() => { setView('active'); setType('All'); }}>Show active alerts</button>}
          </div>
        ) : (
          <>
            <div className="mv-table-wrap">
              <table className="mv-table mv-table--stack mv-sap-table">
                <caption className="mv-sr-only">SAP and HANA alerts</caption>
                <thead><tr><th>Type</th><th>Severity</th><th>System</th><th>Message</th><th>Detected</th><th>Status</th><th><span className="mv-sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {paging.pageItems.map((alert) => {
                    const status = statusOf(alert);
                    return (
                      <tr key={alert.id}>
                        <td data-label="Type" className="mv-stack-title"><strong>{alert.type}</strong> <span className="mv-muted">{alert.source === 'HANA' ? 'HANA' : 'SAP'}</span></td>
                        <td data-label="Severity"><StatusTag tone={SEVERITY_TONE[alert.severity]}>{alert.severity}</StatusTag></td>
                        <td data-label="System" className="mv-muted mv-alert-system">{alert.system}</td>
                        <td data-label="Message" className="mv-alert-message">{alert.message}</td>
                        <td data-label="Detected" className="mv-muted">{formatStamp(alert.detectedAt)}</td>
                        <td data-label="Status"><StatusTag tone={status.tone}>{status.label}</StatusTag></td>
                        <td className="mv-stack-actions">
                          <div className="mv-row-actions">
                            {alert.state === 'active' ? (
                              <>
                                {!alert.read && <button type="button" className="mv-quiet-button" aria-label={`Mark ${alert.type} alert on ${alert.system} as read`} onClick={() => act(() => repo.markRead(alert.id), 'Alert marked as read.')}>Read</button>}
                                <button type="button" className="mv-secondary-button" aria-label={`Resolve ${alert.type} alert on ${alert.system}`} onClick={() => act(() => repo.resolve(alert.id), 'Alert resolved. It no longer counts as active.')}>Resolve</button>
                                <Tooltip content="Ignore this alert">
                                  <button type="button" className="mv-icon-button" aria-label={`Ignore ${alert.type} alert on ${alert.system}`} onClick={() => act(() => repo.ignore(alert.id), 'Alert ignored.')}><EyeSlashIcon size={15} /></button>
                                </Tooltip>
                              </>
                            ) : (
                              <button type="button" className="mv-quiet-button" aria-label={`Reopen ${alert.type} alert on ${alert.system}`} onClick={() => act(() => repo.reopen(alert.id), 'Alert reopened.')}>Reopen</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={paging.page} pageSize={paging.pageSize} total={paging.total} onPageChange={paging.onPageChange} onPageSizeChange={paging.onPageSizeChange} noun="alerts" />
          </>
        )}
      </section>

      {settingsOpen && <AlertSettingsDrawer onClose={() => setSettingsOpen(false)} onAdjusted={reload} />}
      {recipientsOpen && <AlertRecipientsDialog onClose={() => setRecipientsOpen(false)} />}
    </div>
  );
}
