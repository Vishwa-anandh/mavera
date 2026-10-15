import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { sapRepository } from '../../../data-access';
import { SapHealthSummary, SapSystemsPanel, sapConditionCounts } from '../components/SapSystemsPanel';
import { DestinationSwitcher } from '../components/DestinationSwitcher';
import { fleetInsights, LOAD_THRESHOLD_PERCENT } from '../model/sapInsights';
import { BarSeriesChart } from '../../../shared/ui/BarSeriesChart';
import { BarList } from '../../../shared/ui/BarList';
import { DonutChart } from '../../../shared/ui/DonutChart';
import { InsightList } from '../../../shared/ui/InsightList';
import { PageHeader } from '../../../shared/ui/PageHeader';

const CONDITION_COLOR = { healthy: 'var(--mv-success)', warning: 'var(--mv-warning)', critical: 'var(--mv-danger)' } as const;
const SEVERITIES = ['Critical', 'High', 'Medium', 'Low'] as const;
const SEVERITY_TONE = { Critical: 'danger', High: 'warning', Medium: 'primary', Low: 'primary' } as const;

/**
 * SAP Overview: the health figures, then how loaded each system is, what needs attention and what
 * operations have going on, above the one systems table. Replaces the former System Health page;
 * `/sap/health` redirects here.
 */
export function SapOverviewPage() {
  const { systems, alerts, jobs, dumps, disks, notes } = useMemo(
    () => ({
      systems: sapRepository.listSystems(),
      alerts: sapRepository.listAlerts(),
      jobs: sapRepository.listJobs(),
      dumps: sapRepository.listDumps(),
      disks: sapRepository.listDiskMounts(),
      notes: sapRepository.getSecurityNoteSummary(),
    }),
    [],
  );
  const insights = fleetInsights({ systems, alerts, jobs, dumps, disks, notes });
  const counts = sapConditionCounts(systems);
  const loadData = [...systems]
    .sort((a, b) => Math.max(b.cpuPercent, b.memoryPercent) - Math.max(a.cpuPercent, a.memoryPercent))
    .map((s) => ({ name: s.name, cpu: s.cpuPercent, memory: s.memoryPercent }));
  const bySeverity = SEVERITIES.map((s) => ({ severity: s, count: alerts.filter((a) => a.severity === s && !a.read).length })).filter((x) => x.count > 0);
  const jobCounts = (['Running', 'Scheduled', 'Finished', 'Cancelled'] as const).map((status) => ({ status, count: jobs.filter((j) => j.status === status).length }));

  return (
    <div>
      <PageHeader title="SAP Overview" subtitle="Health at a glance, where the load is, and what needs attention across your connected systems.">
        <DestinationSwitcher />
      </PageHeader>

      <SapHealthSummary />

      <div className="mv-columns-16-8" style={{ '--mv-cols': '3fr 2fr', marginBottom: '1rem' } as React.CSSProperties}>
        <section className="mv-panel" aria-labelledby="sap-load-title">
          <div className="mv-panel-header">
            <div>
              <h2 id="sap-load-title" className="mv-panel-title">Resource load by system</h2>
              <p className="mv-muted">CPU and memory per system, busiest first. Systems above {LOAD_THRESHOLD_PERCENT}% need capacity or tuning.</p>
            </div>
          </div>
          <BarSeriesChart
            title="CPU and memory load by system"
            data={loadData}
            series={[{ key: 'cpu', label: 'CPU' }, { key: 'memory', label: 'Memory' }]}
            threshold={{ value: LOAD_THRESHOLD_PERCENT, label: `${LOAD_THRESHOLD_PERCENT}%` }}
            format={(v) => `${v}%`}
          />
        </section>

        <section className="mv-panel" aria-labelledby="sap-mix-title">
          <div className="mv-panel-header"><h2 id="sap-mix-title" className="mv-panel-title">System condition</h2></div>
          <DonutChart
            title="Systems by condition"
            totalLabel="Systems"
            data={(['critical', 'warning', 'healthy'] as const).filter((c) => counts[c] > 0).map((c) => ({ label: c[0].toUpperCase() + c.slice(1), value: counts[c], color: CONDITION_COLOR[c] }))}
          />
        </section>
      </div>

      <div className="mv-columns-16-8" style={{ '--mv-cols': '3fr 2fr', marginBottom: '1rem' } as React.CSSProperties}>
        <section className="mv-panel" aria-labelledby="sap-attention-title">
          <div className="mv-panel-header">
            <h2 id="sap-attention-title" className="mv-panel-title">Needs attention</h2>
            <span className="mv-muted">{insights.length} {insights.length === 1 ? 'item' : 'items'}</span>
          </div>
          <InsightList items={insights} label="SAP items that need attention" empty="All systems are quiet — nothing needs attention." />
        </section>

        <section className="mv-panel" aria-labelledby="sap-ops-title">
          <div className="mv-panel-header"><h2 id="sap-ops-title" className="mv-panel-title">Operations</h2></div>
          <h3 className="mv-detail-heading">Unread alerts by severity</h3>
          {bySeverity.length === 0 ? (
            <p className="mv-muted">No unread alerts.</p>
          ) : (
            <BarList label="Unread SAP alerts by severity" items={bySeverity.map((x) => ({ key: x.severity, label: x.severity, value: x.count, tone: SEVERITY_TONE[x.severity] }))} />
          )}
          <h3 className="mv-detail-heading" style={{ marginTop: '1rem' }}>Background jobs</h3>
          <p className="mv-muted" style={{ margin: 0 }}>
            {jobCounts.filter((j) => j.count > 0).map((j) => `${j.count} ${j.status.toLowerCase()}`).join(' · ')}
            {' · '}<Link to="/sap/jobs">Open Jobs &amp; Dumps</Link>
          </p>
        </section>
      </div>

      <section className="mv-panel" aria-labelledby="sap-systems-title">
        <div className="mv-panel-header"><h2 id="sap-systems-title" className="mv-panel-title">Systems</h2></div>
        <SapSystemsPanel />
      </section>
    </div>
  );
}
