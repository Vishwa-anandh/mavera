import { useCallback, useMemo, useState } from 'react';
import { SapConnectionGate } from '../components/SapConnectionGate';
import { sapRepository } from '../../../data-access';
import { HanaVitalsChart } from '../components/HanaVitalsChart';
import { HanaCoreServicesPanel } from '../components/HanaCoreServicesPanel';
import { HanaDiskUsagePanel } from '../components/HanaDiskUsagePanel';
import { HanaBackupTimeline } from '../components/HanaBackupTimeline';
import { SessionsCard } from '../components/SessionsCard';
import { SyncStatus } from '../components/SyncStatus';
import { hanaFacts, hanaInsights } from '../model/sapInsights';
import { clockTime } from '../model/useSyncCountdown';
import { DonutChart } from '../../../shared/ui/DonutChart';
import { InsightList } from '../../../shared/ui/InsightList';
import { ServerIcon, RefreshIcon } from '../../../shared/ui/icons';
import { DestinationSwitcher } from '../components/DestinationSwitcher';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { TabBar, tabPanelProps } from '../../../shared/ui/TabBar';
import { useHashTab } from '../../../shared/lib/useHashTab';

/** HANA hosts sync every 30 minutes. */
const HANA_SYNC_INTERVAL_SEC = 30 * 60;

type HanaTab = 'vitals' | 'storage' | 'backups';
const TABS: HanaTab[] = ['vitals', 'storage', 'backups'];
const TAB_ITEMS = [{ id: 'vitals', label: 'Vitals' }, { id: 'storage', label: 'Services and disk' }, { id: 'backups', label: 'Backups' }];

function tone(condition: string): string {
  if (condition === 'healthy' || condition === 'stable') return 'success';
  if (condition === 'warning') return 'warning';
  return 'danger';
}

/**
 * Single-system HANA deep dive — host vitals, 24h CPU/memory timeline, core services, disk partitions and
 * the backup timeline. Distinct from /sap/systems (the fleet-wide list):
 * this is what you land on after picking one system to inspect. The host line, KPI strip and destination switcher stay
 * above three tabs (`#vitals`, `#storage`, `#backups`); the tab last used is reopened when the page is visited again.
 */
function HanaMonitoringPageContent() {
  const [tab, setTab] = useHashTab(TABS, TABS[0], { remember: 'sap-hana' });
  const { system: HANA_SYSTEM, timeline: HANA_VITALS_TIMELINE, services: HANA_SERVICES } = useMemo(() => sapRepository.getHana(), []);
  const partitions = useMemo(() => sapRepository.listHanaDiskPartitions(), []);
  const backups = useMemo(() => sapRepository.listHanaBackups(), []);
  const [sync, setSync] = useState({ at: HANA_SYSTEM.lastFetched, token: 0 });
  const refresh = useCallback(() => setSync((f) => ({ at: clockTime(), token: f.token + 1 })), []);
  const autoSync = useCallback(() => setSync((f) => ({ ...f, at: clockTime() })), []);
  const facts = hanaFacts(HANA_SYSTEM, HANA_VITALS_TIMELINE, HANA_SERVICES);
  const insights = hanaInsights(HANA_SYSTEM, HANA_VITALS_TIMELINE, HANA_SERVICES);

  return (
    <div>
      <PageHeader title="HANA/DB Monitoring" subtitle="Live host vitals for your connected HANA system.">
        <DestinationSwitcher />
      </PageHeader>

      <section className="mv-panel" style={{ marginBottom: '1.25rem' }} aria-label={`${HANA_SYSTEM.name} host`}>
        <div className="mv-panel-header">
          <h2 className="mv-panel-title"><ServerIcon size={16} style={{ verticalAlign: -3, marginRight: '0.375rem' }} />{HANA_SYSTEM.name} <span className="mv-muted" style={{ fontWeight: 400 }}>{HANA_SYSTEM.type}</span></h2>
          <button type="button" className="mv-quiet-button" onClick={refresh}><RefreshIcon size={14} style={{ marginRight: '0.375rem' }} />Refresh</button>
        </div>
        <div className="mv-host-line">
          <span className="mv-muted">Host <strong className="mv-sync-value">{HANA_SYSTEM.host}</strong></span>
          <span className="mv-muted">Version <strong className="mv-sync-value">{HANA_SYSTEM.version}</strong></span>
          <SyncStatus
            lastFetched={sync.at}
            initialSec={HANA_SYSTEM.nextSyncMinutes * 60}
            intervalSec={HANA_SYNC_INTERVAL_SEC}
            restartToken={sync.token}
            onAutoSync={autoSync}
          />
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
        <SessionsCard sessions={HANA_SYSTEM.sessions} />
      </div>

      <TabBar idPrefix="hana" label="HANA monitoring sections" items={TAB_ITEMS} activeId={tab} onChange={(id) => setTab(id as HanaTab)} />

      {tab === 'vitals' && (
        <div {...tabPanelProps('hana', 'vitals')} className="mv-column-stack">
          <section className="mv-panel" aria-labelledby="hana-insights-title">
            <div className="mv-panel-header">
              <div>
                <h2 id="hana-insights-title" className="mv-panel-title">Last 24 hours</h2>
                <p className="mv-muted">What the host did over the window, and anything that needs a look.</p>
              </div>
            </div>
            <InsightList items={insights} label="HANA findings for the last 24 hours" />
          </section>

          <div className="mv-columns-16-8" style={{ '--mv-cols': '3fr 2fr' } as React.CSSProperties}>
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
        </div>
      )}

      {tab === 'storage' && (
        <div {...tabPanelProps('hana', 'storage')}>
          <div className="mv-columns-16-8" style={{ '--mv-cols': '1fr 1fr' } as React.CSSProperties}>
            <HanaCoreServicesPanel services={HANA_SERVICES} />
            <HanaDiskUsagePanel partitions={partitions} />
          </div>
        </div>
      )}

      {tab === 'backups' && (
        <div {...tabPanelProps('hana', 'backups')}>
          <HanaBackupTimeline backups={backups} />
        </div>
      )}
    </div>
  );
}


export function HanaMonitoringPage() {
  return (
    <SapConnectionGate title='HANA/DB Monitoring' subtitle='Live host vitals for your connected HANA system.' willShow='HANA memory, CPU, disks and backups'>
      <HanaMonitoringPageContent />
    </SapConnectionGate>
  );
}
