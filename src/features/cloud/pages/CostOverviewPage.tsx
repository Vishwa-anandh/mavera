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
  invoiceSummaryOf,
  monthlyByProviderOf,
  DEFAULT_SPEND_PERIOD,
  SPEND_PERIOD_OPTIONS,
  periodTrendOf,
  mspProviderRowsOf,
  mspSavingsTotalOf,
  providerMoversOf,
  providerTotalsOf,
  recommendationCountOf,
  spendChangePctOf,
  totalAccountsOf,
  totalBudgetOf,
  totalSpendOf,
  useDashboardData,
  type ProviderKey,
  type SmartAlertItem,
  type SpendPeriod,
} from '../../dashboard';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { BarSeriesChart } from '../../../shared/ui/BarSeriesChart';
import { DonutChart } from '../../../shared/ui/DonutChart';
import { InsightList, type InsightItem } from '../../../shared/ui/InsightList';
import { SegmentedToggle } from '../../../shared/ui/SegmentedToggle';
import { SpendTrendChart } from '../../../shared/ui/SpendTrendChart';
import { ConnectCloudAccountWizard } from '../components/ConnectCloudAccountWizard';
import { InvoicesSummaryView } from '../components/InvoicesSummaryView';
import {
  AlertTriangleIcon,
  BellIcon,
  CloudIcon,
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
import { PageHeader } from '../../../shared/ui/PageHeader';

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

type StatTone = 'info' | 'violet' | 'success' | 'warning' | 'danger';

function KpiShell({ loading, error, icon, tone = 'info', children }: { loading: boolean; error?: string | null; icon?: React.ReactNode; tone?: StatTone; children: React.ReactNode }) {
  return (
    <article className={`mv-kpi${icon ? ' mv-kpi--stat' : ''}`}>
      {icon && <span className={`mv-stat-icon mv-stat-icon--${tone}`} aria-hidden>{icon}</span>}
      {loading ? <div className="mv-loading" style={{ marginTop: '1.125rem' }} /> : error ? <div className="mv-inline-error" role="alert">{error}</div> : children}
    </article>
  );
}

/** CLOUD-01 — Cost Overview (MAVERA_DESIGN_SYSTEM.md §13). */
export function CostOverviewPage() {
  const { user, cloudAccess, invoiceOnly } = useAuth();
  const permissions = derivePermissions(user, cloudAccess, invoiceOnly);
  const { summary, recommendations, smartAlerts, budgets, mspSavings, invoices, refetch } = useDashboardData();
  const [wizardProvider, setWizardProvider] = useState<'azure' | 'aws' | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [view, setView] = useState<'cloud' | 'invoices'>('cloud');
  const [period, setPeriod] = useState<SpendPeriod>(DEFAULT_SPEND_PERIOD);

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
  const providerMonths = monthlyByProviderOf(summary.data);
  const providerSeries = (['azure', 'aws', 'btp', 'gcp'] as ProviderKey[])
    .filter((p) => providerMonths.some((m) => m[p] > 0))
    .map((p) => ({ key: p, label: PROVIDER_META[p].label, color: PROVIDER_META[p].dot }));
  const movers = providerMoversOf(summary.data);
  const shareData = (Object.keys(providerTotals) as ProviderKey[])
    .filter((p) => providerTotals[p] > 0)
    .map((p) => ({ label: PROVIDER_META[p].label, value: providerTotals[p], color: PROVIDER_META[p].dot }));
  const activeAlerts = activeAlertsOf(smartAlerts.data);
  const { critical: criticalCount, warning: warningCount } = alertSeverityCountsOf(activeAlerts);
  const totalAccounts = totalAccountsOf(summary.data);
  const connectedProviders = connectedProvidersOf(summary.data);
  const invoiceStats = invoiceStatsOf(invoices.data);
  const invoiceSummary = invoiceSummaryOf(invoices.data);
  const trend = periodTrendOf(summary.data, period);
  const mspRows = mspProviderRowsOf(mspSavings.data);
  const recsCount = recommendations.data ? recommendationCountOf(recommendations.data) : 0;
  const insights = buildOverviewInsights({ totalSpend, spendChangePct, budgetUtilPct, totalBudget, forecastEom, criticalCount, totalSavings, recsCount });

  const handleRefresh = () => {
    setRefreshing(true);
    refetch();
    window.setTimeout(() => setRefreshing(false), 500);
  };

  return <div>
    <PageHeader title="Cost Overview" subtitle="Track, analyze and optimize your cloud spend in real time.">
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <SegmentedToggle
          label="Cost Overview view"
          value={view}
          onChange={setView}
          options={[{ value: 'cloud', label: 'Cloud', ariaLabel: 'Cloud costs' }, { value: 'invoices', label: 'Invoices', ariaLabel: 'Invoices summary' }]}
        />
        <button className="mv-secondary-button" disabled={refreshing} onClick={handleRefresh}><RefreshIcon size={16} style={{ marginRight: '0.375rem' }} />{refreshing ? 'Refreshing…' : 'Refresh'}</button>
        {connectableProvider && <button className="mv-primary-button" onClick={() => setWizardProvider(connectableProvider)}>Connect cloud account</button>}
      </div>
    </PageHeader>

    {!loading && totalAccounts > 0 && (
      <p className="mv-muted" style={{ marginBottom: '1rem' }}>
        Showing <strong style={{ color: 'var(--mv-text)' }}>{totalAccounts} account{totalAccounts !== 1 ? 's' : ''}</strong> · <strong style={{ color: 'var(--mv-text)' }}>{connectedProviders.length} provider{connectedProviders.length !== 1 ? 's' : ''}</strong>
        {connectedProviders.length > 0 && <> ({connectedProviders.map((p) => PROVIDER_META[p].label).join(', ')})</>}
      </p>
    )}

    {view === 'invoices' ? (
      <InvoicesSummaryView summary={invoiceSummary} loading={invoices.loading} error={invoices.error} />
    ) : <>
    <div className="mv-kpi-row-4">
      <KpiShell loading={summary.loading} error={summary.error} icon={<CloudIcon size={22} />} tone="info">
        <div className="mv-kpi-label" style={{ display: 'flex', justifyContent: 'space-between' }}>Total Spend (Month-to-Date)</div>
        <strong className="mv-kpi-value">{formatCurrency(animatedSpend)}</strong>
        {(providerTotals.azure > 0 || providerTotals.aws > 0 || providerTotals.btp > 0 || providerTotals.gcp > 0) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem', marginTop: '0.5rem' }}>
            {(Object.keys(providerTotals) as ProviderKey[]).filter((p) => providerTotals[p] > 0).map((p) => (
              <span key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3125rem', fontSize: '0.6875rem' }}>
                <span aria-hidden style={{ width: '0.375rem', height: '0.375rem', borderRadius: '50%', background: PROVIDER_META[p].dot, display: 'inline-block' }} />
                <span className="mv-muted">{PROVIDER_META[p].label} <strong style={{ color: 'var(--mv-text)' }}>{formatCurrency(providerTotals[p])}</strong></span>
              </span>
            ))}
          </div>
        )}
        {spendChangePct !== null ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem', fontSize: '0.75rem', fontWeight: 500, color: spendChangePct > 0 ? 'var(--mv-danger)' : 'var(--mv-success)' }}>
            {spendChangePct > 0 ? <TrendUpIcon size={13} /> : <TrendDownIcon size={13} />}
            {Math.abs(spendChangePct)}% <span className="mv-muted" style={{ fontWeight: 400 }}>vs prev month</span>
          </div>
        ) : <div className="mv-muted" style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>Month-to-date spend</div>}
      </KpiShell>

      <KpiShell loading={budgets.loading} error={budgets.error} icon={<TargetIcon size={22} />} tone="violet">
        <div className="mv-kpi-label">Budget Utilization</div>
        <strong className="mv-kpi-value">{budgetUtilPct !== null ? `${budgetUtilPct}%` : '—'}</strong>
        {budgetUtilPct !== null ? (
          <>
            <div style={{ marginTop: '0.625rem', height: '0.5rem', borderRadius: '62.4375rem', background: 'var(--mv-surface-subtle)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, budgetUtilPct)}%`, borderRadius: '62.4375rem', background: budgetUtilPct > 90 ? 'var(--mv-danger)' : budgetUtilPct > 75 ? 'var(--mv-warning)' : 'var(--mv-success)' }} />
            </div>
            <p className="mv-muted" style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>{formatCurrency(totalSpend)} of {formatCurrency(totalBudget)} used</p>
          </>
        ) : <p className="mv-muted" style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>No budgets configured — <a href="/budgets" style={{ color: 'var(--mv-primary)' }}>create one</a></p>}
      </KpiShell>

      <KpiShell loading={mspSavings.loading} error={mspSavings.error} icon={<PiggyBankIcon size={22} />} tone="success">
        <div className="mv-kpi-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>MSP Savings</span>
          <span className="mv-status mv-status--success" style={{ fontSize: '0.625rem', minHeight: '1.125rem' }}>Maitsys CSP</span>
        </div>
        <strong className="mv-kpi-value">{formatCurrency(animatedSavings)}</strong>
        {mspRows.length > 0 ? (
          <p className="mv-muted" style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>{mspRows.map((r) => `${r.label} ${(r.rate * 100).toFixed(1)}%`).join(' · ')}</p>
        ) : <p className="mv-muted" style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>No cloud spend data yet</p>}
        {recsCount > 0 && <a href="/cloud/optimization" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.375rem', fontSize: '0.75rem', fontWeight: 500, color: 'var(--mv-primary)' }}>{recsCount} recommendations <ChevronRightIcon size={12} /></a>}
      </KpiShell>

      <KpiShell loading={smartAlerts.loading} error={smartAlerts.error} icon={<BellIcon size={22} />} tone={criticalCount > 0 ? 'danger' : warningCount > 0 ? 'warning' : 'success'}>
        <div className="mv-kpi-label">Active Alerts</div>
        <strong className="mv-kpi-value">{activeAlerts.length}</strong>
        <div style={{ display: 'flex', gap: '0.625rem', marginTop: '0.5rem', fontSize: '0.75rem', fontWeight: 500 }}>
          {criticalCount > 0 && <span style={{ color: 'var(--mv-danger)' }}>{criticalCount} critical</span>}
          {warningCount > 0 && <span style={{ color: 'var(--mv-warning)' }}>{warningCount} warning</span>}
          {activeAlerts.length === 0 && <span style={{ color: 'var(--mv-success)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><CheckIcon size={13} />All clear</span>}
        </div>
        {activeAlerts.length > 0 && <a href="/smart-alerts" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.375rem', fontSize: '0.75rem', fontWeight: 500, color: 'var(--mv-primary)' }}>View alerts <ChevronRightIcon size={12} /></a>}
      </KpiShell>
    </div>

    <section className="mv-panel mv-glance" aria-labelledby="glance-title">
      <div className="mv-glance-head">
        <div>
          <p className="mv-eyebrow-accent">This billing period</p>
          <h2 id="glance-title" className="mv-glance-title">Cost at a glance</h2>
        </div>
        <span className="mv-muted">Spend trend, insights and savings</span>
      </div>
      <div className="mv-glance-grid">
    <section className="mv-glance-col" aria-labelledby="monthly-spend-title">
      <p className="mv-eyebrow-accent">Trend</p>
      <div className="mv-panel-header mv-trend-head">
        <h2 id="monthly-spend-title" className="mv-panel-title">Spend trend</h2>
        <SegmentedToggle label="Spend trend period" value={period} onChange={setPeriod} options={SPEND_PERIOD_OPTIONS} />
      </div>
      {!summary.loading && !summary.error && trend.available && (
        <div className="mv-trend-summary" aria-live="polite" data-testid="trend-summary">
          <div className="mv-trend-figure">
            <span className="mv-muted">Last {trend.periodWords}</span>
            <strong>{formatCurrency(trend.total)}</strong>
            {trend.changePct !== null ? (
              <span className={`mv-trend-delta ${trend.changePct > 0 ? 'is-up' : 'is-down'}`}>
                {trend.changePct > 0 ? <TrendUpIcon size={13} /> : <TrendDownIcon size={13} />}
                <span className="mv-sr-only">{trend.changePct > 0 ? 'Up ' : 'Down '}</span>
                {Math.abs(trend.changePct)}% <span className="mv-muted">vs previous {trend.periodWords}</span>
              </span>
            ) : <span className="mv-muted">No earlier {trend.periodWords} to compare with</span>}
          </div>
          <div className="mv-trend-figure">
            <span className="mv-muted">Forecast, next {trend.periodWords}</span>
            {trend.forecast !== null ? <strong>{formatCurrency(trend.forecast)}</strong> : <span className="mv-muted">Not enough data</span>}
          </div>
        </div>
      )}
      <div>
        {summary.loading ? <div className="mv-loading" aria-label="Loading spend trend" /> : summary.error ? <div className="mv-inline-error" role="alert">{summary.error}</div> : trend.available ? (
          <SpendTrendChart height={190} title={`Spend trend, last ${trend.periodWords}`} data={trend.points} />
        ) : (
          <p className="mv-muted">{trend.unit === 'day' ? 'Daily spend is not available for this account yet. Choose 3M or longer.' : 'No monthly spend history is available yet.'}</p>
        )}
      </div>
      {!summary.loading && !summary.error && (
        <div className="mv-trend-eom">
          {forecastEom !== null ? (
            <>
              <p style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '2px 0.5rem', margin: 0 }}>
                <span className="mv-muted" style={{ fontSize: '0.75rem', fontWeight: 500 }}>End-of-month forecast</span>
                <strong style={{ fontSize: '1.125rem' }}>{formatCurrency(forecastEom)}</strong>
                {totalBudget > 0 && <span style={{ fontSize: '0.75rem', fontWeight: 500, color: forecastEom > totalBudget ? 'var(--mv-danger)' : 'var(--mv-success)' }}>{((forecastEom / totalBudget) * 100).toFixed(1)}% vs budget{forecastEom > totalBudget ? ' — over budget' : ''}</span>}
              </p>
              {(Object.keys(forecastByProvider) as ProviderKey[]).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                  {(Object.keys(forecastByProvider) as ProviderKey[]).map((p) => (
                    <span key={p} style={{ display: 'inline-flex', gap: '0.375rem', padding: '0.25rem 0.5rem', borderRadius: '0.5rem', background: 'var(--mv-surface-subtle)', fontSize: '0.6875rem' }}>
                      <span style={{ fontWeight: 500 }}>{PROVIDER_META[p].label}</span>
                      <span style={{ fontWeight: 500 }}>{formatCurrency(forecastByProvider[p] ?? 0)}</span>
                    </span>
                  ))}
                </div>
              )}
            </>
          ) : <p className="mv-muted" style={{ fontSize: '0.8125rem', margin: 0 }}>Not enough data for an end-of-month forecast.</p>}
        </div>
      )}
    </section>

      <section className="mv-glance-col">
        <p className="mv-eyebrow-accent">Insights</p>
        <div className="mv-panel-header"><h2 className="mv-panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><SparkleIcon size={16} />AI Insights</h2></div>
        {loading ? <div className="mv-loading" /> : (
          <InsightList
            label="Cost insights"
            empty="Connect cloud accounts to generate AI-powered cost insights."
            items={insights.map((insight, i): InsightItem => ({
              id: String(i),
              tone: insight.type === 'warning' ? 'warning' : insight.type === 'success' ? 'success' : 'info',
              title: insight.title,
              detail: insight.detail,
            }))}
          />
        )}
        {!loading && insights.length > 0 && <a href="/cloud/optimization" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.625rem', fontSize: '0.75rem', fontWeight: 500, color: 'var(--mv-primary)' }}>View all insights <ChevronRightIcon size={12} /></a>}
      </section>

      <section className="mv-glance-col">
        <p className="mv-eyebrow-accent">Savings</p>
        <div className="mv-panel-header"><h2 className="mv-panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><PiggyBankIcon size={18} style={{ color: 'var(--mv-success)' }} />MSP Savings</h2><span className="mv-status mv-status--success" style={{ fontSize: '0.625rem' }}>Maitsys CSP</span></div>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {loading ? <div className="mv-loading" /> : mspRows.length === 0 ? (
            <p className="mv-muted">Connect cloud accounts to calculate your Maitsys CSP savings.</p>
          ) : (
            <>
              {mspRows.map((row) => (
                <div key={row.provider} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.25rem', borderBottom: '1px solid var(--mv-divider)' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 500, fontSize: '0.8125rem' }}>{row.label}</p>
                    <p className="mv-muted" style={{ margin: '2px 0 0', fontSize: '0.6875rem' }}>{(row.rate * 100).toFixed(1)}% discount · {formatCurrency(row.spend)} spend</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p className="mv-muted" style={{ margin: 0, fontSize: '0.6875rem' }}>Monthly Savings</p>
                    <strong style={{ fontSize: '0.8125rem', color: 'var(--mv-success)' }}>{formatCurrency(row.savings)}</strong>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem' }}>
                <strong style={{ fontSize: '0.8125rem' }}>Total CSP Savings</strong>
                <strong style={{ fontSize: '0.875rem', color: 'var(--mv-success)' }}>{formatCurrency(mspRows.reduce((s, r) => s + r.savings, 0))}</strong>
              </div>
            </>
          )}
        </div>
      </section>
      </div>
    </section>

    {!loading && providerSeries.length > 0 && (
      <div className="mv-columns-16-8" style={{ '--mv-cols': '3fr 2fr', marginBottom: '1rem' } as React.CSSProperties}>
        <section className="mv-panel" aria-labelledby="provider-months-title">
          <div className="mv-panel-header">
            <div>
              <h2 id="provider-months-title" className="mv-panel-title">Spend by provider</h2>
              <p className="mv-muted">Last {providerMonths.length} months, stacked, so you can see which provider moves the total.</p>
            </div>
          </div>
          <BarSeriesChart
            title="Monthly spend by provider"
            data={providerMonths.map((m) => ({ name: m.name, azure: m.azure, aws: m.aws, btp: m.btp, gcp: m.gcp }))}
            series={providerSeries}
            stacked
            format={(v) => formatCurrency(v)}
            axisFormat={(v) => (v >= 1000 ? `$${Math.round(v / 1000)}K` : `$${v}`)}
          />
        </section>

        <section className="mv-panel" aria-labelledby="provider-share-title">
          <div className="mv-panel-header"><h2 id="provider-share-title" className="mv-panel-title">Share this month</h2></div>
          <DonutChart title="Spend share by provider" totalLabel="Month to date" data={shareData} />
        </section>
      </div>
    )}

    {!loading && movers.length > 0 && (
      <section className="mv-panel" aria-labelledby="movers-title" style={{ marginBottom: '1rem' }}>
        <div className="mv-panel-header">
          <div>
            <h2 id="movers-title" className="mv-panel-title">Biggest movers</h2>
            <p className="mv-muted">Change in monthly spend per provider against the previous month, largest first.</p>
          </div>
        </div>
        <ul className="mv-mover-list" aria-label="Month-over-month change by provider">
          {movers.map((m) => {
            const up = m.delta > 0;
            return (
              <li key={m.provider} className="mv-mover-row">
                <span className="mv-mover-name"><span aria-hidden className="mv-mover-dot" style={{ background: PROVIDER_META[m.provider].dot }} />{PROVIDER_META[m.provider].label}</span>
                <span className="mv-muted">{formatCurrency(m.previous)} → {formatCurrency(m.current)}</span>
                <strong className={`mv-mover-delta ${m.delta === 0 ? '' : up ? 'is-up' : 'is-down'}`}>
                  {m.delta === 0 ? 'No change' : (
                    <>
                      {up ? <TrendUpIcon size={13} /> : <TrendDownIcon size={13} />}
                      <span className="mv-sr-only">{up ? 'Up ' : 'Down '}</span>
                      {up ? '+' : '−'}{formatCurrency(Math.abs(m.delta))}{m.changePct !== null ? ` (${Math.abs(m.changePct)}%)` : ' (new)'}
                    </>
                  )}
                </strong>
              </li>
            );
          })}
        </ul>
      </section>
    )}

    {!loading && invoiceStats.count > 0 && (
      <section className="mv-panel" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <FileTextIcon size={20} />
          <div>
            <p className="mv-eyebrow" style={{ marginBottom: 2 }}>Invoice Summary</p>
            <p style={{ margin: 0, fontWeight: 500 }}>{invoiceStats.count} invoice{invoiceStats.count !== 1 ? 's' : ''} · <span style={{ color: 'var(--mv-primary)' }}>{formatCurrency(invoiceStats.total)}</span> total</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {(Object.keys(invoiceStats.byProvider) as ProviderKey[]).map((p) => (
            <span key={p} className="mv-status mv-status--neutral">{PROVIDER_META[p]?.label ?? p}: {invoiceStats.byProvider[p]}</span>
          ))}
          <a href="/invoices" className="mv-secondary-button" style={{ textDecoration: 'none' }}>View Invoices</a>
        </div>
      </section>
    )}

    <section className="mv-panel" style={{ marginBottom: '1rem' }}>
      <div className="mv-panel-header">
        <h2 className="mv-panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangleIcon size={16} style={{ color: criticalCount > 0 ? 'var(--mv-danger)' : 'var(--mv-text-muted)' }} />
          Recent Alerts
          {activeAlerts.length > 0 && <span className="mv-status mv-status--danger" style={{ fontSize: '0.625rem' }}>{activeAlerts.length}</span>}
        </h2>
        <a href="/smart-alerts" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 500, color: 'var(--mv-primary)' }}>View all <ChevronRightIcon size={12} /></a>
      </div>
      {loading ? <div className="mv-loading" /> : activeAlerts.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(16.25rem, 1fr))', gap: '0.75rem' }}>
          {activeAlerts.slice(0, 6).map((alert: SmartAlertItem, i) => (
            <div key={alert.id ?? i} style={{ display: 'flex', gap: '0.625rem', padding: '0.875rem', border: '1px solid var(--mv-divider)', borderRadius: '0.625rem' }}>
              <BellIcon size={14} style={{ flex: 'none', marginTop: 2, color: alert.severity === 'critical' ? 'var(--mv-danger)' : alert.severity === 'high' ? 'var(--mv-warning)' : 'var(--mv-text-muted)' }} />
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 500, fontSize: '0.8125rem' }}>{alert.title ?? alert.message ?? alert.alert_type}</p>
                <p className="mv-muted" style={{ margin: '0.25rem 0 0', fontSize: '0.6875rem' }}>{alert.detected_at ? new Date(alert.detected_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mv-notice" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <CheckIcon size={18} style={{ color: 'var(--mv-success)' }} />
          <div><strong>All clear — no active alerts</strong><p style={{ margin: '2px 0 0' }}>Your cloud infrastructure is running within normal parameters.</p></div>
        </div>
      )}
    </section>

    <div className="mv-muted" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.75rem' }}>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <span>{connectedProviders.length} Provider{connectedProviders.length !== 1 ? 's' : ''}</span>
        <span>{totalAccounts} Account{totalAccounts !== 1 ? 's' : ''}</span>
        {Array.isArray(budgets.data) && budgets.data.length > 0 && <span>{budgets.data.length} Budget{budgets.data.length !== 1 ? 's' : ''}</span>}
      </div>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3125rem' }}><ClockIcon size={13} />{lastSynced ? `Last synced ${lastSynced.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` : 'Not synced yet'}</span>
    </div>

    </>}

    {wizardProvider && <ConnectCloudAccountWizard provider={wizardProvider} open onClose={() => setWizardProvider(null)} />}
  </div>;
}
