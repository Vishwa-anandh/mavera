import { SAP_PERFORMANCE, SAP_SERVER_TOPOLOGY, SAP_DISK_USAGE } from '../../../demo/sap/mockSapPerformance';
import { DonutChart } from '../../../shared/ui/DonutChart';
import { chartColors } from '../../../shared/theme/tokens';
import { useMaveraTheme } from '../../../shared/theme/ThemeProvider';
import { TrendUpIcon, RefreshIcon } from '../../../shared/ui/icons';
import { DestinationSwitcher } from '../components/DestinationSwitcher';
import { PageHeader } from '../../../shared/ui/PageHeader';

/** A percentage metric that shows "Not reported" instead of a misleading 0% when the SAP
 * system didn't send a value. */
function PercentKpi({ label, value }: { label: string; value: number | null }) {
  return (
    <article className="mv-kpi">
      <span className="mv-kpi-label">{label}</span>
      {value === null ? (
        <>
          <strong className="mv-kpi-value mv-kpi-value--missing" aria-label={`${label} not reported`}>—</strong>
          <span className="mv-muted">Not reported by this system</span>
        </>
      ) : (
        <strong className="mv-kpi-value">{value}%</strong>
      )}
    </article>
  );
}

function DiskBar({ mount }: { mount: (typeof SAP_DISK_USAGE)[number] }) {
  const tone = mount.percent >= 90 ? 'danger' : mount.percent >= 75 ? 'warning' : 'success';
  return (
    <div style={{ marginBottom: '0.875rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
        <strong>{mount.path}</strong>
        <span className={`mv-status mv-status--${tone}`}>{mount.percent}%</span>
      </div>
      <div style={{ height: '0.375rem', borderRadius: '62.4375rem', background: 'var(--mv-surface-subtle)', overflow: 'hidden' }}>
        <div style={{ width: `${mount.percent}%`, height: '100%', background: tone === 'danger' ? 'var(--mv-danger)' : tone === 'warning' ? 'var(--mv-warning)' : 'var(--mv-success)' }} />
      </div>
      <p className="mv-muted" style={{ margin: '0.1875rem 0 0', fontSize: '0.6875rem' }}>Used {mount.usedMb.toFixed(1)} MB · Free {mount.freeMb.toFixed(1)} MB · Total {mount.totalMb.toFixed(1)} MB</p>
    </div>
  );
}

/** Maps to MIO's "SAP Monitoring" (ABAP performance) deep dive — the fleet
 * list lives separately at /sap/systems. */
export function SapPerformancePage() {
  const { mode } = useMaveraTheme();
  const colors = chartColors[mode];
  const p = SAP_PERFORMANCE;

  return (
    <div>
      <PageHeader title="Performance" subtitle="ABAP system performance — response time, work processes and disk health.">
        <DestinationSwitcher />
      </PageHeader>

      <section className="mv-panel mv-panel--flat" style={{ marginBottom: '0.75rem' }}>
        <div className="mv-panel-header">
          <h2 className="mv-panel-title"><TrendUpIcon size={16} style={{ verticalAlign: -3, marginRight: '0.375rem' }} />SAP Performance <span className="mv-muted" style={{ fontWeight: 400 }}>{p.system}</span></h2>
          <button className="mv-quiet-button"><RefreshIcon size={14} style={{ marginRight: '0.375rem' }} />Refresh</button>
        </div>
        <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.8125rem' }}>
          <span className="mv-status mv-status--success">{p.status}</span>
          <span className="mv-muted">Last fetched <strong style={{ color: 'var(--mv-text)' }}>{p.lastFetched}</strong></span>
          <span className="mv-muted">Next sync <strong style={{ color: 'var(--mv-text)' }}>{p.nextSyncMinutes}m</strong></span>
        </div>
      </section>

      <div className="mv-kpi-row-8" style={{ marginBottom: '1.25rem' }}>
        <article className="mv-kpi"><span className="mv-kpi-label">Response Time</span><strong className="mv-kpi-value">{p.responseTimeMs}ms</strong></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Active Users</span><strong className="mv-kpi-value">{p.activeUsers}</strong></article>
        <PercentKpi label="DB Hit Ratio" value={p.dbHitRatioPercent} />
        <article className="mv-kpi"><span className="mv-kpi-label">Work Processes</span><strong className="mv-kpi-value">{p.workProcessesUsed}/{p.workProcessesTotal}</strong></article>
        <article className="mv-kpi"><span className="mv-kpi-label">ABAP Dumps</span><strong className="mv-kpi-value">{p.abapDumps}</strong></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Aborted Jobs</span><strong className="mv-kpi-value">{p.abortedJobs}</strong></article>
        <PercentKpi label="Memory Usage" value={p.memoryUsagePercent} />
        <article className="mv-kpi"><span className="mv-kpi-label">System Locks</span><strong className="mv-kpi-value">{p.systemLocks}</strong></article>
      </div>

      <div className="mv-columns-16-8" style={{ marginBottom: '1.25rem' }}>
        <div className="mv-column-stack">
          <section className="mv-panel">
            <div className="mv-panel-header">
              <h2 className="mv-panel-title">Server Topology <span className="mv-muted" style={{ fontWeight: 400 }}>SM51</span></h2>
              <span className="mv-muted">{SAP_SERVER_TOPOLOGY.length} {SAP_SERVER_TOPOLOGY.length === 1 ? 'instance' : 'instances'}</span>
            </div>
            <ul className="mv-server-grid">
              {SAP_SERVER_TOPOLOGY.map((node) => (
                <li key={node.id} className="mv-server">
                  <div className="mv-server-head">
                    <div className="mv-server-name">
                      <strong>{node.id}</strong>
                      <span className="mv-muted">{node.host}</span>
                    </div>
                    <span className="mv-status mv-status--success">{node.status}</span>
                  </div>
                  <dl className="mv-server-metrics">
                    <div><dt>Response</dt><dd>{node.responseMs}<small> ms</small></dd></div>
                    <div><dt>Users</dt><dd>{node.users}</dd></div>
                    <div><dt>Quality</dt><dd>{node.quality}</dd></div>
                    <div><dt>Dialog steps</dt><dd>{node.steps}</dd></div>
                  </dl>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <section className="mv-panel">
          <div className="mv-panel-header"><h2 className="mv-panel-title">Disk Usage <span className="mv-muted" style={{ fontWeight: 400 }}>ST06</span></h2></div>
          <DonutChart
            title="Disk usage by mount"
            totalLabel="Used"
            data={SAP_DISK_USAGE.map((m, i) => ({ label: m.path, value: m.usedMb, color: [colors.primary, colors.secondary, colors.tertiary, colors.axis, colors.grid][i % 5] }))}
          />
          {SAP_DISK_USAGE.map((mount) => <DiskBar key={mount.path} mount={mount} />)}
        </section>
      </div>
    </div>
  );
}
