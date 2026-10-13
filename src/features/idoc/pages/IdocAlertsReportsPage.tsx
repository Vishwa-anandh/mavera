import { useMemo, useState } from 'react';
import type { IdocRecord, IdocReportJob } from '../../../data-access';
import { AppBreadcrumb } from '../../../shared/ui/AppBreadcrumb';
import { Select } from '../../../shared/ui/Select';
import { StatusTag } from '../../../shared/ui/StatusTag';
import { downloadCsv } from '../../../shared/lib/csv';
import { fireToast } from '../../../shared/lib/toastEvents';
import { oneOf, useRememberedState } from '../../../shared/lib/useRememberedState';
import { IdocDetailDrawer } from '../components/IdocDetailDrawer';
import { IdocRecordTable } from '../components/IdocRecordTable';
import { IdocScope } from '../components/IdocScope';
import { formatDateTime, groupStats, idocKpis, lifecycleOf } from '../model/idocDerivations';
import { exportIdocs } from '../model/idocExport';
import { addReport, setAlertLifecycle, toggleAlertRule, useIdocState } from '../model/idocStore';

const SEVERITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 } as const;
const SEVERITY_TONE = { Critical: 'danger', High: 'danger', Medium: 'warning', Low: 'neutral' } as const;
const REPORT_TYPES = ['Daily IDoc summary', 'Failed IDocs by partner', 'Throughput by message type'] as const;
type ReportType = (typeof REPORT_TYPES)[number];
const PERIODS = [{ value: 1, label: 'Last 24 hours' }, { value: 7, label: 'Last 7 days' }, { value: 14, label: 'Last 14 days' }];
const DEFINITIONS = 'Completed = SAP statuses 03, 12, 53. Failed = 02, 26, 29, 51, 56. Open = all other statuses.';

function inPeriod(records: IdocRecord[], days: number) {
  const since = Date.now() - days * 86_400_000;
  return records.filter((r) => new Date(r.createdAt).getTime() >= since);
}

/** Builds a report's CSV from the records in its period; every file carries its scope and definitions. */
function downloadReport(job: IdocReportJob, records: IdocRecord[]) {
  const days = PERIODS.find((p) => p.label === job.period)?.value ?? 14;
  const scoped = inPeriod(records, days);
  const file = `${job.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`;
  const context: string[][] = [[`Scope: ${job.scope}`], [`Period: ${job.period}`], [DEFINITIONS], []];
  if (job.name === 'Failed IDocs by partner') {
    const groups = groupStats(scoped.filter((r) => lifecycleOf(r) === 'Failed'), (r) => r.partner).sort((a, b) => b.count - a.count);
    downloadCsv(file, ['Partner', 'Failed IDocs', 'Message types'], [...context, ...groups.map((g) => [g.key, g.count, [...new Set(g.records.map((r) => r.messageType))].join(' ')])]);
  } else if (job.name === 'Throughput by message type') {
    const groups = groupStats(scoped, (r) => r.messageType).sort((a, b) => b.count - a.count);
    downloadCsv(file, ['Message type', 'IDocs', 'Completed', 'Failed', 'Open'], [...context, ...groups.map((g) => [g.key, g.count, g.completed, g.failed, g.waiting])]);
  } else {
    const k = idocKpis(scoped);
    downloadCsv(file, ['Measure', 'Value'], [...context, ['IDocs', k.total], ['Inbound', k.inbound], ['Outbound', k.outbound], ['Completed', k.completed], ['Failed', k.failed], ['Open', k.open], ['Success rate %', k.successRate ?? 'n/a']]);
  }
}

/**
 * IDOC-07 — IDoc alerts (with their rules) and reports. Alerts sort by severity then newest;
 * reports by newest request. Report downloads are built from the current records and state the
 * time scope and status definitions they used.
 */
export function IdocAlertsReportsPage() {
  const { records, alerts, rules, reports } = useIdocState();
  const [tab, setTab] = useRememberedState<'alerts' | 'reports'>('idoc', 'alerts-tab', 'alerts', oneOf(['alerts', 'reports']));
  const [sourceFor, setSourceFor] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [reportType, setReportType] = useState<ReportType>(REPORT_TYPES[0]);
  const [period, setPeriod] = useState(1);

  const sortedAlerts = useMemo(() => [...alerts].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || b.raisedAt.localeCompare(a.raisedAt)), [alerts]);
  const openAlerts = alerts.filter((a) => a.lifecycle !== 'Resolved').length;
  const sourceAlert = alerts.find((a) => a.id === sourceFor);
  const sourceRecords = sourceAlert ? records.filter((r) => sourceAlert.docnums.includes(r.docnum)) : [];
  const openRecord = open ? records.find((r) => r.docnum === open) ?? null : null;

  const generate = () => {
    const job: IdocReportJob = {
      id: `rep-${Date.now()}`,
      name: reportType,
      scope: 'GRC · client 200 · all directions',
      period: PERIODS.find((p) => p.value === period)?.label ?? 'Last 24 hours',
      status: 'Ready',
      generatedAt: new Date().toISOString(),
    };
    addReport(job);
    fireToast({ type: 'success', message: `${job.name} (${job.period}) is ready to download.` });
  };

  return (
    <div>
      <AppBreadcrumb items={[{ label: 'IDoc Monitoring', path: '/idocs/overview' }, { label: 'Alerts & Reports' }]} />
      <div className="mv-page-heading">
        <div>
          <h1 className="mv-title">Alerts &amp; Reports</h1>
          <p className="mv-subtitle">IDoc alerts and the rules that raise them, plus downloadable reports.</p>
        </div>
        <IdocScope />
      </div>

      <div className="mv-segmented mv-direction-tabs" role="tablist" aria-label="Alerts or reports">
        <button type="button" role="tab" aria-selected={tab === 'alerts'} className={`mv-segmented-btn${tab === 'alerts' ? ' is-active' : ''}`} onClick={() => setTab('alerts')}>Alerts <span className="mv-count-chip">{openAlerts}</span></button>
        <button type="button" role="tab" aria-selected={tab === 'reports'} className={`mv-segmented-btn${tab === 'reports' ? ' is-active' : ''}`} onClick={() => setTab('reports')}>Reports <span className="mv-count-chip">{reports.length}</span></button>
      </div>

      {tab === 'alerts' ? (
        <>
          <section className="mv-panel" aria-labelledby="alerts-title">
            <div className="mv-panel-header">
              <div><h2 className="mv-panel-title" id="alerts-title">Alerts</h2><p className="mv-muted">{openAlerts} open or acknowledged · most severe first</p></div>
            </div>
            <div className="mv-table-wrap">
              <table className="mv-table mv-table--stack">
                <thead><tr><th>Severity</th><th>Summary</th><th>Source</th><th>Status</th><th>Raised</th><th aria-label="Actions" /></tr></thead>
                <tbody>
                  {sortedAlerts.map((alert) => (
                    <tr key={alert.id}>
                      <td data-label="Severity"><StatusTag tone={SEVERITY_TONE[alert.severity]}>{alert.severity}</StatusTag></td>
                      <td data-label="Summary" className="mv-stack-title"><strong>{alert.summary}</strong></td>
                      <td data-label="Source">{alert.source}</td>
                      <td data-label="Status">{alert.lifecycle}</td>
                      <td data-label="Raised">{formatDateTime(alert.raisedAt)}</td>
                      <td className="mv-stack-actions">
                        <div className="mv-row-actions">
                          {alert.docnums.length > 0 && <button type="button" className="mv-quiet-button" onClick={() => setSourceFor(sourceFor === alert.id ? null : alert.id)}>{sourceFor === alert.id ? 'Hide IDocs' : `View ${alert.docnums.length} IDoc${alert.docnums.length === 1 ? '' : 's'}`}</button>}
                          {alert.lifecycle === 'Open' && <button type="button" className="mv-quiet-button" onClick={() => setAlertLifecycle(alert.id, 'Acknowledged')}>Acknowledge</button>}
                          {alert.lifecycle !== 'Resolved' && <button type="button" className="mv-quiet-button" onClick={() => setAlertLifecycle(alert.id, 'Resolved')}>Resolve</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {sourceAlert && (
            <section className="mv-panel" aria-label="IDocs behind this alert" style={{ marginTop: 16 }}>
              <div className="mv-panel-header"><div><h2 className="mv-panel-title">IDocs behind this alert</h2><p className="mv-muted">{sourceAlert.summary}</p></div></div>
              <IdocRecordTable records={sourceRecords} caption="IDocs behind the selected alert" onOpen={(r) => setOpen(r.docnum)} />
            </section>
          )}

          <section className="mv-panel" aria-labelledby="rules-title" style={{ marginTop: 16 }}>
            <div className="mv-panel-header"><div><h2 className="mv-panel-title" id="rules-title">Alert rules</h2><p className="mv-muted">Which conditions raise an IDoc alert.</p></div></div>
            <ul className="mv-rule-list">
              {rules.map((rule) => (
                <li key={rule.id}>
                  <span>
                    <strong id={`${rule.id}-label`}>{rule.name}</strong>
                    <span className="mv-muted">{rule.description}</span>
                  </span>
                  <button type="button" className="mv-toggle" role="switch" aria-checked={rule.enabled} aria-labelledby={`${rule.id}-label`} onClick={() => toggleAlertRule(rule.id)} />
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <>
          <section className="mv-panel" aria-labelledby="new-report-title">
            <div className="mv-panel-header"><h2 className="mv-panel-title" id="new-report-title">Generate a report</h2></div>
            <div className="mv-form-row">
              <Select label="Report" value={reportType} onChange={setReportType} options={REPORT_TYPES.map((t) => ({ value: t, label: t }))} />
              <Select label="Period" value={period} onChange={setPeriod} options={PERIODS} />
              <button type="button" className="mv-primary-button" onClick={generate}>Generate</button>
            </div>
            <p className="mv-muted" style={{ marginTop: 10 }}>{DEFINITIONS}</p>
          </section>

          <section className="mv-panel" aria-labelledby="reports-title" style={{ marginTop: 16 }}>
            <div className="mv-panel-header"><div><h2 className="mv-panel-title" id="reports-title">Reports</h2><p className="mv-muted">Newest first</p></div>
              <button type="button" className="mv-secondary-button" onClick={() => exportIdocs('all-idocs.csv', records)}>Export all IDocs</button>
            </div>
            <div className="mv-table-wrap">
              <table className="mv-table mv-table--stack">
                <thead><tr><th>Report</th><th>Scope</th><th>Period</th><th>Status</th><th>Generated</th><th aria-label="Actions" /></tr></thead>
                <tbody>
                  {reports.map((job) => (
                    <tr key={job.id}>
                      <td data-label="Report" className="mv-stack-title"><strong>{job.name}</strong></td>
                      <td data-label="Scope">{job.scope}</td>
                      <td data-label="Period">{job.period}</td>
                      <td data-label="Status"><StatusTag tone={job.status === 'Ready' ? 'success' : job.status === 'Failed' ? 'danger' : 'info'}>{job.status}</StatusTag></td>
                      <td data-label="Generated">{job.generatedAt ? formatDateTime(job.generatedAt) : '—'}</td>
                      <td className="mv-stack-actions">
                        {job.status === 'Ready' ? (
                          <button type="button" className="mv-quiet-button" onClick={() => downloadReport(job, records)}>Download CSV</button>
                        ) : job.status === 'Failed' ? (
                          <button type="button" className="mv-quiet-button" onClick={() => { addReport({ ...job, id: `rep-${Date.now()}`, status: 'Ready', generatedAt: new Date().toISOString() }); fireToast({ type: 'success', message: `${job.name} regenerated.` }); }}>Generate again</button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {openRecord && <IdocDetailDrawer record={openRecord} onClose={() => setOpen(null)} />}
    </div>
  );
}
