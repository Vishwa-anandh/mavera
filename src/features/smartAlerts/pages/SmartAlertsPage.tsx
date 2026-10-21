import { useState } from 'react';
import { smartAlertsRepository } from '../../../data-access';
import { fireToast } from '../../../shared/lib/toastEvents';
import { useHashTab } from '../../../shared/lib/useHashTab';
import { DetailDrawer, DetailList } from '../../../shared/ui/DetailDrawer';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Pagination } from '../../../shared/ui/Pagination';
import { Select } from '../../../shared/ui/Select';
import { SegmentedToggle } from '../../../shared/ui/SegmentedToggle';
import { StatusTag, type StatusTone } from '../../../shared/ui/StatusTag';
import { TabBar, tabPanelProps } from '../../../shared/ui/TabBar';
import { Tooltip } from '../../../shared/ui/Tooltip';
import { usePagination } from '../../../shared/ui/usePagination';
import { CheckIcon, ClockIcon, EyeSlashIcon, RefreshIcon } from '../../../shared/ui/icons';
import { DetectionSettingsPanel } from '../components/DetectionSettingsPanel';
import { RecipientsPanel } from '../components/RecipientsPanel';
import {
  ALERT_VIEWS, PROVIDER_LABELS, SEVERITY_LABELS, SEVERITY_TONE, TYPE_FILTERS, TYPE_LABELS, alertCounts, alertSummary, filterAlerts, formatDetected, formatMoney, providerLabel,
  type AlertView, type ProviderFilter, type TypeFilter,
} from '../model/smartAlertsDerivations';
import type { SmartAlert } from '../model/smartAlertsTypes';
import { useSettingsForm } from '../model/useSettingsForm';

const repo = smartAlertsRepository;

type AlertsTab = 'alerts' | 'recipients' | 'settings';
const TABS: AlertsTab[] = ['alerts', 'recipients', 'settings'];
const TAB_ITEMS = [{ id: 'alerts', label: 'Alerts' }, { id: 'recipients', label: 'Recipients' }, { id: 'settings', label: 'Settings' }];

const PROVIDER_OPTIONS: Array<{ value: ProviderFilter; label: string }> = [
  { value: 'all', label: 'All providers' },
  ...(Object.entries(PROVIDER_LABELS) as Array<[Exclude<ProviderFilter, 'all'>, string]>).map(([value, label]) => ({ value, label })),
];

function statusOf(alert: SmartAlert): { label: string; tone: StatusTone } {
  if (alert.ignored) return { label: 'Ignored', tone: 'neutral' };
  if (alert.status === 'resolved') return { label: 'Resolved', tone: 'success' };
  return alert.status === 'unread' ? { label: 'Unread', tone: 'info' } : { label: 'Read', tone: 'neutral' };
}

/**
 * Smart Alerts & Anomalies (CCM /smart-alerts): automated detection of billing spikes, unusual spend,
 * budget breaches and new resources. Three tabs (ids in the URL hash): Alerts (counters, filters by status,
 * type and provider, a paged table with Read, Resolve and Ignore), Recipients and Settings. Ignored alerts
 * leave every counter and are listed under the Ignored status; resolved ones under Resolved, and both can be
 * reopened. Alert state lives in the data-access store, so it survives moving between pages, and the settings
 * form state lives here so unsaved edits survive a tab switch.
 */
export function SmartAlertsPage() {
  const [alerts, setAlerts] = useState<SmartAlert[]>(() => repo.list());
  const [adjustments, setAdjustments] = useState<string[]>(() => repo.listAdjustments());
  const [feedback, setFeedback] = useState<Record<string, number>>(() => repo.getAccountFeedback());
  const [view, setView] = useState<AlertView>('active');
  const [type, setType] = useState<TypeFilter>('all');
  const [provider, setProvider] = useState<ProviderFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useHashTab(TABS);

  const reload = () => { setAlerts(repo.list()); setAdjustments(repo.listAdjustments()); setFeedback(repo.getAccountFeedback()); };
  const settingsForm = useSettingsForm(reload);
  const counts = alertCounts(alerts);
  const summary = alertSummary(alerts, adjustments);
  const filtered = filterAlerts(alerts, { view, type, provider });
  const paging = usePagination(filtered, 10, `${view}|${type}|${provider}`);
  const filtersActive = view !== 'active' || type !== 'all' || provider !== 'all';
  const selected = alerts.find((a) => a.id === selectedId) ?? null;

  const act = (change: () => unknown, message: string, tone: 'success' | 'info' = 'success') => {
    change();
    reload();
    fireToast({ type: tone, message });
  };

  const markAll = () => {
    const changed = repo.markAllRead();
    reload();
    fireToast({ type: changed > 0 ? 'success' : 'info', message: changed > 0 ? `${changed} alert${changed === 1 ? '' : 's'} marked as read.` : 'There are no unread alerts.' });
  };

  const refresh = () => {
    reload();
    fireToast({ type: 'info', message: `Alerts refreshed. Detection runs ${repo.detectionSchedule()}, so there is nothing newer yet.` });
  };

  const open = (alert: SmartAlert) => {
    if (alert.status === 'unread') { repo.markRead(alert.id); reload(); }
    setSelectedId(alert.id);
  };

  const clearFilters = () => { setView('active'); setType('all'); setProvider('all'); };

  const rowActions = (alert: SmartAlert, name: string) => (
    alert.ignored || alert.status === 'resolved' ? (
      <button type="button" className="mv-quiet-button" aria-label={`Reopen ${name}`} onClick={() => act(() => repo.reopen(alert.id), 'Alert reopened.')}>Reopen</button>
    ) : (
      <>
        {alert.status === 'unread' && <button type="button" className="mv-quiet-button" aria-label={`Mark ${name} as read`} onClick={() => act(() => repo.markRead(alert.id), 'Alert marked as read.')}>Read</button>}
        <button type="button" className="mv-secondary-button" aria-label={`Resolve ${name}`} onClick={() => act(() => repo.resolve(alert.id), 'Alert resolved. It no longer counts as active.')}>Resolve</button>
        <Tooltip content="Ignore this alert and widen the threshold for its account">
          <button type="button" className="mv-icon-button" aria-label={`Ignore ${name}`} onClick={() => act(() => repo.ignore(alert.id), 'Alert ignored. The threshold for its account is now wider.')}><EyeSlashIcon size={15} /></button>
        </Tooltip>
      </>
    )
  );

  const emptyTitle = view === 'resolved' ? 'No resolved alerts.' : view === 'ignored' ? 'No ignored alerts.' : filtersActive ? 'No alerts match these filters.' : 'All clear. There are no active alerts.';

  return (
    <div>
      <PageHeader title={<>Smart Alerts &amp; Anomalies</>} subtitle="Automated detection of billing spikes, unusual spend, budget breaches, and new resource creation." />

      <TabBar idPrefix="smart-alerts" label="Smart Alerts sections" items={TAB_ITEMS} activeId={tab} onChange={(id) => setTab(id as AlertsTab)} />

      {tab === 'alerts' && (
        <div {...tabPanelProps('smart-alerts', 'alerts')}>
          <div className="mv-alert-scope">
            <p className="mv-muted mv-alert-summary" aria-live="polite">
              <ClockIcon size={14} style={{ marginRight: '0.375rem', verticalAlign: -2 }} />
              Last alert: <strong>{summary.lastAlertAt ? formatDetected(summary.lastAlertAt) : 'none yet'}</strong>. Ignored this month: <strong>{summary.ignoredThisMonth}</strong>. Threshold adjustments: <strong>{summary.adjustmentsThisMonth}</strong>. Detection runs <strong>{repo.detectionSchedule()}</strong>.
            </p>
            <div className="mv-actions-wrap mv-alert-actions">
              <button type="button" className="mv-secondary-button" onClick={markAll}><CheckIcon size={14} style={{ marginRight: '0.375rem' }} />Mark All Read</button>
              <button type="button" className="mv-secondary-button" onClick={refresh}><RefreshIcon size={14} style={{ marginRight: '0.375rem' }} />Refresh</button>
            </div>
          </div>

          <div className="mv-kpi-row-4" style={{ marginBottom: '1.25rem' }}>
            <article className="mv-kpi"><span className="mv-kpi-label">Total Active</span><strong className="mv-kpi-value">{counts.totalActive}</strong></article>
            <article className="mv-kpi"><span className="mv-kpi-label">Unread</span><strong className="mv-kpi-value">{counts.unread}</strong></article>
            <article className="mv-kpi"><span className="mv-kpi-label">Critical</span><strong className="mv-kpi-value" style={counts.critical > 0 ? { color: 'var(--mv-danger)' } : undefined}>{counts.critical}</strong></article>
            <article className="mv-kpi"><span className="mv-kpi-label">New Resources</span><strong className="mv-kpi-value">{counts.newResources}</strong></article>
          </div>

          <section className="mv-panel" aria-label="Alerts list">
            <div className="mv-cost-alert-filters" role="search" aria-label="Filter alerts">
              <div className="mv-cost-alert-filter">
                <span className="mv-cost-alert-filter-label">Status</span>
                <SegmentedToggle<AlertView> label="Alert status" value={view} onChange={setView} options={ALERT_VIEWS} />
              </div>
              <div className="mv-cost-alert-filter">
                <span className="mv-cost-alert-filter-label">Type</span>
                <SegmentedToggle<TypeFilter> label="Alert type" value={type} onChange={setType} options={TYPE_FILTERS} />
              </div>
              <div className="mv-cost-alert-filter">
                <span className="mv-cost-alert-filter-label">Provider</span>
                <Select label="Provider" hideLabel value={provider} onChange={setProvider} options={PROVIDER_OPTIONS} />
              </div>
              {filtersActive && <button type="button" className="mv-quiet-button" onClick={clearFilters}>Clear filters</button>}
            </div>

            {filtered.length === 0 ? (
              <div className="mv-empty-inline">
                <p><strong>{emptyTitle}</strong></p>
                {filtersActive && <button type="button" className="mv-quiet-button" onClick={clearFilters}>Show active alerts</button>}
              </div>
            ) : (
              <>
                <div className="mv-table-wrap">
                  <table className="mv-table mv-table--stack mv-cost-alert-table">
                    <caption className="mv-sr-only">Cost alerts and anomalies</caption>
                    <thead><tr><th>Type</th><th>Severity</th><th>Provider</th><th>Message</th><th>Detected</th><th>Status</th><th><span className="mv-sr-only">Actions</span></th></tr></thead>
                    <tbody>
                      {paging.pageItems.map((alert) => {
                        const status = statusOf(alert);
                        const name = `${TYPE_LABELS[alert.alert_type]} alert on ${alert.account_id}`;
                        const providerName = providerLabel(alert.provider);
                        return (
                          <tr key={alert.id}>
                            <td data-label="Type" className="mv-stack-title">
                              <button type="button" className={`mv-link-button${alert.status === 'unread' && !alert.ignored ? ' is-unread' : ''}`} aria-label={`View details: ${name}`} onClick={() => open(alert)}>{TYPE_LABELS[alert.alert_type]}</button>
                            </td>
                            <td data-label="Severity"><StatusTag tone={SEVERITY_TONE[alert.severity]}>{SEVERITY_LABELS[alert.severity]}</StatusTag></td>
                            <td data-label="Provider">{providerName ? <StatusTag tone="neutral">{providerName}</StatusTag> : <span className="mv-muted">All</span>}</td>
                            <td data-label="Message" className="mv-alert-message">{alert.message}</td>
                            <td data-label="Detected" className="mv-muted mv-nowrap">{formatDetected(alert.detected_at)}</td>
                            <td data-label="Status"><StatusTag tone={status.tone}>{status.label}</StatusTag></td>
                            <td className="mv-stack-actions"><div className="mv-row-actions">{rowActions(alert, name)}</div></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <Pagination page={paging.page} pageSize={paging.pageSize} total={paging.total} onPageChange={paging.onPageChange} onPageSizeChange={paging.onPageSizeChange} noun="alerts" />
              </>
            )}
          </section>
        </div>
      )}

      {tab === 'recipients' && <div {...tabPanelProps('smart-alerts', 'recipients')}><RecipientsPanel /></div>}

      {tab === 'settings' && (
        <div {...tabPanelProps('smart-alerts', 'settings')}>
          <DetectionSettingsPanel form={settingsForm} accountFeedback={feedback} schedule={repo.detectionSchedule()} />
        </div>
      )}

      {selected && tab === 'alerts' && (
        <DetailDrawer
          title={TYPE_LABELS[selected.alert_type]}
          subtitle={<>Alert {selected.id} · {statusOf(selected).label}</>}
          onClose={() => setSelectedId(null)}
          footer={
            selected.ignored || selected.status === 'resolved' ? (
              <button type="button" className="mv-secondary-button" onClick={() => act(() => repo.reopen(selected.id), 'Alert reopened.')}>Reopen</button>
            ) : (
              <>
                <button type="button" className="mv-secondary-button" onClick={() => { act(() => repo.ignore(selected.id), 'Alert ignored. The threshold for its account is now wider.'); setSelectedId(null); }}>Ignore</button>
                <button type="button" className="mv-primary-button" onClick={() => { act(() => repo.resolve(selected.id), 'Alert resolved. It no longer counts as active.'); setSelectedId(null); }}>Resolve</button>
              </>
            )
          }
        >
          <div className="mv-actions-wrap" style={{ marginBottom: '0.75rem' }}>
            <StatusTag tone={SEVERITY_TONE[selected.severity]}>{SEVERITY_LABELS[selected.severity]}</StatusTag>
            {providerLabel(selected.provider) && <StatusTag tone="neutral">{providerLabel(selected.provider)}</StatusTag>}
          </div>
          <p>{selected.message}</p>
          <DetailList
            items={[
              { label: 'Account', value: selected.account_id },
              { label: 'Detected at', value: new Date(selected.detected_at).toLocaleString() },
              { label: 'Detection method', value: selected.detection_method },
              { label: 'Expected cost', value: formatMoney(selected.expected_cost) },
              { label: 'Actual cost', value: formatMoney(selected.actual_cost) },
              {
                label: 'Delta',
                value: selected.delta !== undefined ? `${formatMoney(selected.delta)} (${(selected.delta_percent ?? 0) > 0 ? '+' : ''}${selected.delta_percent?.toFixed(1)}%)` : null,
              },
              { label: 'Projected end-of-month', value: formatMoney(selected.projected_eom) },
              { label: 'Service', value: selected.root_cause?.service },
              { label: 'Z-score', value: selected.root_cause?.zScore?.toFixed(2) },
            ].filter((item) => item.value)}
          />
        </DetailDrawer>
      )}
    </div>
  );
}
