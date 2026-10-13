import { useState } from 'react';
import { AppBreadcrumb } from '../../../shared/ui/AppBreadcrumb';
import { HANA_SYSTEM, HANA_VITALS_TIMELINE, HANA_SERVICES } from '../../../demo/sap/mockHanaData';
import { HanaVitalsChart } from '../components/HanaVitalsChart';
import { ServerIcon, RefreshIcon, ClockIcon } from '../../../shared/ui/icons';
import { DestinationSwitcher } from '../components/DestinationSwitcher';

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
  const [refreshedAt, setRefreshedAt] = useState(HANA_SYSTEM.lastFetched);
  const runningCount = HANA_SERVICES.filter((s) => s.status === 'running').length;

  return (
    <div>
      <AppBreadcrumb items={[{ label: 'SAP Monitoring', path: '/sap/systems' }, { label: 'HANA/DB Monitoring' }]} />
      <div className="mv-page-heading">
        <div><h1 className="mv-title">HANA/DB Monitoring</h1><p className="mv-subtitle">Live host vitals for your connected HANA system.</p></div>
        <DestinationSwitcher />
      </div>

      <section className="mv-panel" style={{ marginBottom: 20 }}>
        <div className="mv-panel-header">
          <h2 className="mv-panel-title"><ServerIcon size={16} style={{ verticalAlign: -3, marginRight: 6 }} />{HANA_SYSTEM.name} <span className="mv-muted" style={{ fontWeight: 400 }}>{HANA_SYSTEM.type}</span></h2>
          <button className="mv-quiet-button" onClick={() => setRefreshedAt(new Date().toLocaleTimeString())}><RefreshIcon size={14} style={{ marginRight: 6 }} />Refresh</button>
        </div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13 }}>
          <span className="mv-muted">Host <strong style={{ color: 'var(--mv-text)' }}>{HANA_SYSTEM.host}</strong></span>
          <span className="mv-muted">Version <strong style={{ color: 'var(--mv-text)' }}>{HANA_SYSTEM.version}</strong></span>
          <span className="mv-muted"><ClockIcon size={12} style={{ verticalAlign: -1, marginRight: 3 }} />Last fetched <strong style={{ color: 'var(--mv-text)' }}>{refreshedAt}</strong></span>
          <span className="mv-muted">Next sync <strong style={{ color: 'var(--mv-text)' }}>{HANA_SYSTEM.nextSyncMinutes}m</strong></span>
        </div>
      </section>

      <div className="mv-kpi-row-4" style={{ marginBottom: 20 }}>
        <article className="mv-kpi">
          <span className="mv-kpi-label">Memory <span className={`mv-status mv-status--${tone(HANA_SYSTEM.memory.condition)}`} style={{ marginLeft: 6 }}>{HANA_SYSTEM.memory.condition === 'healthy' ? 'Healthy' : HANA_SYSTEM.memory.condition}</span></span>
          <strong className="mv-kpi-value">{HANA_SYSTEM.memory.percent}%</strong>
          <span className="mv-muted">Used {HANA_SYSTEM.memory.usedGb} GB · Total {HANA_SYSTEM.memory.totalGb} GB · Free {HANA_SYSTEM.memory.freeGb} GB</span>
        </article>
        <article className="mv-kpi">
          <span className="mv-kpi-label">CPU <span className="mv-status mv-status--success" style={{ marginLeft: 6 }}>Stable</span></span>
          <strong className="mv-kpi-value">{HANA_SYSTEM.cpu.loadPercent}%</strong>
          <span className="mv-muted">Swap {HANA_SYSTEM.cpu.swapUsedGb} GB · Services {HANA_SYSTEM.cpu.services} · Peak 24H {HANA_SYSTEM.cpu.peak24h}%</span>
        </article>
        <article className="mv-kpi">
          <span className="mv-kpi-label">Alerts <span className="mv-status mv-status--danger" style={{ marginLeft: 6 }}>Active</span></span>
          <strong className="mv-kpi-value">{HANA_SYSTEM.alerts.active}</strong>
          <span className="mv-muted">Critical {HANA_SYSTEM.alerts.critical} · High {HANA_SYSTEM.alerts.high} · Medium {HANA_SYSTEM.alerts.medium} · Low {HANA_SYSTEM.alerts.low}</span>
        </article>
        <article className="mv-kpi">
          <span className="mv-kpi-label">Sessions <span className="mv-status mv-status--success" style={{ marginLeft: 6 }}>Live</span></span>
          <strong className="mv-kpi-value">{HANA_SYSTEM.sessions.active}</strong>
          <span className="mv-muted">{HANA_SYSTEM.sessions.uniqueUsers} unique user{HANA_SYSTEM.sessions.uniqueUsers === 1 ? '' : 's'}</span>
        </article>
      </div>

      <div className="mv-pair">
        <section className="mv-panel">
          <div className="mv-panel-header"><h2 className="mv-panel-title">System Vitals Timeline</h2><p className="mv-muted" style={{ margin: 0 }}>CPU & Memory performance over 24 hours</p></div>
          <HanaVitalsChart data={HANA_VITALS_TIMELINE} />
        </section>

        <section className="mv-panel">
          <div className="mv-panel-header"><h2 className="mv-panel-title">Active Core Services</h2><span className="mv-muted">{runningCount} of {HANA_SERVICES.length} running</span></div>
          <div className="mv-table-wrap">
            <table className="mv-table">
              <thead><tr><th>Service</th><th>Status</th><th className="mv-num">Memory</th></tr></thead>
              <tbody>
                {HANA_SERVICES.map((service) => (
                  <tr key={service.name}>
                    <td>{service.name}</td>
                    <td><span className={`mv-status ${service.status === 'running' ? 'mv-status--success' : 'mv-status--neutral'}`}>{service.status === 'running' ? 'Running' : 'Stopped'}</span></td>
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
