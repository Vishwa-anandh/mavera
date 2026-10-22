import { useCallback, useMemo, useState } from 'react';
import { SapConnectionGate } from '../components/SapConnectionGate';
import { sapRepository } from '../../../data-access';
import { DonutChart } from '../../../shared/ui/DonutChart';
import { TrendUpIcon, RefreshIcon } from '../../../shared/ui/icons';
import { AbapRuntimeErrorsCard } from '../components/AbapRuntimeErrorsCard';
import { BackgroundJobsSummaryCard } from '../components/BackgroundJobsSummaryCard';
import { DbCallStatsCard } from '../components/DbCallStatsCard';
import { DestinationSwitcher } from '../components/DestinationSwitcher';
import { MemoryPoolsCard } from '../components/MemoryPoolsCard';
import { MemoryUsageChart } from '../components/MemoryUsageChart';
import { MiniChart } from '../components/MiniChart';
import { QueueIndicators } from '../components/QueueIndicators';
import { SyncStatus } from '../components/SyncStatus';
import { SystemLocksCard } from '../components/SystemLocksCard';
import { TcodeBadge } from '../components/TcodeBadge';
import { WorkProcessesPanel } from '../components/WorkProcessesPanel';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { TabBar, tabPanelProps } from '../../../shared/ui/TabBar';
import { useHashTab } from '../../../shared/lib/useHashTab';
import { WORK_PROCESS_LABEL, jobDurationSeries, jobDurationStats, memoryStats, processMix, trendStats } from '../model/sapPerformance';
import { clockTime } from '../model/useSyncCountdown';

/** ABAP systems sync every five minutes. */
const SAP_SYNC_INTERVAL_SEC = 5 * 60;

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

function DiskBar({ mount }: { mount: { path: string; usedGb: number; freeGb: number; totalGb: number; percent: number } }) {
  const tone = mount.percent >= 90 ? 'danger' : mount.percent >= 75 ? 'warning' : 'success';
  return (
    <li className="mv-disk-mount">
      <div className="mv-disk-mount-head">
        <strong className="mv-mono">{mount.path}</strong>
        <span className={`mv-status mv-status--${tone}`}>{mount.percent}%</span>
      </div>
      <div className="mv-disk-track" aria-hidden="true">
        <div className={`mv-disk-fill mv-disk-fill--${tone}`} style={{ width: `${mount.percent}%` }} />
      </div>
      <p className="mv-muted mv-disk-mount-sizes">Used {mount.usedGb.toFixed(1)} GB · Free {mount.freeGb.toFixed(1)} GB · Total {mount.totalGb.toFixed(1)} GB</p>
    </li>
  );
}

const compact = (v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v));

type PerformanceTab = 'health' | 'jobs' | 'analytics';
const TABS: PerformanceTab[] = ['health', 'jobs', 'analytics'];
const TAB_ITEMS = [{ id: 'health', label: 'System health' }, { id: 'jobs', label: 'Jobs and processes' }, { id: 'analytics', label: 'Analytics' }];

/** Maps to MIO's "SAP Monitoring" (ABAP performance) deep dive — the fleet
 * list lives separately at /sap/systems. Each card carries the SAP transaction it comes from. The KPI strip and the
 * host/sync line stay above three tabs (`#health`, `#jobs`, `#analytics`): system health, jobs and processes, analytics. */
function SapPerformancePageContent() {
  const data = useMemo(() => ({
    p: sapRepository.getPerformance(),
    topology: sapRepository.listServerTopology(),
    disks: sapRepository.listDiskMounts(),
    errors: sapRepository.listDumps(),
    jobs: sapRepository.listJobs(),
    stats: sapRepository.getDbCallStatistics(),
    trends: sapRepository.getPerformanceTrends(),
    processes: sapRepository.listWorkProcesses(),
    queues: sapRepository.getQueueIndicators(),
    pools: sapRepository.listMemoryPools(),
    memory: sapRepository.getMemorySeries(),
    locks: sapRepository.listSystemLocks(),
  }), []);
  const [tab, setTab] = useHashTab(TABS);
  const { p, topology, disks, errors, jobs, stats, trends, processes, queues, pools, memory, locks } = data;
  const [sync, setSync] = useState({ at: p.lastFetched, token: 0 });
  const refresh = useCallback(() => setSync((s) => ({ at: clockTime(), token: s.token + 1 })), []);
  const autoSync = useCallback(() => setSync((s) => ({ ...s, at: clockTime() })), []);

  const durations = jobDurationStats(jobs);
  const durationSeries = jobDurationSeries(jobs);
  const mix = processMix(processes);
  // The KPI strip reads the same series and lock list as the cards, so the figures cannot disagree.
  const memoryPercent = memoryStats(memory).percent;
  const bufferStats = trendStats(trends.bufferHit);
  const callStats = trendStats(trends.dbCalls);
  const dumpsWeek = trends.dumps.reduce((sum, d) => sum + d.value, 0);
  const dumpsToday = trends.dumps[trends.dumps.length - 1]?.value ?? 0;
  const disksByFill = [...disks].sort((a, b) => b.percent - a.percent);

  return (
    <div>
      <PageHeader title="Performance" subtitle="ABAP system performance — response time, work processes and disk health.">
        <DestinationSwitcher />
      </PageHeader>

      <section className="mv-panel mv-panel--flat" style={{ marginBottom: '0.75rem' }} aria-label="SAP performance status">
        <div className="mv-panel-header">
          <h2 className="mv-panel-title"><TrendUpIcon size={16} style={{ verticalAlign: -3, marginRight: '0.375rem' }} />SAP Performance <span className="mv-muted" style={{ fontWeight: 400 }}>{p.system}</span></h2>
          <button type="button" className="mv-quiet-button" onClick={refresh}><RefreshIcon size={14} style={{ marginRight: '0.375rem' }} />Refresh</button>
        </div>
        <div className="mv-host-line">
          <span className="mv-status mv-status--success">{p.status}</span>
          <SyncStatus lastFetched={sync.at} initialSec={p.nextSyncMinutes * 60} intervalSec={SAP_SYNC_INTERVAL_SEC} restartToken={sync.token} onAutoSync={autoSync} />
        </div>
      </section>

      <div className="mv-kpi-row-8" style={{ marginBottom: '1.25rem' }}>
        <article className="mv-kpi"><span className="mv-kpi-label">Response Time</span><strong className="mv-kpi-value">{p.responseTimeMs}ms</strong></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Active Users</span><strong className="mv-kpi-value">{p.activeUsers}</strong></article>
        <PercentKpi label="DB Hit Ratio" value={p.dbHitRatioPercent} />
        <article className="mv-kpi"><span className="mv-kpi-label">Work Processes</span><strong className="mv-kpi-value">{p.workProcessesUsed}/{p.workProcessesTotal}</strong></article>
        <article className="mv-kpi"><span className="mv-kpi-label">ABAP Dumps</span><strong className="mv-kpi-value">{p.abapDumps}</strong></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Aborted Jobs</span><strong className="mv-kpi-value">{p.abortedJobs}</strong></article>
        <PercentKpi label="Memory Usage" value={memoryPercent} />
        <article className="mv-kpi"><span className="mv-kpi-label">System Locks</span><strong className="mv-kpi-value">{locks.length}</strong></article>
      </div>

      <TabBar idPrefix="sap-performance" label="Performance sections" items={TAB_ITEMS} activeId={tab} onChange={(id) => setTab(id as PerformanceTab)} />

      {tab === 'health' && (
        <div {...tabPanelProps('sap-performance', 'health')} className="mv-column-stack">
          <AbapRuntimeErrorsCard errors={errors} />

          <div className="mv-columns-16-8" style={{ '--mv-cols': '3fr 2fr' } as React.CSSProperties}>
            <section className="mv-panel" aria-labelledby="topology-title">
              <div className="mv-panel-header">
                <h2 id="topology-title" className="mv-panel-title">Server Topology <TcodeBadge code="SM51" /></h2>
                <span className="mv-muted">{topology.length} {topology.length === 1 ? 'instance' : 'instances'}</span>
              </div>
              <ul className="mv-server-grid">
                {topology.map((node) => (
                  <li key={node.id} className="mv-server">
                    <div className="mv-server-head">
                      <div className="mv-server-name">
                        <strong>{node.id}</strong>
                        <span className="mv-muted">{node.host}</span>
                      </div>
                      <span className="mv-server-state">
                        <span className="mv-muted">{node.loadPercent}% load</span>
                        <span className={`mv-status mv-status--${node.status === 'Active' ? 'success' : 'danger'}`}>{node.status}</span>
                      </span>
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
            <section className="mv-panel" aria-labelledby="disk-title">
              <div className="mv-panel-header">
                <h2 id="disk-title" className="mv-panel-title">Disk Usage <TcodeBadge code="ST06" /></h2>
                <span className="mv-muted">{disks.length} mounts · fullest first</span>
              </div>
              <ul className="mv-disk-grid" aria-label="Disk usage by mount">
                {disksByFill.map((mount) => <DiskBar key={mount.path} mount={mount} />)}
              </ul>
            </section>
          </div>

          <MemoryPoolsCard pools={pools} />

          <DbCallStatsCard stats={stats} />
        </div>
      )}

      {tab === 'jobs' && (
        <div {...tabPanelProps('sap-performance', 'jobs')} className="mv-column-stack">
          <div className="mv-columns-16-8" style={{ '--mv-cols': '3fr 2fr' } as React.CSSProperties}>
            <BackgroundJobsSummaryCard jobs={jobs} />
            <div className="mv-column-stack">
              <QueueIndicators queues={queues} />
              <SystemLocksCard locks={locks} />
            </div>
          </div>

          <WorkProcessesPanel processes={processes} system={topology[0]?.id ?? p.system} />
        </div>
      )}

      {tab === 'analytics' && (
        <section {...tabPanelProps('sap-performance', 'analytics')}>
          <div className="mv-section-head">
            <h2 id="perf-analytics-title" className="mv-panel-title">Analytics</h2>
            <p className="mv-muted">Interactive charts · each has a data table behind View data</p>
          </div>
          <div className="mv-mini-grid">
            <MemoryUsageChart series={memory} />
            <MiniChart
              title="Job Duration"
              kind="bar"
              data={durationSeries}
              summary={`Avg ${durations.avgSec}s · Max ${durations.maxSec}s · ${durations.total} jobs`}
              valueLabel="Duration"
              timeLabel="Started"
              format={(v) => `${v}s`}
            />
            <section className="mv-panel mv-mini-chart" aria-labelledby="mini-process-mix">
              <div className="mv-mini-chart-head">
                <h3 id="mini-process-mix" className="mv-panel-title">Process Mix</h3>
                <p className="mv-muted">{processes.length} work processes by type</p>
              </div>
              <DonutChart
                title="Work process mix by type"
                totalLabel="processes"
                data={mix.map((row, i) => ({
                  label: `${WORK_PROCESS_LABEL[row.type]} (${row.type})`,
                  value: row.count,
                  color: ['var(--mv-primary)', 'var(--mv-text-secondary)', 'var(--mv-success)', 'var(--mv-warning)', 'color-mix(in srgb, var(--mv-primary) 40%, var(--mv-surface))'][i % 5],
                }))}
              />
            </section>
            <MiniChart
              title="Dump Timeline"
              kind="bar"
              data={trends.dumps}
              summary={`${dumpsToday} today · ${dumpsWeek} in 7 days`}
              valueLabel="Dumps"
              timeLabel="Day"
              domain={[0, Math.max(3, ...trends.dumps.map((d) => d.value))]}
              tone="secondary"
            />
            <MiniChart
              title="Buffer Hit"
              kind="area"
              data={trends.bufferHit}
              summary={`Now ${bufferStats.last.toFixed(1)}% · Low ${bufferStats.min.toFixed(1)}% over 24 hours`}
              valueLabel="Hit ratio"
              timeLabel="Hour"
              format={(v) => `${v.toFixed(1)}%`}
              axisFormat={(v) => `${Math.round(v)}%`}
              domain={[95, 100]}
            />
            <MiniChart
              title="DB Calls"
              kind="area"
              data={trends.dbCalls}
              summary={`Peak ${compact(callStats.max)} calls per hour · Avg ${compact(Math.round(callStats.avg))}`}
              valueLabel="Calls"
              timeLabel="Hour"
              axisFormat={compact}
              tone="tertiary"
            />
          </div>
        </section>
      )}
    </div>
  );
}


export function SapPerformancePage() {
  return (
    <SapConnectionGate title='Performance' subtitle='ABAP system performance — response time, work processes and disk health.' willShow='response time, work processes and locks'>
      <SapPerformancePageContent />
    </SapConnectionGate>
  );
}
