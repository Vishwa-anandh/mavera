import { useState } from 'react';
import {
  BellIcon, RefreshIcon, CheckIcon, EyeIcon, CloseIcon,
  ClockIcon, MailIcon, SettingsIcon, UsersIcon, TrashIcon, PlusIcon, FilterIcon,
} from '../../../shared/ui/icons';
import { Tooltip } from '../../../shared/ui/Tooltip';
import { MOCK_ALERT_STATS, MOCK_RECIPIENT_CONFIGS, MOCK_SMART_ALERTS, MOCK_SMART_ALERTS_CONFIG } from '../../../demo/smartAlerts/mockSmartAlertsData';
import { SEVERITY_LABELS, SEVERITY_TONE, TYPE_LABELS, formatMoney } from '../model/smartAlertsDerivations';
import type { AlertType, RecipientConfig, SmartAlert, SmartAlertsConfig } from '../model/smartAlertsTypes';
import { PageHeader } from '../../../shared/ui/PageHeader';

type StatusFilter = 'all' | 'unread' | 'critical' | 'high';
type TypeFilter = 'all' | AlertType;
type Tab = 'alerts' | 'recipients' | 'settings';

const STATUS_FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: 'all', label: 'All' }, { key: 'unread', label: 'Unread' }, { key: 'critical', label: 'Critical' }, { key: 'high', label: 'High+' },
];
const TYPE_FILTERS: Array<{ key: TypeFilter; label: string }> = [
  { key: 'all', label: 'All' }, { key: 'spike', label: 'Spike' }, { key: 'unusual_spend', label: 'Unusual' },
  { key: 'forecast', label: 'Forecast' }, { key: 'budget_breach', label: 'Budget' }, { key: 'resource_creation', label: 'New Resource' }, { key: 'resource_deletion', label: 'Removed' },
];

const ALERT_TYPE_LABELS: Record<'cost_threshold' | 'resource_creation', string> = {
  cost_threshold: 'Cost & Budget Alerts',
  resource_creation: 'Resource / Service Creation Alerts',
};

/**
 * Smart Alerts & Anomalies, ported from the reference CCM app's
 * SmartAlertsDashboard.jsx: 3 tabs (Alerts / Recipients / Settings), a KPI
 * row + live stats bar, Status/Type filter chips, an alert table with
 * Resolve/Ignore actions and a detail modal, plus an anomaly-detection
 * sensitivity settings panel and a per-alert-type custom-recipients editor.
 * Pagination (mobile infinite-scroll vs desktop numbered pages) isn't
 * ported — this mock dataset is small enough to show in one page.
 */
export function SmartAlertsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('alerts');
  const [alerts, setAlerts] = useState<SmartAlert[]>(MOCK_SMART_ALERTS);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [selectedAlert, setSelectedAlert] = useState<SmartAlert | null>(null);

  const visible = alerts.filter((a) => a.status !== 'resolved' && !a.ignored);
  const statusFiltered = visible.filter((a) => {
    if (statusFilter === 'unread') return a.status === 'unread';
    if (statusFilter === 'critical') return a.severity === 'critical';
    if (statusFilter === 'high') return a.severity === 'high' || a.severity === 'critical';
    return true;
  });
  const filtered = statusFiltered.filter((a) => typeFilter === 'all' || a.alert_type === typeFilter);

  const unreadCount = visible.filter((a) => a.status === 'unread').length;
  const criticalCount = visible.filter((a) => a.severity === 'critical').length;
  const resourceCount = visible.filter((a) => a.alert_type === 'resource_creation').length;

  const markAsRead = (id: string) => setAlerts((cur) => cur.map((a) => (a.id === id ? { ...a, status: 'read' } : a)));
  const resolveAlert = (id: string) => setAlerts((cur) => cur.map((a) => (a.id === id ? { ...a, status: 'resolved' } : a)));
  const ignoreAlert = (id: string) => setAlerts((cur) => cur.map((a) => (a.id === id ? { ...a, ignored: true } : a)));
  const markAllRead = () => setAlerts((cur) => cur.map((a) => (a.status === 'unread' ? { ...a, status: 'read' } : a)));
  const viewAlert = (alert: SmartAlert) => { setSelectedAlert(alert); if (alert.status === 'unread') markAsRead(alert.id); };

  return (
    <div>
      <PageHeader title={<>Smart Alerts &amp; Anomalies</>} subtitle="Automated detection of billing spikes, unusual spend, budget breaches, and new resource creation.">
        {activeTab === 'alerts' && (
          <div style={{ display: 'flex', gap: '0.625rem' }}>
            {unreadCount > 0 && <button className="mv-secondary-button" onClick={markAllRead}><CheckIcon size={16} style={{ marginRight: '0.375rem' }} />Mark All Read</button>}
            <button className="mv-secondary-button"><RefreshIcon size={16} style={{ marginRight: '0.375rem' }} />Refresh</button>
          </div>
        )}
      </PageHeader>

      <div className="mv-segmented" style={{ marginBottom: '1.25rem' }}>
        <button className={`mv-segmented-btn${activeTab === 'alerts' ? ' is-active' : ''}`} onClick={() => setActiveTab('alerts')}><BellIcon size={15} />Alerts</button>
        <button className={`mv-segmented-btn${activeTab === 'recipients' ? ' is-active' : ''}`} onClick={() => setActiveTab('recipients')}><UsersIcon size={15} />Recipients</button>
        <button className={`mv-segmented-btn${activeTab === 'settings' ? ' is-active' : ''}`} onClick={() => setActiveTab('settings')}><SettingsIcon size={15} />Settings</button>
      </div>

      {activeTab === 'recipients' ? (
        <RecipientsPanel />
      ) : activeTab === 'settings' ? (
        <SettingsPanel />
      ) : (
        <>
          <div className="mv-meta-line" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><ClockIcon size={14} />Last alert: <strong>{new Date(MOCK_ALERT_STATS.lastDetectedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong></span>
            <span>Ignored this month: <strong>{MOCK_ALERT_STATS.ignoredThisMonth}</strong></span>
            <span>Threshold adjustments: <strong>{MOCK_ALERT_STATS.feedbackAdjustments}</strong></span>
            <span style={{ marginLeft: 'auto' }}>Detection runs daily at <strong>02:30 AM</strong></span>
          </div>

          <div className="mv-kpi-row-4" style={{ marginBottom: '1rem' }}>
            <article className="mv-kpi"><span className="mv-kpi-label">Total Active</span><strong className="mv-kpi-value">{visible.length}</strong></article>
            <article className="mv-kpi"><span className="mv-kpi-label">Unread</span><strong className="mv-kpi-value">{unreadCount}</strong></article>
            <article className="mv-kpi"><span className="mv-kpi-label">Critical</span><strong className="mv-kpi-value" style={{ color: 'var(--mv-danger)' }}>{criticalCount}</strong></article>
            <article className="mv-kpi"><span className="mv-kpi-label">New Resources</span><strong className="mv-kpi-value">{resourceCount}</strong></article>
          </div>

          <section className="mv-panel mv-alert-filter-bar" style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
            <FilterIcon size={16} />
            <div className="mv-filter-group" style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
              <span className="mv-muted" style={{ fontSize: '0.75rem', fontWeight: 500 }}>Status</span>
              {STATUS_FILTERS.map((f) => (
                <button key={f.key} className={`mv-segmented-btn${statusFilter === f.key ? ' is-active' : ''}`} style={{ minHeight: '1.875rem', padding: '0 0.625rem' }} onClick={() => setStatusFilter(f.key)}>{f.label}</button>
              ))}
            </div>
            <div className="mv-filter-divider" />
            <div className="mv-filter-group" style={{ display: 'flex', gap: '0.375rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="mv-muted" style={{ fontSize: '0.75rem', fontWeight: 500 }}>Type</span>
              {TYPE_FILTERS.map((f) => (
                <button key={f.key} className={`mv-segmented-btn${typeFilter === f.key ? ' is-active' : ''}`} style={{ minHeight: '1.875rem', padding: '0 0.625rem' }} onClick={() => setTypeFilter(f.key)}>{f.label}</button>
              ))}
            </div>
          </section>

          <section className="mv-panel">
            {filtered.length === 0 ? (
              <div className="mv-empty" style={{ margin: 0 }}>
                <div className="mv-empty-icon" aria-hidden><CheckIcon size={28} /></div>
                <h2>All Clear!</h2>
                <p>No active anomalies or alerts match the current filters.</p>
              </div>
            ) : (
              <div className="mv-table-wrap">
                <table className="mv-table">
                  <thead><tr><th aria-label="Unread" /><th>Type</th><th>Severity</th><th>Provider</th><th>Message</th><th>Detected</th><th aria-label="Actions" /></tr></thead>
                  <tbody>
                    {filtered.map((alert) => (
                      <tr key={alert.id} onClick={() => viewAlert(alert)} style={{ cursor: 'pointer' }}>
                        <td>{alert.status === 'unread' && <span aria-hidden style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: 'var(--mv-primary)', display: 'inline-block' }} />}</td>
                        <td style={{ fontWeight: alert.status === 'unread' ? 600 : 400 }}>{TYPE_LABELS[alert.alert_type]}</td>
                        <td><span className={`mv-status mv-status--${SEVERITY_TONE[alert.severity]}`}>{SEVERITY_LABELS[alert.severity]}</span></td>
                        <td>{alert.provider !== 'all' ? <span className="mv-status mv-status--neutral">{({ azure: 'Azure', aws: 'AWS', btp: 'SAP BTP', gcp: 'Google Cloud' } as Record<string, string>)[alert.provider] ?? alert.provider}</span> : <span className="mv-muted">—</span>}</td>
                        <td style={{ maxWidth: '20rem' }}><p className="mv-muted" style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{alert.message}</p></td>
                        <td className="mv-muted" style={{ whiteSpace: 'nowrap' }}>{new Date(alert.detected_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.25rem' }}>
                            <button className="mv-icon-button" aria-label="View" onClick={() => viewAlert(alert)}><EyeIcon size={15} /></button>
                            <button className="mv-icon-button" aria-label="Resolve" onClick={() => resolveAlert(alert.id)}><CheckIcon size={15} /></button>
                            <Tooltip content="Ignore and widen threshold for this account">
                              <button className="mv-icon-button" aria-label="Ignore" onClick={() => ignoreAlert(alert.id)}><CloseIcon size={15} /></button>
                            </Tooltip>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {selectedAlert && (
        <div className="mv-dialog-backdrop" onClick={() => setSelectedAlert(null)}>
          <section className="mv-dialog" role="dialog" aria-modal="true" aria-label={TYPE_LABELS[selectedAlert.alert_type]} onClick={(e) => e.stopPropagation()}>
            <div className="mv-panel-header">
              <div>
                <h2 className="mv-panel-title">{TYPE_LABELS[selectedAlert.alert_type]}</h2>
                <p className="mv-muted" style={{ margin: '2px 0 0' }}>Alert #{selectedAlert.id}</p>
              </div>
              <button className="mv-icon-button" aria-label="Close" onClick={() => setSelectedAlert(null)}><CloseIcon size={18} /></button>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <span className={`mv-status mv-status--${SEVERITY_TONE[selectedAlert.severity]}`}>{SEVERITY_LABELS[selectedAlert.severity]}</span>
              {selectedAlert.provider !== 'all' && <span className="mv-status mv-status--neutral">{({ azure: 'Azure', aws: 'AWS', btp: 'SAP BTP', gcp: 'Google Cloud' } as Record<string, string>)[selectedAlert.provider] ?? selectedAlert.provider}</span>}
              <span className="mv-status mv-status--neutral" style={{ textTransform: 'capitalize' }}>{selectedAlert.status}</span>
            </div>
            <p style={{ marginBottom: '1rem' }}>{selectedAlert.message}</p>
            <div className="mv-key-value">
              <DetailRow label="Account" value={selectedAlert.account_id} />
              <DetailRow label="Detected at" value={new Date(selectedAlert.detected_at).toLocaleString()} />
              <DetailRow label="Detection method" value={selectedAlert.detection_method} />
              <DetailRow label="Expected cost" value={formatMoney(selectedAlert.expected_cost)} />
              <DetailRow label="Actual cost" value={formatMoney(selectedAlert.actual_cost)} />
              <DetailRow label="Delta" value={selectedAlert.delta !== undefined ? `${formatMoney(selectedAlert.delta)} (${(selectedAlert.delta_percent ?? 0) > 0 ? '+' : ''}${selectedAlert.delta_percent?.toFixed(1)}%)` : undefined} />
              <DetailRow label="Projected end-of-month" value={formatMoney(selectedAlert.projected_eom)} />
              <DetailRow label="Service" value={selectedAlert.root_cause?.service} />
              <DetailRow label="Z-score" value={selectedAlert.root_cause?.zScore?.toFixed(2)} />
            </div>
            {selectedAlert.status !== 'resolved' && (
              <div className="mv-dialog-actions">
                {!selectedAlert.ignored && <button className="mv-secondary-button" onClick={() => { ignoreAlert(selectedAlert.id); setSelectedAlert(null); }}>Ignore</button>}
                <button className="mv-primary-button" onClick={() => { resolveAlert(selectedAlert.id); setSelectedAlert(null); }}>Resolve</button>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return <div><span className="mv-muted">{label}</span><span>{value}</span></div>;
}

const SETTINGS_FIELDS: Array<{ key: keyof SmartAlertsConfig; label: string; desc: string; min: number; max: number; step: number }> = [
  { key: 'hw_threshold_k', label: 'Sensitivity (σ multiplier)', desc: 'How many standard deviations above forecast before an alert fires. Lower = more sensitive. Default: 2.5', min: 1, max: 5, step: 0.1 },
  { key: 'min_dollar_delta', label: 'Minimum dollar threshold ($)', desc: 'Ignore spikes smaller than this amount. Default: $20', min: 0, max: 500, step: 1 },
  { key: 'cooldown_hours', label: 'Alert cooldown (hours)', desc: 'Minimum gap between repeated alerts for the same account and type. Default: 24h', min: 1, max: 168, step: 1 },
  { key: 'forecast_overage_pct', label: 'Forecast overage threshold (%)', desc: 'Fire a forecast alert when projected month-end spend exceeds budget by this percentage. Default: 10%', min: 1, max: 100, step: 1 },
  { key: 'min_history_days', label: 'Minimum history required (days)', desc: 'Accounts with fewer days of cost data use a simpler fallback method. Default: 14 days', min: 7, max: 60, step: 1 },
];

function SettingsPanel() {
  const [form, setForm] = useState<SmartAlertsConfig>(MOCK_SMART_ALERTS_CONFIG);
  const [saved, setSaved] = useState(false);
  const save = () => { setSaved(true); window.setTimeout(() => setSaved(false), 3000); };

  return (
    <div>
      <div className="mv-notice" style={{ marginBottom: '1rem' }}>
        These settings tune how sensitive anomaly detection is for your organisation. Changes take effect on the next daily detection run at <strong>02:30 AM</strong>. Ignoring an alert automatically widens the sensitivity for that account.
      </div>
      {saved && <div className="mv-notice" style={{ marginBottom: '1rem' }}><CheckIcon size={14} style={{ marginRight: '0.375rem', verticalAlign: -2 }} />Settings saved successfully.</div>}
      <section className="mv-panel" style={{ marginBottom: '1rem' }}>
        {SETTINGS_FIELDS.map((field) => (
          <div key={field.key} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 0', borderBottom: '1px solid var(--mv-divider)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 600 }}>{field.label}</p>
              <p className="mv-muted" style={{ margin: '2px 0 0' }}>{field.desc}</p>
            </div>
            <input type="range" min={field.min} max={field.max} step={field.step} value={form[field.key] as number} onChange={(e) => setForm({ ...form, [field.key]: parseFloat(e.target.value) })} style={{ width: '8.75rem' }} />
            <strong style={{ width: '3rem', textAlign: 'right' }}>{form[field.key] as number}</strong>
          </div>
        ))}
      </section>
      {Object.keys(form.account_feedback).length > 0 && (
        <section className="mv-panel" style={{ marginBottom: '1rem' }}>
          <p className="mv-panel-title" style={{ marginBottom: '0.5rem' }}>Threshold Widening by Account</p>
          <p className="mv-muted" style={{ marginBottom: '0.75rem' }}>Each time you ignore an alert, the detection band widens for that account (+0.3σ per ignore, max +1.2σ).</p>
          {Object.entries(form.account_feedback).map(([accountId, count]) => (
            <div key={accountId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', padding: '0.25rem 0' }}>
              <span className="mv-code">{accountId}</span>
              <strong style={{ color: 'var(--mv-warning)' }}>+{Math.min(count * 0.3, 1.2).toFixed(1)}σ ({count} ignore{count !== 1 ? 's' : ''})</strong>
            </div>
          ))}
        </section>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="mv-primary-button" onClick={save}><CheckIcon size={16} style={{ marginRight: '0.375rem' }} />Save Settings</button>
      </div>
    </div>
  );
}

function RecipientsPanel() {
  const [configs, setConfigs] = useState<RecipientConfig[]>(MOCK_RECIPIENT_CONFIGS);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const alertTypes: Array<'cost_threshold' | 'resource_creation'> = ['cost_threshold', 'resource_creation'];

  const getRecipients = (type: 'cost_threshold' | 'resource_creation') => configs.find((c) => c.alert_type === type)?.recipients ?? [];

  const addEmail = (type: 'cost_threshold' | 'resource_creation') => {
    const val = (inputs[type] ?? '').trim();
    if (!val || !val.includes('@')) return;
    setConfigs((cur) => {
      const existing = cur.find((c) => c.alert_type === type);
      if (existing) return cur.map((c) => (c.alert_type === type ? { ...c, recipients: [...new Set([...c.recipients, val])] } : c));
      return [...cur, { alert_type: type, recipients: [val] }];
    });
    setInputs({ ...inputs, [type]: '' });
  };
  const removeEmail = (type: 'cost_threshold' | 'resource_creation', email: string) => {
    setConfigs((cur) => cur.map((c) => (c.alert_type === type ? { ...c, recipients: c.recipients.filter((e) => e !== email) } : c)));
  };
  const resetConfig = (type: 'cost_threshold' | 'resource_creation') => setConfigs((cur) => cur.filter((c) => c.alert_type !== type));

  return (
    <div>
      <div className="mv-notice" style={{ marginBottom: '1rem' }}>
        <MailIcon size={14} style={{ marginRight: '0.375rem', verticalAlign: -2 }} />By default, all organisation members receive alert emails. Configure custom recipients below.
      </div>
      <div style={{ display: 'grid', gap: '1rem' }}>
        {alertTypes.map((type) => {
          const recipients = getRecipients(type);
          const hasCustom = configs.some((c) => c.alert_type === type);
          return (
            <section className="mv-panel" key={type}>
              <div className="mv-panel-header">
                <div>
                  <h2 className="mv-panel-title">{ALERT_TYPE_LABELS[type]}</h2>
                  <p className="mv-muted" style={{ margin: '2px 0 0' }}>{hasCustom ? `${recipients.length} custom recipient(s)` : 'Using default: all org members'}</p>
                </div>
                {hasCustom && <button className="mv-icon-button" aria-label="Reset" onClick={() => resetConfig(type)}><TrashIcon size={16} /></button>}
              </div>
              {recipients.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.625rem' }}>
                  {recipients.map((email) => (
                    <span key={email} className="mv-status mv-status--info" style={{ gap: '0.375rem' }}>
                      {email}
                      <button type="button" onClick={() => removeEmail(type, email)} aria-label={`Remove ${email}`} style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', display: 'inline-flex' }}><CloseIcon size={12} /></button>
                    </span>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input value={inputs[type] ?? ''} onChange={(e) => setInputs({ ...inputs, [type]: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEmail(type); } }} placeholder="user@example.com — press Enter to add" style={{ flex: 1, height: '2.5rem', padding: '0 0.75rem', border: '1px solid var(--mv-border)', borderRadius: '0.5rem', background: 'var(--mv-surface)', color: 'var(--mv-text)' }} />
                <button className="mv-secondary-button" onClick={() => addEmail(type)}><PlusIcon size={14} style={{ marginRight: '0.25rem' }} />Add</button>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
