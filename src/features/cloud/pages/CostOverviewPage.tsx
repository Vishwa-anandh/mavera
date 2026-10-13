import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../auth';
import { derivePermissions } from '../../../shared/lib/permissions';
import {
  activeAlertsOf,
  alertSeverityCountsOf,
  budgetUtilPctOf,
  buildOverviewInsights,
  connectedProvidersOf,
  forecastByProviderOf,
  forecastEomOf,
  invoiceStatsOf,
  monthlyTrendOf,
  mspProviderRowsOf,
  mspSavingsTotalOf,
  providerTotalsOf,
  recommendationCountOf,
  spendChangePctOf,
  totalAccountsOf,
  totalBudgetOf,
  totalSpendOf,
  useDashboardData,
  type ProviderKey,
  type SmartAlertItem,
} from '../../dashboard';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { SpendTrendChart } from '../../../shared/ui/SpendTrendChart';
import { ConnectCloudAccountWizard } from '../components/ConnectCloudAccountWizard';
import { AppBreadcrumb } from '../../../shared/ui/AppBreadcrumb';
import {
  AlertTriangleIcon,
  BellIcon,
  CheckIcon,
  ChevronRightIcon,
  ClockIcon,
  FileTextIcon,
  RefreshIcon,
  SparkleIcon,
  TargetIcon,
  TrendDownIcon,
  TrendUpIcon,
  PiggyBankIcon,
} from '../../../shared/ui/icons';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

const PROVIDER_META: Record<ProviderKey, { label: string; dot: string }> = {
  azure: { label: 'Azure', dot: '#0078D4' },
  aws: { label: 'AWS', dot: '#EC7211' },
  btp: { label: 'SAP BTP', dot: '#059669' },
  gcp: { label: 'GCP', dot: '#4285F4' },
};

/** Animates from 0 to `value` once, on mount/value-change — no easing library,
 * just a plain rAF loop over a fixed duration, matching the reference's
 * lightweight `useCountUp`. */
function useCountUp(value: number, durationMs = 900): number {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Show the real value immediately on first paint — only animate later
    // updates (e.g. a refresh landing new data), so tests and first-load
    // users alike never see a flash of $0.00 before the raf loop catches up.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      fromRef.current = value;
      return;
    }
    const from = fromRef.current;
    const start = performance.now();
    let frame: number;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      setDisplay(Math.round(from + (value - from) * progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);

  return display;
}

function KpiShell({ loading, error, children }: { loading: boolean; error?: string | null; children: React.ReactNode }) {
  return <article className="mv-kpi">{loading ? <div className="mv-loading" style={{ marginTop: 18 }} /> : error ? <div className="mv-inline-error" role="alert">{error}</div> : children}</article>;
}

/** CLOUD-01 — Cost Overview (MAVERA_DESIGN_SYSTEM.md §13). */
export function CostOverviewPage() {
  const { user, cloudAccess, invoiceOnly } = useAuth();
  const permissions = derivePermissions(user, cloudAccess, invoiceOnly);
  const { summary, recommendations, smartAlerts, budgets, mspSavings, invoices, refetch } = useDashboardData();
  const [wizardProvider, setWizardProvider] = useState<'azure' | 'aws' | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const loading = summary.loading || recommendations.loading || smartAlerts.loading || budgets.loading || mspSavings.loading || invoices.loading;

  useEffect(() => {
    if (!loading) setLastSynced(new Date());
  }, [loading]);

  // Called before the early return below so the hook order never depends on cloud access.
  const totalSpend = summary.data ? totalSpendOf(summary.data) : 0;
  const totalSavings = mspSavings.data ? mspSavingsTotalOf(mspSavings.data) : 0;
  const animatedSpend = useCountUp(totalSpend);
  const animatedSavings = useCountUp(totalSavings);

  const noCloudAccessAtAll = !permissions.azure.orgHasAccess && !permissions.aws.orgHasAccess && !permissions.btp.orgHasAccess && !permissions.gcp.orgHasAccess;
  if (noCloudAccessAtAll && !invoiceOnly) {
    return <EmptyState icon={<span aria-hidden>☁</span>} heading="Connect your first cloud account" explanation="Add an Azure, AWS, SAP BTP, or Google Cloud account to start monitoring costs." />;
  }

  const connectableProvider: 'azure' | 'aws' | null = permissions.azure.allowConnect ? 'azure' : permissions.aws.allowConnect ? 'aws' : null;

  const providerTotals = providerTotalsOf(summary.data);
  const spendChangePct = spendChangePctOf(summary.data);
  const totalBudget = totalBudgetOf(budgets.data);
  const budgetUtilPct = budgetUtilPctOf(totalSpend, totalBudget);
  const forecastEom = forecastEomOf(summary.data);
  const forecastByProvider = forecastByProviderOf(summary.data);
  const activeAlerts = activeAlertsOf(smartAlerts.data);
  const { critical: criticalCount, warning: warningCount } = alertSeverityCountsOf(activeAlerts);
  const totalAccounts = totalAccountsOf(summary.data);
  const connectedProviders = connectedProvidersOf(summary.data);
  const invoiceStats = invoiceStatsOf(invoices.data);
  const mspRows = mspProviderRowsOf(mspSavings.data);
  const recsCount = recommendations.data ? recommendationCountOf(recommendations.data) : 0;
  const insights = buildOverviewInsights({ totalSpend, spendChangePct, budgetUtilPct, totalBudget, forecastEom, criticalCount, totalSavings, recsCount });

  const handleRefresh = () => {
    setRefreshing(true);
    refetch();
    window.setTimeout(() => setRefreshing(false), 500);
  };

  return <div>
    <AppBreadcrumb items={[{ label: 'Cloud Cost', path: '/cloud/overview' }, { label: 'Cost Overview' }]} />
    <div className="mv-page-heading">
      <div><h1 className="mv-title">Cost Overview</h1><p className="mv-subtitle">Track, analyze and optimize your cloud spend in real time.</p></div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="mv-secondary-button" disabled={refreshing} onClick={handleRefresh}><RefreshIcon size={16} style={{ marginRight: 6 }} />{refreshing ? 'Refreshing…' : 'Refresh'}</button>
        {connectableProvider && <button className="mv-primary-button" onClick={() => setWizardProvider(connectableProvider)}>Connect cloud account</button>}
      </div>
    </div>

    {!loading && totalAccounts > 0 && (
      <p className="mv-muted" style={{ marginBottom: 16 }}>
        Showing <strong style={{ color: 'var(--mv-text)' }}>{totalAccounts} account{totalAccounts !== 1 ? 's' : ''}</strong> · <strong style={{ color: 'var(--mv-text)' }}>{connectedProviders.length} provider{connectedProviders.length !== 1 ? 's' : ''}</strong>
        {connectedProviders.length > 0 && <> ({connectedProviders.map((p) => PROVIDER_META[p].label).join(', ')})</>}
      </p>
    )}

    <div className="mv-kpi-row-4">
      <KpiShell loading={summary.loading} error={summary.error}>
        <div className="mv-kpi-label" style={{ display: 'flex', justifyContent: 'space-between' }}>Total Spend (Month-to-Date)</div>
        <strong className="mv-kpi-value">{formatCurrency(animatedSpend)}</strong>
        {(providerTotals.azure > 0 || providerTotals.aws > 0 || providerTotals.btp > 0 || providerTotals.gcp > 0) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
            {(Object.keys(providerTotals) as ProviderKey[]).filter((p) => providerTotals[p] > 0).map((p) => (
              <span key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: PROVIDER_META[p].dot, display: 'inline-block' }} />
                <span className="mv-muted">{PROVIDER_META[p].label} <strong style={{ color: 'var(--mv-text)' }}>{formatCurrency(providerTotals[p])}</strong></span>
              </span>
            ))}
          </div>
        )}
        {spendChangePct !== null ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 12, fontWeight: 600, color: spendChangePct > 0 ? 'var(--mv-danger)' : 'var(--mv-success)' }}>
            {spendChangePct > 0 ? <TrendUpIcon size={13} /> : <TrendDownIcon size={13} />}
            {Math.abs(spendChangePct)}% <span className="mv-muted" style={{ fontWeight: 400 }}>vs prev month</span>
          </div>
        ) : <div className="mv-muted" style={{ marginTop: 8, fontSize: 12 }}>Month-to-date spend</div>}
      </KpiShell>

      <KpiShell loading={budgets.loading} error={budgets.error}>
        <div className="mv-kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TargetIcon size={14} />Budget Utilization</div>
        <strong className="mv-kpi-value">{budgetUtilPct !== null ? `${budgetUtilPct}%` : '—'}</strong>
        {budgetUtilPct !== null ? (
          <>
            <div style={{ marginTop: 10, height: 8, borderRadius: 999, background: 'var(--mv-surface-subtle)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, budgetUtilPct)}%`, borderRadius: 999, background: budgetUtilPct > 90 ? 'var(--mv-danger)' : budgetUtilPct > 75 ? 'var(--mv-warning)' : 'var(--mv-success)' }} />
            </div>
            <p className="mv-muted" style={{ marginTop: 8, fontSize: 12 }}>{formatCurrency(totalSpend)} of {formatCurrency(totalBudget)} used</p>
          </>
        ) : <p className="mv-muted" style={{ marginTop: 8, fontSize: 12 }}>No budgets configured — <a href="/budgets" style={{ color: 'var(--mv-primary)' }}>create one</a></p>}
      </KpiShell>

      <KpiShell loading={mspSavings.loading} error={mspSavings.error}>
        <div className="mv-kpi-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>MSP Savings</span>
          <span className="mv-status mv-status--success" style={{ fontSize: 10, minHeight: 18 }}>Maitsys CSP</span>
        </div>
        <strong className="mv-kpi-value">{formatCurrency(animatedSavings)}</strong>
        {mspRows.length > 0 ? (
          <p className="mv-muted" style={{ marginTop: 8, fontSize: 12 }}>{mspRows.map((r) => `${r.label} ${(r.rate * 100).toFixed(1)}%`).join(' · ')}</p>
        ) : <p className="mv-muted" style={{ marginTop: 8, fontSize: 12 }}>No cloud spend data yet</p>}
        {recsCount > 0 && <a href="/recommendations" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 12, fontWeight: 600, color: 'var(--mv-primary)' }}>{recsCount} recommendations <ChevronRightIcon size={12} /></a>}
      </KpiShell>

      <KpiShell loading={smartAlerts.loading} error={smartAlerts.error}>
        <div className="mv-kpi-label">Active Alerts</div>
        <strong className="mv-kpi-value">{activeAlerts.length}</strong>
        <div style={{ display: 'flex', gap: 10, marginTop: 8, fontSize: 12, fontWeight: 600 }}>
          {criticalCount > 0 && <span style={{ color: 'var(--mv-danger)' }}>{criticalCount} critical</span>}
          {warningCount > 0 && <span style={{ color: 'var(--mv-warning)' }}>{warningCount} warning</span>}
          {activeAlerts.length === 0 && <span style={{ color: 'var(--mv-success)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><CheckIcon size={13} />All clear</span>}
        </div>
        {activeAlerts.length > 0 && <a href="/smart-alerts" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 12, fontWeight: 600, color: 'var(--mv-primary)' }}>View alerts <ChevronRightIcon size={12} /></a>}
      </KpiShell>
    </div>

    <section className="mv-panel" aria-labelledby="monthly-spend-title" style={{ marginBottom: 16 }}>
      <div className="mv-panel-header"><h2 id="monthly-spend-title" className="mv-panel-title">Monthly spend trend</h2><span className="mv-kpi-label">Current billing period</span></div>
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          {summary.loading ? <div className="mv-loading" aria-label="Loading monthly spend trend" /> : summary.error ? <div className="mv-inline-error" role="alert">{summary.error}</div> : <SpendTrendChart title="Monthly spend trend" data={monthlyTrendOf(summary.data)} />}
        </div>
        {!summary.loading && !summary.error && (
          <div style={{ width: 220, flex: 'none', display: 'grid', gap: 10 }}>
            <p className="mv-muted" style={{ fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>End-of-Month Forecast</p>
            {forecastEom !== null ? (
              <>
                <div>
                  <strong style={{ fontSize: 22 }}>{formatCurrency(forecastEom)}</strong>
                  {totalBudget > 0 && <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 600, color: forecastEom > totalBudget ? 'var(--mv-danger)' : 'var(--mv-success)' }}>{((forecastEom / totalBudget) * 100).toFixed(1)}% vs budget</p>}
                </div>
                {(Object.keys(forecastByProvider) as ProviderKey[]).length > 0 && (
                  <div style={{ display: 'grid', gap: 6 }}>
                    {(Object.keys(forecastByProvider) as ProviderKey[]).map((p) => (
                      <div key={p} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 8px', borderRadius: 8, background: 'var(--mv-surface-subtle)' }}>
                        <span style={{ fontSize: 11, fontWeight: 600 }}>{PROVIDER_META[p].label}</span>
                        <span style={{ fontSize: 11, fontWeight: 700 }}>{formatCurrency(forecastByProvider[p] ?? 0)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className={`mv-inline-error mv-ai-insight mv-ai-insight--${totalBudget > 0 && forecastEom > totalBudget ? 'warning' : 'info'}`} style={{ fontSize: 11 }}>
                  {totalBudget > 0 && forecastEom > totalBudget ? 'Forecast exceeds budget. Review spend now.' : 'On track to stay within budget.'}
                </div>
              </>
            ) : <p className="mv-muted" style={{ fontSize: 13 }}>Not enough data for a forecast.</p>}
          </div>
        )}
      </div>
    </section>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
      <section className="mv-panel" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="mv-panel-header"><h2 className="mv-panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><SparkleIcon size={16} />AI Insights</h2></div>
        <div style={{ display: 'grid', gap: 10 }}>
          {loading ? <div className="mv-loading" /> : insights.length > 0 ? insights.map((insight, i) => (
            <div key={i} className={`mv-inline-error mv-ai-insight mv-ai-insight--${insight.type}`}>
              <strong>{insight.title}</strong>
              <p style={{ margin: '2px 0 0' }}>{insight.detail}</p>
            </div>
          )) : <p className="mv-muted">Connect cloud accounts to generate AI-powered cost insights.</p>}
        </div>
        {!loading && insights.length > 0 && <a href="/recommendations" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 10, fontSize: 12, fontWeight: 600, color: 'var(--mv-primary)' }}>View all insights <ChevronRightIcon size={12} /></a>}
      </section>

      <section className="mv-panel" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="mv-panel-header"><h2 className="mv-panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><PiggyBankIcon size={18} style={{ color: 'var(--mv-success)' }} />MSP Savings</h2><span className="mv-status mv-status--success" style={{ fontSize: 10 }}>Maitsys CSP</span></div>
        <div style={{ display: 'grid', gap: 8 }}>
          {loading ? <div className="mv-loading" /> : mspRows.length === 0 ? (
            <p className="mv-muted">Connect cloud accounts to calculate your Maitsys CSP savings.</p>
          ) : (
            <>
              {mspRows.map((row) => (
                <div key={row.provider} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 4px', borderBottom: '1px solid var(--mv-divider)' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{row.label}</p>
                    <p className="mv-muted" style={{ margin: '2px 0 0', fontSize: 11 }}>{(row.rate * 100).toFixed(1)}% discount · {formatCurrency(row.spend)} spend</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p className="mv-muted" style={{ margin: 0, fontSize: 11 }}>Monthly Savings</p>
                    <strong style={{ fontSize: 13, color: 'var(--mv-success)' }}>{formatCurrency(row.savings)}</strong>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8 }}>
                <strong style={{ fontSize: 13 }}>Total CSP Savings</strong>
                <strong style={{ fontSize: 14, color: 'var(--mv-success)' }}>{formatCurrency(mspRows.reduce((s, r) => s + r.savings, 0))}</strong>
              </div>
            </>
          )}
        </div>
      </section>
    </div>

    {!loading && invoiceStats.count > 0 && (
      <section className="mv-panel" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <FileTextIcon size={20} />
          <div>
            <p className="mv-eyebrow" style={{ marginBottom: 2 }}>Invoice Summary</p>
            <p style={{ margin: 0, fontWeight: 600 }}>{invoiceStats.count} invoice{invoiceStats.count !== 1 ? 's' : ''} · <span style={{ color: 'var(--mv-primary)' }}>{formatCurrency(invoiceStats.total)}</span> total</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {(Object.keys(invoiceStats.byProvider) as ProviderKey[]).map((p) => (
            <span key={p} className="mv-status mv-status--neutral">{PROVIDER_META[p]?.label ?? p}: {invoiceStats.byProvider[p]}</span>
          ))}
          <a href="/invoices" className="mv-secondary-button" style={{ textDecoration: 'none' }}>View Invoices</a>
        </div>
      </section>
    )}

    <section className="mv-panel" style={{ marginBottom: 16 }}>
      <div className="mv-panel-header">
        <h2 className="mv-panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangleIcon size={16} style={{ color: criticalCount > 0 ? 'var(--mv-danger)' : 'var(--mv-text-muted)' }} />
          Recent Alerts
          {activeAlerts.length > 0 && <span className="mv-status mv-status--danger" style={{ fontSize: 10 }}>{activeAlerts.length}</span>}
        </h2>
        <a href="/smart-alerts" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: 'var(--mv-primary)' }}>View all <ChevronRightIcon size={12} /></a>
      </div>
      {loading ? <div className="mv-loading" /> : activeAlerts.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          {activeAlerts.slice(0, 6).map((alert: SmartAlertItem, i) => (
            <div key={alert.id ?? i} style={{ display: 'flex', gap: 10, padding: 14, border: '1px solid var(--mv-divider)', borderRadius: 10 }}>
              <BellIcon size={14} style={{ flex: 'none', marginTop: 2, color: alert.severity === 'critical' ? 'var(--mv-danger)' : alert.severity === 'high' ? 'var(--mv-warning)' : 'var(--mv-text-muted)' }} />
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{alert.title ?? alert.message ?? alert.alert_type}</p>
                <p className="mv-muted" style={{ margin: '4px 0 0', fontSize: 11 }}>{alert.detected_at ? new Date(alert.detected_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mv-notice" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckIcon size={18} style={{ color: 'var(--mv-success)' }} />
          <div><strong>All clear — no active alerts</strong><p style={{ margin: '2px 0 0' }}>Your cloud infrastructure is running within normal parameters.</p></div>
        </div>
      )}
    </section>

    <div className="mv-muted" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, fontSize: 12 }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <span>{connectedProviders.length} Provider{connectedProviders.length !== 1 ? 's' : ''}</span>
        <span>{totalAccounts} Account{totalAccounts !== 1 ? 's' : ''}</span>
        {Array.isArray(budgets.data) && budgets.data.length > 0 && <span>{budgets.data.length} Budget{budgets.data.length !== 1 ? 's' : ''}</span>}
      </div>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><ClockIcon size={13} />{lastSynced ? `Last synced ${lastSynced.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` : 'Not synced yet'}</span>
    </div>

    {wizardProvider && <ConnectCloudAccountWizard provider={wizardProvider} open onClose={() => setWizardProvider(null)} />}
  </div>;
}
