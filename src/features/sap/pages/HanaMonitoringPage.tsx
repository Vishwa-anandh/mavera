import { useMemo, useState } from 'react';
import { sapRepository } from '../../../data-access';
import { HanaVitalsChart } from '../components/HanaVitalsChart';
import { hanaFacts, hanaInsights } from '../model/sapInsights';
import { BarList } from '../../../shared/ui/BarList';
import { DonutChart } from '../../../shared/ui/DonutChart';
import { InsightList } from '../../../shared/ui/InsightList';
import { ServerIcon, RefreshIcon, ClockIcon } from '../../../shared/ui/icons';
import { DestinationSwitcher } from '../components/DestinationSwitcher';
import { PageHeader } from '../../../shared/ui/PageHeader';

function tone(condition: string): string {
  if (condition === 'healthy' || condition === 'stable') return 'success';
  if (condition === 'warning') return 'warning';
  return 'danger';
}

/**
 * Single-system HANA deep dive — host vitals, 24h CPU/memory timeline and
 * the service list. Distinct from /sap/systems (the fleet-wide list):
 * this is what you land on after picking one system to inspect.
 */
export function HanaMonitoringPage() {
  const { system: HANA_SYSTEM, timeline: HANA_VITALS_TIMELINE, services: HANA_SERVICES } = useMemo(() => sapRepository.getHana(), []);
  const [refreshedAt, setRefreshedAt] = useState(HANA_SYSTEM.lastFetched);
  const runningCount = HANA_SERVICES.filter((s) => s.status === 'running').length;
  const facts = hanaFacts(HANA_SYSTEM, HANA_VITALS_TIMELINE, HANA_SERVICES);
  const insights = hanaInsights(HANA_SYSTEM, HANA_VITALS_TIMELINE, HANA_SERVICES);
  const services = [...HANA_SERVICES].sort((a, b) => Number(b.status === 'stopped') - Number(a.status === 'stopped') || b.memoryMb - a.memoryMb);
  const memoryByService = HANA_SERVICES.filter((s) => s.memoryMb > 0).sort((a, b) => b.memoryMb - a.memoryMb);

  return (
    <div>
      <PageHeader title="HANA/DB Monitoring" subtitle="Live host vitals for your connected HANA system.">
        <DestinationSwitcher />
      </PageHeader>

      <section className="mv-panel" style={{ marginBottom: '1.25rem' }}>
        <div className="mv-panel-header">
          <h2 className="mv-panel-title"><ServerIcon size={16} style={{ verticalAlign: -3, marginRight: '0.375rem' }} />{HANA_SYSTEM.name} <span className="mv-muted" style={{ fontWeight: 400 }}>{HANA_SYSTEM.type}</span></h2>
          <button className="mv-quiet-button" onClick={() => setRefreshedAt(new Date().toLocaleTimeString())}><RefreshIcon size={14} style={{ marginRight: '0.375rem' }} />Refresh</button>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.8125rem' }}>
          <span className="mv-muted">Host <strong style={{ color: 'var(--mv-text)' }}>{HANA_SYSTEM.host}</strong></span>
          <span className="mv-muted">Version <strong style={{ color: 'var(--mv-text)' }}>{HANA_SYSTEM.version}</strong></span>
          <span className="mv-muted"><ClockIcon size={12} style={{ verticalAlign: -1, marginRight: '0.1875rem' }} />Last fetched <strong style={{ color: 'var(--mv-text)' }}>{refreshedAt}</strong></span>
          <span className="mv-muted">Next sync <strong style={{ color: 'var(--mv-text)' }}>{HANA_SYSTEM.nextSyncMinutes}m</strong></span>
        </div>
      </section>

      <div className="mv-kpi-row-4" style={{ marginBottom: '1.25rem' }}>
        <article className="mv-kpi">
          <span className="mv-kpi-label">Memory <span className={`mv-status mv-status--${tone(HANA_SYSTEM.memory.condition)}`} style={{ marginLeft: '0.375rem' }}>{HANA_SYSTEM.memory.condition === 'healthy' ? 'Healthy' : HANA_SYSTEM.memory.condition}</span></span>
          <strong className="mv-kpi-value">{HANA_SYSTEM.memory.percent}%</strong>
          <span className="mv-muted">Used {HANA_SYSTEM.memory.usedGb} GB · Total {HANA_SYSTEM.memory.totalGb} GB · Free {HANA_SYSTEM.memory.freeGb} GB</span>
        </article>
        <article className="mv-kpi">
          <span className="mv-kpi-label">CPU <span className="mv-status mv-status--success" style={{ marginLeft: '0.375rem' }}>Stable</span></span>
          <strong className="mv-kpi-value">{HANA_SYSTEM.cpu.loadPercent}%</strong>
          <span className="mv-muted">Swap {HANA_SYSTEM.cpu.swapUsedGb} GB · Services {HANA_SYSTEM.cpu.services} · Peak 24H {HANA_SYSTEM.cpu.peak24h}%</span>
        </article>
        <article className="mv-kpi">
          <span className="mv-kpi-label">Alerts <span className="mv-status mv-status--danger" style={{ marginLeft: '0.375rem' }}>Active</span></span>
          <strong className="mv-kpi-value">{HANA_SYSTEM.alerts.active}</strong>
          <span className="mv-muted">Critical {HANA_SYSTEM.alerts.critical} · High {HANA_SYSTEM.alerts.high} · Medium {HANA_SYSTEM.alerts.medium} · Low {HANA_SYSTEM.alerts.low}</span>
        </article>
        <article className="mv-kpi">
          <span className="mv-kpi-label">Sessions <span className="mv-status mv-status--success" style={{ marginLeft: '0.375rem' }}>Live</span></span>
          <strong className="mv-kpi-value">{HANA_SYSTEM.sessions.active}</strong>
          <span className="mv-muted">{HANA_SYSTEM.sessions.uniqueUsers} unique user{HANA_SYSTEM.sessions.uniqueUsers === 1 ? '' : 's'}</span>
        </article>
      </div>

      <section className="mv-panel" aria-labelledby="hana-insights-title" style={{ marginBottom: '1rem' }}>
        <div className="mv-panel-header">
          <div>
            <h2 id="hana-insights-title" className="mv-panel-title">Last 24 hours</h2>
            <p className="mv-muted">What the host did over the window, and anything that needs a look.</p>
          </div>
        </div>
        <InsightList items={insights} label="HANA findings for the last 24 hours" />
      </section>

      <div className="mv-columns-16-8" style={{ '--mv-cols': '3fr 2fr', marginBottom: '1rem' } as React.CSSProperties}>
        <section className="mv-panel">
          <div className="mv-panel-header"><h2 className="mv-panel-title">System Vitals Timeline</h2><p className="mv-muted" style={{ margin: 0 }}>CPU &amp; memory over 24 hours · CPU peaked at {facts.peakCpu.percent}% around {facts.peakCpu.time}</p></div>
          <HanaVitalsChart data={HANA_VITALS_TIMELINE} />
        </section>

        <section className="mv-panel" aria-labelledby="hana-memory-title">
          <div className="mv-panel-header"><h2 id="hana-memory-title" className="mv-panel-title">Memory composition</h2><span className="mv-muted">{HANA_SYSTEM.memory.totalGb} GB total</span></div>
          <DonutChart
            title="HANA memory, used and free"
            totalLabel="GB total"
            data={[
              { label: 'Used', value: HANA_SYSTEM.memory.usedGb, color: 'var(--mv-primary)' },
              { label: 'Free', value: HANA_SYSTEM.memory.freeGb, color: 'var(--mv-success)' },
            ]}
          />
        </section>
      </div>

      <div className="mv-columns-16-8" style={{ '--mv-cols': '2fr 3fr' } as React.CSSProperties}>
        <section className="mv-panel" aria-labelledby="hana-svc-mem-title">
          <div className="mv-panel-header"><h2 id="hana-svc-mem-title" className="mv-panel-title">Memory by service</h2><span className="mv-muted">largest first</span></div>
          <BarList
            label="HANA memory by service"
            items={memoryByService.map((s) => ({ key: s.name, label: s.name, value: s.memoryMb, display: `${(s.memoryMb / 1024).toFixed(1)} GB` }))}
          />
        </section>

        <section className="mv-panel">
          <div className="mv-panel-header"><h2 className="mv-panel-title">Active Core Services</h2><span className="mv-muted">{runningCount} of {HANA_SERVICES.length} running</span></div>
          <div className="mv-table-wrap">
            <table className="mv-table">
              <thead><tr><th>Service</th><th>Status</th><th className="mv-num">Memory</th></tr></thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.name}>
                    <td>{service.name}</td>
                    <td><span className={`mv-status ${service.status === 'running' ? 'mv-status--success' : 'mv-status--warning'}`}>{service.status === 'running' ? 'Running' : 'Stopped'}</span></td>
                    <td className="mv-num">{service.memoryMb > 0 ? `${(service.memoryMb / 1024).toFixed(1)} GB` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
