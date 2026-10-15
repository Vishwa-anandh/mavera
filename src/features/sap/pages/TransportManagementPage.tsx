import { useState } from 'react';
import { MOCK_TRANSPORTS, TRANSPORT_SUMMARY } from '../../../demo/sap/mockTransportManagement';
import { SwapIcon, RefreshIcon, UploadIcon, PlusIcon, SearchIcon } from '../../../shared/ui/icons';
import { DestinationSwitcher } from '../components/DestinationSwitcher';
import { PageHeader } from '../../../shared/ui/PageHeader';

const TABS = ['Open', 'Released', 'Imported', 'Failed', 'All Transports'] as const;

/** New addition (no equivalent stub existed) — SAP landscape transport
 * tracking, matching MIO's Transport Management page. */
export function TransportManagementPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('All Transports');
  const s = TRANSPORT_SUMMARY;
  const countFor = (t: (typeof TABS)[number]) => (t === 'All Transports' ? MOCK_TRANSPORTS.length : MOCK_TRANSPORTS.filter((tr) => tr.status === t).length);
  const rows = tab === 'All Transports' ? MOCK_TRANSPORTS : MOCK_TRANSPORTS.filter((tr) => tr.status === tab);

  return (
    <div>
      <PageHeader title="Transport Management" subtitle={<>SAP landscape transport intelligence & operations.</>}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <DestinationSwitcher />
          <button className="mv-secondary-button"><RefreshIcon size={14} style={{ marginRight: 6 }} />Refresh</button>
        </div>
      </PageHeader>

      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16, fontSize: 13 }}>
        <span className={`mv-status ${s.stmsConnected ? 'mv-status--success' : 'mv-status--danger'}`}>{s.stmsConnected ? 'STMS Connected' : 'STMS Disconnected'}</span>
        <span className="mv-muted">Last Sync: {s.lastSync ?? '—'}</span>
      </div>

      <div className="mv-columns-16-8" style={{ marginBottom: 20 }}>
        <div className="mv-kpi-row-4">
          <article className="mv-kpi"><span className="mv-kpi-label">Pending Imports</span><strong className="mv-kpi-value">{s.pendingImports}</strong><span className="mv-muted">Awaiting Import</span></article>
          <article className="mv-kpi"><span className="mv-kpi-label">Successfully Imported</span><strong className="mv-kpi-value">{s.successfullyImported}</strong><span className="mv-muted">Completed</span></article>
          <article className="mv-kpi"><span className="mv-kpi-label">Failed / Errors</span><strong className="mv-kpi-value">{s.failedErrors}</strong><span className="mv-muted">Requires Attention</span></article>
          <article className="mv-kpi"><span className="mv-kpi-label">Successfully Released</span><strong className="mv-kpi-value">{s.successfullyReleased}</strong><span className="mv-muted">Released</span></article>
        </div>
        <section className="mv-panel">
          <h2 className="mv-panel-title" style={{ marginBottom: 10 }}><SwapIcon size={16} style={{ verticalAlign: -3, marginRight: 6 }} />Import Route <span className="mv-muted" style={{ fontWeight: 400 }}>Source → Target</span></h2>
          <p className="mv-muted" style={{ fontSize: 12, marginBottom: 10 }}>No source systems returned from SAP. Verify STMS connection or enter a system ID manually.</p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <label className="mv-field" style={{ flex: 1 }}>Source System<input placeholder="e.g. DEV" /></label>
            <label className="mv-field" style={{ flex: 1 }}>Target System<input placeholder="e.g. QAS" /></label>
          </div>
          <button className="mv-secondary-button" style={{ width: '100%', marginTop: 4 }} disabled><PlusIcon size={14} style={{ marginRight: 6 }} />Set Route</button>
        </section>
      </div>

      <section className="mv-panel" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 20, marginBottom: 14, borderBottom: '1px solid var(--mv-divider)' }}>
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className="mv-quiet-button" style={{ borderBottom: tab === t ? '2px solid var(--mv-primary)' : '2px solid transparent', borderRadius: 0, color: tab === t ? 'var(--mv-primary)' : undefined }}>
              {t} <span className="mv-muted" style={{ marginLeft: 4 }}>{countFor(t)}</span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <SearchIcon size={15} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--mv-text-muted)' }} />
            <input className="mv-select" style={{ paddingLeft: 32, width: '100%' }} placeholder="Search by TR number, description, owner..." />
          </div>
          <button className="mv-secondary-button" disabled><UploadIcon size={14} style={{ marginRight: 6 }} />Import Selected</button>
          <button className="mv-secondary-button">Export</button>
        </div>
        <div className="mv-table-wrap">
          <table className="mv-table">
            <thead><tr><th>TR Number</th><th>Description</th><th>Type / Priority</th><th>Owner</th><th>Status</th><th>Route</th><th>Date</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={8} className="mv-muted" style={{ textAlign: 'center', padding: 20 }}>No transports found.</td></tr>}
              {rows.map((t) => (
                <tr key={t.trNumber}>
                  <td><strong>{t.trNumber}</strong></td><td>{t.description}</td><td>{t.type} / {t.priority}</td><td>{t.owner}</td>
                  <td><span className="mv-status">{t.status}</span></td><td className="mv-muted">{t.route ?? '—'}</td><td className="mv-muted">{t.date}</td><td />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mv-columns-16-8">
        <section className="mv-panel"><h2 className="mv-panel-title" style={{ marginBottom: 10 }}>Activity Log</h2><p className="mv-muted">No activity yet.</p></section>
        <section className="mv-panel"><h2 className="mv-panel-title" style={{ marginBottom: 10 }}>Import Queue</h2><p className="mv-muted">Queue is empty.</p></section>
      </div>
    </div>
  );
}
