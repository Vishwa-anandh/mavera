import { Link } from 'react-router-dom';
import { useAuth } from '../../auth';
import { derivePermissions } from '../../../shared/lib/permissions';
import {
  activeAlertCountOf,
  activeAlertsOf,
  budgetUtilPctOf,
  monthlyTrendOf,
  recommendationCountOf,
  totalBudgetOf,
  totalSpendOf,
  useDashboardData,
} from '../model/useDashboardData';
import { buildAttentionFeed } from '../model/attentionFeed';
import { DashboardToolbar } from '../components/DashboardToolbar';
import { DashboardSidebar } from '../components/DashboardSidebar';
import { ModuleCard, type MeterSegment } from '../../../shared/ui/ModuleCard';
import { SapSystemsPanel, useSapFleetSnapshot } from '../../sap';
import { useCloudAttentionSources } from '../model/cloudAttention';
import { InsightList } from '../../../shared/ui/InsightList';
import { Sparkline } from '../../../shared/ui/Sparkline';
import { DonutChart } from '../../../shared/ui/DonutChart';
import { useMaveraTheme } from '../../../shared/theme/ThemeProvider';
import { chartColors } from '../../../shared/theme/tokens';
import { ServerIcon, CloudIcon } from '../../../shared/ui/icons';

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
  const { user, cloudAccess, invoiceOnly, modules } = useAuth();
  const permissions = derivePermissions(user, cloudAccess, invoiceOnly);
  const { summary, recommendations, smartAlerts, budgets, refetch } = useDashboardData();

  const sap = useSapFleetSnapshot();
  const cloud = useCloudAttentionSources();
  const sapCounts = sap.counts;
  const noCloudAccessAtAll = !permissions.azure.orgHasAccess && !permissions.aws.orgHasAccess && !permissions.btp.orgHasAccess && !permissions.gcp.orgHasAccess;
  const cloudSubscribed = !noCloudAccessAtAll || invoiceOnly;

  const sapMeter = {
    // Most severe first, so problems lead the meter.
    segments: (['critical', 'warning', 'healthy'] as const)
      .flatMap((condition) => Array<MeterSegment>(sapCounts[condition]).fill(condition === 'critical' ? 'crit' : condition === 'warning' ? 'warn' : 'ok')),
    caption: `${sapCounts.critical} critical and ${sapCounts.warning} warning across ${sap.systemCount} systems`,
  };

  const spend = summary.data ? totalSpendOf(summary.data) : 0;
  const forecast = summary.data?.totals?.forecast ?? null;
  const cloudMeter = forecast && forecast > 0 ? {
    segments: proportionalSegments([
      { value: Math.min(spend, forecast), segment: 'fill' },
      { value: Math.max(forecast - spend, 0), segment: 'empty' },
    ]),
    caption: `${Math.round((spend / forecast) * 100)}% of the ${formatCurrency(forecast)} month-end forecast`,
  } : undefined;

  const trend = monthlyTrendOf(summary.data ?? null).map((p) => p.amount);
  const totalBudget = totalBudgetOf(budgets.data ?? null);
  const budgetUtilPct = budgetUtilPctOf(spend, totalBudget);
  const openCloudAlerts = activeAlertsOf(smartAlerts.data ?? null);
  const savingsPotential = recommendations.data?.summary?.totalEstimatedSavings ?? null;
  const openAlertCount = (modules.cloudCost ? openCloudAlerts.length : 0) + (modules.sapMonitoring ? sap.unreadAlerts : 0);

  const attention = buildAttentionFeed({
    modules,
    sapInsights: sap.insights,
    smartAlerts: openCloudAlerts,
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
          { label: 'Current spend', value: summary.data ? formatCurrency(spend) : '—' },
          { label: 'Recommendations', value: recommendations.data ? String(recommendationCountOf(recommendations.data)) : '—' },
          { label: 'Active alerts', value: smartAlerts.data ? String(activeAlertCountOf(smartAlerts.data)) : '—' },
        ]}
        features={['Cost visibility across Azure, AWS, GCP and SAP BTP', 'Optimisation recommendations', 'Budgets and smart alerts']}
        actionLabel="Open Cost Overview"
        actionPath="/cloud/overview"
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
        actionLabel="Open SAP System Monitoring"
        actionPath="/sap/systems"
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
        <SapSystemsPanel limit={5} showCounts={false} compact />
      </section>
    ),
    modules.cloudCost && (
      <section key="cloud-cost-health" className="mv-panel" aria-labelledby="cost-by-provider-title">
        <div className="mv-panel-header">
          <h2 id="cost-by-provider-title" className="mv-panel-title">Cloud Cost by Provider</h2>
          <Link className="mv-quiet-button" to="/cloud/overview">View all</Link>
        </div>
        {summary.data ? (
          <CostByProviderDonut totals={summary.data.totals ?? {}} />
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
          <DashboardToolbar onRefresh={refetch} />
        </div>
        {summaryRows.length > 0 && <div className="mv-pulse-grid">{summaryRows}</div>}
      </section>

      <div className="mv-dashboard-layout">
        <DashboardSidebar />

        <div className="mv-dashboard-main">
          <div className="mv-kpi-row-5 mv-glance-strip" aria-label="At a glance">
            {modules.cloudCost && (
              <article className="mv-kpi">
                <span className="mv-kpi-label">Cloud spend (MTD)</span>
                <strong className="mv-kpi-value">{summary.data ? formatCurrency(spend) : '—'}</strong>
                <span className="mv-kpi-spark"><Sparkline values={trend} label="Monthly cloud spend, last months" /></span>
              </article>
            )}
            {modules.cloudCost && (
              <article className="mv-kpi">
                <span className="mv-kpi-label">Forecast vs budget</span>
                <strong className="mv-kpi-value">{forecast !== null ? formatCurrency(forecast) : '—'}</strong>
                <span className="mv-muted">{totalBudget > 0 ? `${Math.round(((forecast ?? 0) / totalBudget) * 100)}% of ${formatCurrency(totalBudget)} budget` : 'No budget set'}</span>
              </article>
            )}
            {modules.cloudCost && (
              <article className="mv-kpi">
                <span className="mv-kpi-label">Savings potential</span>
                <strong className="mv-kpi-value" style={{ color: 'var(--mv-success)' }}>{savingsPotential !== null ? formatCurrency(Number(savingsPotential)) : recommendations.data ? `${recommendationCountOf(recommendations.data)} ideas` : '—'}</strong>
                <Link className="mv-quiet-button" to="/cloud/optimization">Review opportunities</Link>
              </article>
            )}
            {modules.sapMonitoring && (
              <article className="mv-kpi">
                <span className="mv-kpi-label">SAP systems healthy</span>
                <strong className="mv-kpi-value">{sapCounts.healthy}/{sap.systemCount}</strong>
                <span className="mv-muted">{sapCounts.critical} critical · {sapCounts.warning} warning</span>
              </article>
            )}
            {modules.sapMonitoring && (
              <article className="mv-kpi">
                <span className="mv-kpi-label">HANA memory</span>
                <strong className="mv-kpi-value">{sap.hanaMemoryPercent}%</strong>
                <Link className="mv-quiet-button" to="/sap/databases">Open HANA</Link>
              </article>
            )}
            <article className="mv-kpi">
              <span className="mv-kpi-label">Open alerts</span>
              <strong className="mv-kpi-value">{openAlertCount}</strong>
              <Link className="mv-quiet-button" to="/alerts">View all alerts</Link>
            </article>
          </div>

          <section className="mv-panel" aria-labelledby="attention-title">
            <div className="mv-panel-header">
              <div>
                <h2 id="attention-title" className="mv-panel-title">Needs attention</h2>
                <p className="mv-muted">Across {[modules.sapMonitoring && 'SAP', modules.cloudCost && 'Cloud Cost'].filter(Boolean).join(' and ') || 'your modules'}, most urgent first.</p>
              </div>
              <Link className="mv-quiet-button" to="/alerts">All alerts</Link>
            </div>
            <InsightList items={attention.slice(0, 6)} label="Items that need attention" empty="Nothing needs attention right now." />
            {attention.length > 6 && <p className="mv-muted" style={{ margin: '0.5rem 0 0' }}>+{attention.length - 6} more on their module pages.</p>}
          </section>

          <div className="mv-row-3col">
            {healthRows}
          </div>
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
