import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth';
import { derivePermissions } from '../../../shared/lib/permissions';
import { useAlertsVersion } from '../../../shared/lib/alertsChanged';
import { sapAdminRepository, smartAlertsRepository } from '../../../data-access';
import {
  activeAlertsOf,
  budgetUtilPctOf,
  monthlyTrendOf,
  recommendationCountOf,
  totalBudgetOf,
  totalSpendOf,
  dashboardNow,
  useDashboardData,
} from '../model/useDashboardData';
import { buildAttentionFeed } from '../model/attentionFeed';
import { ENVIRONMENT_OPTIONS, environmentMatches, filterAlertsByTime, isWithinRange, scopeModules, spendInRange, spendRangeLabel, useDashboardFilters } from '../model/dashboardFilters';
import { repositoryAlertItems } from '../model/repositoryAlerts';
import { AttentionPanel } from '../components/AttentionPanel';
import { LastViewedAccount } from '../components/LastViewedAccount';
import { DashboardToolbar } from '../components/DashboardToolbar';
import { DashboardSidebar } from '../components/DashboardSidebar';
import { ModuleCard, type MeterSegment } from '../../../shared/ui/ModuleCard';
import { SapSystemsPanel, useSapFleetSnapshot } from '../../sap';
import { useCloudAttentionSources } from '../model/cloudAttention';
import { Sparkline } from '../../../shared/ui/Sparkline';
import { DonutChart } from '../../../shared/ui/DonutChart';
import { useMaveraTheme } from '../../../shared/theme/ThemeProvider';
import { chartColors } from '../../../shared/theme/tokens';
import { ServerIcon, CloudIcon } from '../../../shared/ui/icons';
import { CONNECT_TARGETS, OnboardingCard, openConnectTarget, useConnectionStatus, useHasSampleAccounts, useOnboardingProgress } from '../../workspace';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

const METER_LENGTH = 24;

/** Splits METER_LENGTH segments between parts in proportion to their
 * values, guaranteeing at least one segment to any non-zero part so a small
 * but real failure count never rounds away to nothing. */
function proportionalSegments(parts: Array<{ value: number; segment: MeterSegment }>): MeterSegment[] {
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  if (total <= 0) return Array<MeterSegment>(METER_LENGTH).fill('empty');
  const counts = parts.map((part) => (part.value > 0 ? Math.max(1, Math.round((part.value / total) * METER_LENGTH)) : 0));
  let overflow = counts.reduce((sum, count) => sum + count, 0) - METER_LENGTH;
  while (overflow > 0) {
    const largest = counts.indexOf(Math.max(...counts));
    counts[largest] -= 1;
    overflow -= 1;
  }
  const segments = parts.flatMap((part, index) => Array<MeterSegment>(counts[index]).fill(part.segment));
  while (segments.length < METER_LENGTH) segments.push('empty');
  return segments;
}

function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Unified dashboard. The top is the operations pulse deck — a continuation
 * of the ink header band holding the greeting, search/filters and one
 * readout tile per subscribed module. Below it the light worktable is
 * ordered by urgency: recent alerts first, then per-module detail.
 */
export function HomePage() {
  const { user, cloudAccess, invoiceOnly, modules: subscribedModules } = useAuth();
  const permissions = derivePermissions(user, cloudAccess, invoiceOnly);
  const { summary, recommendations, smartAlerts, budgets, refetch } = useDashboardData();

  // Time range, environment and system filters (remembered for the session). `modules` is what is left showing once
  // the System filter has picked a half; `subscribedModules` is everything the organisation has.
  const filterState = useDashboardFilters(subscribedModules);
  const { filters } = filterState;
  const modules = scopeModules(subscribedModules, filters.system);

  // Bumps when an alert is resolved or ignored from this page (or anywhere else), so every figure below re-reads the stores.
  const alertsVersion = useAlertsVersion();
  const sap = useSapFleetSnapshot(alertsVersion, filters.environment);
  // Counted back from for the time range; moves on again after a refresh.
  const now = useMemo(() => dashboardNow(), [summary]); // eslint-disable-line react-hooks/exhaustive-deps -- a new summary means a refresh
  const cloud = useCloudAttentionSources();
  // A brand-new organisation has nothing connected: its modules show an empty state instead of sample figures.
  const { cloudEmpty, sapEmpty, nothingConnected } = useConnectionStatus();
  const checklist = useOnboardingProgress(subscribedModules);
  // While the getting-started card is up on an empty organisation, it IS the empty state: nothing below repeats it.
  const setupOnly = nothingConnected && checklist.relevant && !checklist.dismissed;
  const hasSampleAccounts = useHasSampleAccounts();
  const sapCounts = sap.counts;
  const noCloudAccessAtAll = !permissions.azure.orgHasAccess && !permissions.aws.orgHasAccess && !permissions.btp.orgHasAccess && !permissions.gcp.orgHasAccess;
  const cloudSubscribed = !noCloudAccessAtAll || invoiceOnly;

  const sapMeter = sapEmpty ? { segments: Array<MeterSegment>(METER_LENGTH).fill('empty'), caption: 'No SAP system connected yet' } : {
    // Most severe first, so problems lead the meter.
    segments: (['critical', 'warning', 'healthy'] as const)
      .flatMap((condition) => Array<MeterSegment>(sapCounts[condition]).fill(condition === 'critical' ? 'crit' : condition === 'warning' ? 'warn' : 'ok')),
    caption: `${sapCounts.critical} critical and ${sapCounts.warning} warning across ${sap.systemCount} systems`,
  };

  const spend = summary.data ? totalSpendOf(summary.data) : 0;
  // With a time range on, the spend tiles show spend over that range (from the daily series) instead of month to date.
  const rangeSpend = spendInRange(summary.data ?? null, filters.timeRange);
  const shownSpend = rangeSpend?.total ?? spend;
  const forecast = summary.data?.totals?.forecast ?? null;
  const cloudMeter = cloudEmpty ? { segments: Array<MeterSegment>(METER_LENGTH).fill('empty'), caption: 'No cloud account connected yet' } : forecast && forecast > 0 ? {
    segments: proportionalSegments([
      { value: Math.min(spend, forecast), segment: 'fill' },
      { value: Math.max(forecast - spend, 0), segment: 'empty' },
    ]),
    caption: `${Math.round((spend / forecast) * 100)}% of the ${formatCurrency(forecast)} month-end forecast${hasSampleAccounts ? ' · Sample data' : ''}`,
  } : undefined;

  // The summary now carries two years of months; the at-a-glance sparkline stays a six-month glance.
  const trend = monthlyTrendOf(summary.data ?? null).map((p) => p.amount).slice(-6);
  const totalBudget = totalBudgetOf(budgets.data ?? null);
  const budgetUtilPct = budgetUtilPctOf(spend, totalBudget);
  // Once an alert has been acted on here, the cloud alerts are re-read from the store the Smart Alerts page uses.
  const cloudAlerts = alertsVersion > 0 ? { alerts: repositoryAlertItems() } : smartAlerts.data ?? null;
  const openCloudAlerts = filterAlertsByTime(activeAlertsOf(cloudAlerts), filters.timeRange, now);
  const actionableCloudAlertIds = useMemo(() => new Set(smartAlertsRepository.list().map((a) => a.id)), [alertsVersion]); // eslint-disable-line react-hooks/exhaustive-deps -- the version only invalidates
  const sapAlerts = useMemo(() => sapAdminRepository.alerts.list().filter((a) => a.state === 'active' && isWithinRange(a.detectedAt, filters.timeRange, now)), [alertsVersion, filters.timeRange, now]); // eslint-disable-line react-hooks/exhaustive-deps -- the version only invalidates
  const savingsPotential = recommendations.data?.summary?.totalEstimatedSavings ?? null;
  const openAlertCount = (modules.cloudCost ? openCloudAlerts.length : 0) + (modules.sapMonitoring ? sapAlerts.filter((a) => !a.read).length : 0);

  const attention = buildAttentionFeed({
    modules,
    sapInsights: sap.insights,
    smartAlerts: openCloudAlerts,
    sapAlerts,
    actionableCloudAlertIds,
    budgetUtilPct,
    totalBudget,
    forecastEom: forecast,
    highImpactSavings: cloud.highImpactSavings,
    expiringReservations: cloud.expiringReservations,
  });

  const firstName = user?.name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'there';

  // Each module the org isn't subscribed to (super admin's call, not the
  // org's) drops out of both rows below — the grid itself reflows to fill
  // the freed space rather than leaving an empty slot (see .mv-row-3col's
  // auto-fit columns), so this stays correct whether 1 or both modules
  // are enabled.
  const summaryRows = [
    modules.cloudCost && (
      <ModuleCard
        key="cloud-cost"
        title="Cloud Cost Monitoring"
        icon={CloudIcon}
        subscribed={cloudSubscribed}
        meter={cloudMeter}
        metrics={[
          { label: rangeSpend ? spendRangeLabel(filters.timeRange) : 'Current spend', value: summary.data ? formatCurrency(shownSpend) : '—' },
          { label: 'Recommendations', value: recommendations.data ? String(recommendationCountOf(recommendations.data)) : '—' },
          { label: 'Active alerts', value: cloudAlerts ? String(openCloudAlerts.length) : '—' },
        ]}
        features={['Cost visibility across Azure, AWS, GCP and SAP BTP', 'Optimisation recommendations', 'Budgets and smart alerts']}
        actionLabel={cloudEmpty ? CONNECT_TARGETS.cloud.label : 'Open Cost Overview'}
        actionPath={cloudEmpty ? CONNECT_TARGETS.cloud.path : '/cloud/overview'}
        onAction={cloudEmpty ? () => openConnectTarget('cloud') : undefined}
      />
    ),
    modules.sapMonitoring && (
      <ModuleCard
        key="sap"
        title="SAP Monitoring"
        icon={ServerIcon}
        subscribed
        meter={sapMeter}
        metrics={[
          { label: 'Healthy', value: String(sapCounts.healthy) },
          { label: 'Warning', value: String(sapCounts.warning) },
          { label: 'Critical', value: String(sapCounts.critical) },
        ]}
        actionLabel={sapEmpty ? CONNECT_TARGETS.sap.label : 'Open SAP System Monitoring'}
        actionPath={sapEmpty ? CONNECT_TARGETS.sap.path : '/sap/systems'}
        onAction={sapEmpty ? () => openConnectTarget('sap') : undefined}
      />
    ),
  ].filter(Boolean);

  const healthRows = [
    modules.sapMonitoring && (
      <section key="sap-health" className="mv-panel" aria-labelledby="sap-health-title">
        <div className="mv-panel-header">
          <h2 id="sap-health-title" className="mv-panel-title">System & Service Health Overview</h2>
          <Link className="mv-quiet-button" to="/sap/systems">View all</Link>
        </div>
        {sapEmpty ? (
          <p className="mv-muted">No SAP system is connected yet. <Link to={CONNECT_TARGETS.sap.path} onClick={(event) => { event.preventDefault(); openConnectTarget('sap'); }}>{CONNECT_TARGETS.sap.label}</Link> to see its health here.</p>
        ) : sap.systemCount === 0 ? (
          <p className="mv-muted">No SAP systems in {ENVIRONMENT_OPTIONS.find((o) => o.value === filters.environment)?.label ?? 'this environment'}. <button type="button" className="mv-link-button" onClick={filterState.reset}>Reset filters</button></p>
        ) : (
          <SapSystemsPanel limit={5} showCounts={false} compact filter={(system) => environmentMatches(system.environment, filters.environment)} />
        )}
      </section>
    ),
    modules.cloudCost && (
      <section key="cloud-cost-health" className="mv-panel" aria-labelledby="cost-by-provider-title">
        <div className="mv-panel-header">
          <h2 id="cost-by-provider-title" className="mv-panel-title">Cloud Cost by Provider</h2>
          <Link className="mv-quiet-button" to="/cloud/overview">View all</Link>
        </div>
        {cloudEmpty ? (
          <p className="mv-muted">No cloud account is connected yet. <Link to={CONNECT_TARGETS.cloud.path} onClick={(event) => { event.preventDefault(); openConnectTarget('cloud'); }}>{CONNECT_TARGETS.cloud.label}</Link> to see spend by provider here.</p>
        ) : summary.data ? (
          <>
            <CostByProviderDonut totals={summary.data.totals ?? {}} />
            {filters.environment !== 'all' && <p className="mv-muted mv-filter-note">Environment: Applies to SAP systems</p>}
          </>
        ) : (
          <p className="mv-muted">{summary.loading ? 'Loading…' : 'No cost data available.'}</p>
        )}
      </section>
    ),
  ].filter(Boolean);

  return (
    <div>
      <section className="mv-pulse" aria-labelledby="pulse-title">
        <div className="mv-pulse-head">
          <div>
            <p className="mv-pulse-greeting">{greetingFor(new Date().getHours())}, {firstName}</p>
            <h1 id="pulse-title" className="mv-pulse-title">Operations pulse</h1>
          </div>
          <DashboardToolbar onRefresh={refetch} modules={subscribedModules} filters={nothingConnected ? undefined : filterState} />
        </div>
        {summaryRows.length > 0 && <div className="mv-pulse-grid">{summaryRows}</div>}
      </section>

      <OnboardingCard modules={subscribedModules} />

      <div className="mv-dashboard-layout">
        <DashboardSidebar scope={modules} />

        <div className="mv-dashboard-main">
          {modules.cloudCost && <LastViewedAccount />}
          <div className="mv-glance-strip" aria-label="At a glance">
            {modules.cloudCost && (
              <div className="mv-glance-group" role="group" aria-labelledby="glance-cloud-title">
                <h3 id="glance-cloud-title" className="mv-glance-group-title">Cloud Cost</h3>
                <div className="mv-glance-tiles">
                  <article className="mv-kpi">
                    <span className="mv-kpi-label">{rangeSpend ? spendRangeLabel(filters.timeRange) : 'Cloud spend (MTD)'}</span>
                    <strong className="mv-kpi-value">{summary.data ? formatCurrency(shownSpend) : '—'}</strong>
                    <span className="mv-kpi-spark"><Sparkline values={trend} label="Monthly cloud spend, last months" /></span>
                  </article>
                  <article className="mv-kpi">
                    <span className="mv-kpi-label">Forecast vs budget</span>
                    <strong className="mv-kpi-value">{forecast !== null ? formatCurrency(forecast) : '—'}</strong>
                    <span className="mv-muted">{totalBudget > 0 ? `${Math.round(((forecast ?? 0) / totalBudget) * 100)}% of ${formatCurrency(totalBudget)} budget` : 'No budget set'}</span>
                  </article>
                  <article className="mv-kpi">
                    <span className="mv-kpi-label">Savings potential</span>
                    <strong className="mv-kpi-value" style={{ color: 'var(--mv-success)' }}>{savingsPotential !== null ? formatCurrency(Number(savingsPotential)) : recommendations.data ? `${recommendationCountOf(recommendations.data)} ideas` : '—'}</strong>
                    <Link className="mv-quiet-button" to="/cloud/optimization">Review opportunities</Link>
                  </article>
                </div>
              </div>
            )}
            {modules.sapMonitoring && (
              <div className="mv-glance-group" role="group" aria-labelledby="glance-sap-title">
                <h3 id="glance-sap-title" className="mv-glance-group-title">SAP Monitoring</h3>
                <div className="mv-glance-tiles">
                  <article className="mv-kpi">
                    <span className="mv-kpi-label">SAP systems healthy</span>
                    <strong className="mv-kpi-value">{sapCounts.healthy}/{sap.systemCount}</strong>
                    <span className="mv-muted">{sapCounts.critical} critical · {sapCounts.warning} warning</span>
                  </article>
                  <article className="mv-kpi">
                    <span className="mv-kpi-label">HANA memory</span>
                    <strong className="mv-kpi-value">{sapEmpty ? '—' : `${sap.hanaMemoryPercent}%`}</strong>
                    <Link className="mv-quiet-button" to="/sap/databases">Open HANA</Link>
                  </article>
                </div>
              </div>
            )}
            <div className="mv-glance-group mv-glance-group--alerts" role="group" aria-labelledby="glance-alerts-title">
              <h3 id="glance-alerts-title" className="mv-glance-group-title">{modules.cloudCost && modules.sapMonitoring ? 'All modules' : modules.cloudCost ? 'Cloud Cost' : 'SAP Monitoring'}</h3>
              <div className="mv-glance-tiles">
                <article className="mv-kpi">
                  <span className="mv-kpi-label">Open alerts</span>
                  <strong className="mv-kpi-value">{openAlertCount}</strong>
                  <Link className="mv-quiet-button" to="/alerts">View all alerts</Link>
                </article>
              </div>
            </div>
          </div>

          {!setupOnly && (
            <>
          <AttentionPanel
            items={attention}
            subtitle={<>Across {[modules.sapMonitoring && 'SAP', modules.cloudCost && 'Cloud Cost'].filter(Boolean).join(' and ') || 'your modules'}, most urgent first.</>}
            empty={filterState.active ? <p className="mv-muted">Nothing matches these filters. <button type="button" className="mv-link-button" onClick={filterState.reset}>Reset filters</button></p> : undefined}
          />

          <div className="mv-row-3col">
            {healthRows}
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CostByProviderDonut({ totals }: { totals: { azure?: number; aws?: number; btp?: number; gcp?: number } }) {
  const { mode } = useMaveraTheme();
  const colors = chartColors[mode];
  return (
    <DonutChart
      title="Cloud cost by provider"
      totalLabel="Spend"
      data={[
        { label: 'Azure', value: totals.azure ?? 0, color: colors.primary },
        { label: 'AWS', value: totals.aws ?? 0, color: colors.secondary },
        { label: 'SAP BTP', value: totals.btp ?? 0, color: colors.tertiary },
        { label: 'Google Cloud', value: totals.gcp ?? 0, color: colors.axis },
      ]}
    />
  );
}
