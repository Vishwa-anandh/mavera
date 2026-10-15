import { useState } from 'react';
import { MOCK_SAP_ALERTS, SAP_ALERTS_META, HANA_ALERT_THRESHOLDS, SAP_ALERT_THRESHOLDS, type SapAlert, type AlertThresholdConfig } from '../../../demo/sap/mockSapAlerts';
import { BellIcon, CheckIcon, RefreshIcon, EyeSlashIcon, ServerIcon, TrendUpIcon, UsersIcon } from '../../../shared/ui/icons';
import { DestinationSwitcher } from '../components/DestinationSwitcher';
import { fireToast } from '../../../shared/lib/toastEvents';
import { PageHeader } from '../../../shared/ui/PageHeader';

const SEVERITY_TONE: Record<SapAlert['severity'], string> = { Critical: 'danger', High: 'warning', Medium: 'info', Low: 'neutral' };
const TYPE_FILTERS = ['All', 'CPU', 'Memory', 'Disk', 'Sessions', 'Dumps', 'Jobs', 'Locks', 'Work Processes'] as const;
const STATUS_FILTERS = ['All', 'Unread', 'Critical', 'High+'] as const;
const TOP_TABS = ['Alerts List', 'HANA Monitoring', 'SAP Monitoring'] as const;
const SUB_TABS = ['Alerts', 'Recipients', 'Settings'] as const;

function ThresholdCard({ config, onToggle, onThresholdChange }: { config: AlertThresholdConfig; onToggle: () => void; onThresholdChange: (value: number) => void }) {
  return (
    <article className="mv-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div><strong>{config.label}</strong><p className="mv-muted" style={{ margin: '2px 0 0', fontSize: '0.75rem' }}>{config.description}</p></div>
        <button type="button" className="mv-toggle" role="switch" aria-checked={config.enabled} aria-label={`Enable ${config.label} alerting`} onClick={onToggle} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem', opacity: config.enabled ? 1 : 0.5 }}>
        <span className="mv-muted">Trigger Threshold</span>
        <strong>{config.thresholdPercent} {config.unit}</strong>
      </div>
      <input
        type="range"
        min={1}
        max={100}
        value={config.thresholdPercent}
        disabled={!config.enabled}
        onChange={(e) => onThresholdChange(Number(e.target.value))}
        style={{ width: '100%', opacity: config.enabled ? 1 : 0.5 }}
      />
    </article>
  );
}

function ThresholdSettings({ title, thresholds, onSave }: { title: string; thresholds: AlertThresholdConfig[]; onSave: (next: AlertThresholdConfig[]) => void }) {
  const [drafts, setDrafts] = useState(thresholds);
  const toggle = (key: string) => setDrafts((cur) => cur.map((c) => (c.key === key ? { ...c, enabled: !c.enabled } : c)));
  const setThreshold = (key: string, value: number) => setDrafts((cur) => cur.map((c) => (c.key === key ? { ...c, thresholdPercent: value } : c)));

  return (
    <section className="mv-panel">
      <div className="mv-panel-header">
        <h2 className="mv-panel-title"><ServerIcon size={16} style={{ verticalAlign: -3, marginRight: '0.375rem' }} />{title}</h2>
        <button className="mv-primary-button" onClick={() => onSave(drafts)}><CheckIcon size={14} style={{ marginRight: '0.375rem' }} />Save Changes</button>
      </div>
      <p className="mv-muted" style={{ fontSize: '0.75rem', marginBottom: '1rem' }}>Alerts are sent by email once a metric crosses its threshold.</p>
      <div className="mv-card-grid" style={{ gap: '1rem' }}>
        {drafts.map((c) => (
          <ThresholdCard key={c.key} config={c} onToggle={() => toggle(c.key)} onThresholdChange={(v) => setThreshold(c.key, v)} />
        ))}
      </div>
    </section>
  );
}

function ComingSoon({ icon: Icon, label }: { icon: typeof UsersIcon; label: string }) {
  return (
    <div style={{ display: 'grid', placeItems: 'center', padding: '3.75rem 0', textAlign: 'center' }}>
      <Icon size={32} style={{ color: 'var(--mv-text-muted)', marginBottom: '0.625rem' }} />
      <strong>{label}</strong>
      <p className="mv-muted" style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem' }}>Coming soon</p>
    </div>
  );
}

/** Maps to MIO's "Smart Alerts" — SAP/HANA anomaly detection, distinct from
 * the org-wide /smart-alerts feature (cloud cost). Three top-level tabs:
 * the alerts list itself, and per-metric threshold configuration for HANA
 * and ABAP. */
export function SapAlertsPage() {
  const [topTab, setTopTab] = useState<(typeof TOP_TABS)[number]>('Alerts List');
  const [subTab, setSubTab] = useState<(typeof SUB_TABS)[number]>('Alerts');
  const [alerts, setAlerts] = useState(MOCK_SAP_ALERTS);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('All');
  const [typeFilter, setTypeFilter] = useState<(typeof TYPE_FILTERS)[number]>('All');
  const [hanaThresholds, setHanaThresholds] = useState(HANA_ALERT_THRESHOLDS);
  const [sapThresholds, setSapThresholds] = useState(SAP_ALERT_THRESHOLDS);

  const filtered = alerts.filter((a) => {
    if (typeFilter !== 'All' && a.type !== typeFilter) return false;
    if (statusFilter === 'Unread' && a.read) return false;
    if (statusFilter === 'Critical' && a.severity !== 'Critical') return false;
    if (statusFilter === 'High+' && !['Critical', 'High'].includes(a.severity)) return false;
    return true;
  });

  const markRead = (id: string) => setAlerts((cur) => cur.map((a) => (a.id === id ? { ...a, read: true } : a)));
  const dismiss = (id: string) => setAlerts((cur) => cur.filter((a) => a.id !== id));

  const totalActive = alerts.length;
  const unread = alerts.filter((a) => !a.read).length;
  const critical = alerts.filter((a) => a.severity === 'Critical').length;

  return (
    <div>
      <PageHeader title={<>Alerts & Escalations</>} subtitle="Automated detection of threshold breaches across SAP HANA and ABAP monitoring metrics.">
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <DestinationSwitcher />
          {topTab === 'Alerts List' && (
            <>
              <button className="mv-secondary-button" onClick={() => setAlerts((cur) => cur.map((a) => ({ ...a, read: true })))}><CheckIcon size={14} style={{ marginRight: '0.375rem' }} />Mark All Read</button>
              <button className="mv-secondary-button"><RefreshIcon size={14} style={{ marginRight: '0.375rem' }} />Refresh</button>
            </>
          )}
        </div>
      </PageHeader>

      <div className="mv-segmented" style={{ marginBottom: '1.25rem' }}>
        {TOP_TABS.map((t) => (
          <button key={t} className={`mv-segmented-btn${topTab === t ? ' is-active' : ''}`} onClick={() => setTopTab(t)}>{t === 'Alerts List' && <BellIcon size={13} style={{ marginRight: '0.375rem' }} />}{t === 'HANA Monitoring' && <ServerIcon size={13} style={{ marginRight: '0.375rem' }} />}{t === 'SAP Monitoring' && <TrendUpIcon size={13} style={{ marginRight: '0.375rem' }} />}{t}</button>
        ))}
      </div>

      {topTab === 'HANA Monitoring' && <ThresholdSettings title="HANA Monitoring Thresholds" thresholds={hanaThresholds} onSave={(next) => { setHanaThresholds(next); fireToast({ type: 'success', message: 'HANA alert thresholds saved.' }); }} />}
      {topTab === 'SAP Monitoring' && <ThresholdSettings title="SAP Monitoring Thresholds" thresholds={sapThresholds} onSave={(next) => { setSapThresholds(next); fireToast({ type: 'success', message: 'SAP alert thresholds saved.' }); }} />}

      {topTab === 'Alerts List' && (
        <>
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.75rem', marginBottom: '1rem' }} className="mv-muted">
            <span>Last alert <strong style={{ color: 'var(--mv-text)' }}>{SAP_ALERTS_META.lastAlert}</strong></span>
            <span>Ignored this month <strong style={{ color: 'var(--mv-text)' }}>{SAP_ALERTS_META.ignoredThisMonth}</strong></span>
            <span>Threshold adjustments <strong style={{ color: 'var(--mv-text)' }}>{SAP_ALERTS_META.thresholdAdjustments}</strong></span>
            <span><BellIcon size={12} style={{ verticalAlign: -1, marginRight: '0.1875rem' }} />Detection: <strong style={{ color: 'var(--mv-text)' }}>{SAP_ALERTS_META.detectionSchedule}</strong></span>
          </div>

          <div className="mv-kpi-row-4" style={{ marginBottom: '1.25rem' }}>
            <article className="mv-kpi"><span className="mv-kpi-label">Total Active</span><strong className="mv-kpi-value">{totalActive}</strong></article>
            <article className="mv-kpi"><span className="mv-kpi-label">Unread</span><strong className="mv-kpi-value">{unread}</strong></article>
            <article className="mv-kpi"><span className="mv-kpi-label">Critical</span><strong className="mv-kpi-value">{critical}</strong></article>
            <article className="mv-kpi"><span className="mv-kpi-label">New Breaches</span><strong className="mv-kpi-value">0</strong></article>
          </div>

          <section className="mv-panel">
            <div className="mv-segmented" style={{ marginBottom: '1rem' }}>
              {SUB_TABS.map((t) => <button key={t} className={`mv-segmented-btn${subTab === t ? ' is-active' : ''}`} onClick={() => setSubTab(t)}>{t}</button>)}
            </div>

            {subTab === 'Recipients' && <ComingSoon icon={UsersIcon} label="Recipients" />}
            {subTab === 'Settings' && <ComingSoon icon={RefreshIcon} label="Detection Settings" />}
            {subTab === 'Alerts' && (
              <>
                <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  <div className="mv-segmented">
                    {STATUS_FILTERS.map((s) => (
                      <button key={s} className={`mv-segmented-btn${statusFilter === s ? ' is-active' : ''}`} onClick={() => setStatusFilter(s)}>{s}</button>
                    ))}
                  </div>
                  <div className="mv-segmented">
                    {TYPE_FILTERS.map((t) => (
                      <button key={t} className={`mv-segmented-btn${typeFilter === t ? ' is-active' : ''}`} onClick={() => setTypeFilter(t)}>{t}</button>
                    ))}
                  </div>
                </div>

                {filtered.length === 0 ? (
                  <p className="mv-muted">No alerts match this filter.</p>
                ) : (
                  <div className="mv-table-wrap">
                    <table className="mv-table">
                      <thead><tr><th>Type</th><th>Severity</th><th>System</th><th>Message</th><th>Detected</th><th aria-label="Actions" /></tr></thead>
                      <tbody>
                        {filtered.map((alert) => (
                          <tr key={alert.id}>
                            <td>{alert.type}</td>
                            <td><span className={`mv-status mv-status--${SEVERITY_TONE[alert.severity]}`}>{alert.severity}</span></td>
                            <td className="mv-muted">{alert.system}</td>
                            <td style={{ maxWidth: '26.25rem' }}>{alert.message}</td>
                            <td className="mv-muted">{alert.detectedAt}</td>
                            <td><div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                              {!alert.read && <button className="mv-quiet-button" onClick={() => markRead(alert.id)}>Read</button>}
                              <button className="mv-icon-button" aria-label={`Dismiss alert for ${alert.system}`} onClick={() => dismiss(alert.id)}><EyeSlashIcon size={15} /></button>
                            </div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
