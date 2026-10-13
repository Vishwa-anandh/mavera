import { Link } from 'react-router-dom';
import { useAuth } from '../../auth';
import { derivePermissions } from '../../../shared/lib/permissions';
import { activeAlertCountOf, recommendationCountOf, totalSpendOf, useDashboardData } from '../model/useDashboardData';
import { DashboardToolbar } from '../components/DashboardToolbar';
import { DashboardSidebar } from '../components/DashboardSidebar';
import { ModuleCard, type MeterSegment } from '../../../shared/ui/ModuleCard';
import { SapSystemsPanel } from '../../sap';
import { sapConditionCounts, MOCK_SAP_SYSTEMS } from '../../../demo/sap/mockSapData';
import { IdocStatusPanel } from '../../idoc';
import { MOCK_IDOC_STATUS, idocSuccessRate } from '../../../demo/idoc/mockIdocData';
import { AlertsPanel } from '../../alerts';
import { DonutChart } from '../../../shared/ui/DonutChart';
import { useMaveraTheme } from '../../../shared/theme/ThemeProvider';
import { chartColors } from '../../../shared/theme/tokens';
import { ServerIcon, CloudIcon, SwapIcon } from '../../../shared/ui/icons';

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
  const { summary, recommendations, smartAlerts, refetch } = useDashboardData();

  const sapCounts = sapConditionCounts(MOCK_SAP_SYSTEMS);
  const idocTotal = MOCK_IDOC_STATUS.successful + MOCK_IDOC_STATUS.failed + MOCK_IDOC_STATUS.inProcess + MOCK_IDOC_STATUS.waiting;
  const noCloudAccessAtAll = !permissions.azure.orgHasAccess && !permissions.aws.orgHasAccess && !permissions.btp.orgHasAccess && !permissions.gcp.orgHasAccess;
  const cloudSubscribed = !noCloudAccessAtAll || invoiceOnly;

  const sapOrder: Record<string, number> = { critical: 0, warning: 1, healthy: 2 };
  const sapMeter = {
    segments: [...MOCK_SAP_SYSTEMS]
      .sort((a, b) => (sapOrder[a.condition] ?? 3) - (sapOrder[b.condition] ?? 3))
      .map((system): MeterSegment => (system.condition === 'critical' ? 'crit' : system.condition === 'warning' ? 'warn' : system.condition === 'healthy' ? 'ok' : 'empty')),
    caption: `${sapCounts.critical} critical and ${sapCounts.warning} warning across ${MOCK_SAP_SYSTEMS.length} systems`,
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

  const idocMeter = {
    segments: proportionalSegments([
      { value: MOCK_IDOC_STATUS.successful, segment: 'ok' },
      { value: MOCK_IDOC_STATUS.inProcess + MOCK_IDOC_STATUS.waiting, segment: 'warn' },
      { value: MOCK_IDOC_STATUS.failed, segment: 'crit' },
    ]),
    caption: `${MOCK_IDOC_STATUS.failed.toLocaleString()} failed of ${idocTotal.toLocaleString()} in the last 24 hours`,
  };

  const firstName = user?.name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'there';

  // Each module the org isn't subscribed to (super admin's call, not the
  // org's) drops out of both rows below — the grid itself reflows to fill
  // the freed space rather than leaving an empty slot (see .mv-row-3col's
  // auto-fit columns), so this stays correct whether 1, 2 or all 3 modules
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
    modules.idocMonitoring && (
      <ModuleCard
        key="idoc"
        title="IDoc Monitoring"
        icon={SwapIcon}
        subscribed
        meter={idocMeter}
        metrics={[
          { label: 'Total IDocs', value: idocTotal.toLocaleString() },
          { label: 'Failed', value: MOCK_IDOC_STATUS.failed.toLocaleString() },
          { label: 'Success rate', value: `${idocSuccessRate(MOCK_IDOC_STATUS)}%` },
        ]}
        actionLabel="Open IDoc Overview"
        actionPath="/idocs/overview"
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
    modules.idocMonitoring && (
      <section key="idoc-health" className="mv-panel" aria-labelledby="idoc-status-title">
        <div className="mv-panel-header">
          <h2 id="idoc-status-title" className="mv-panel-title">IDoc Status (Last 24h)</h2>
          <Link className="mv-quiet-button" to="/idocs/overview">View all</Link>
        </div>
        <IdocStatusPanel limit={2} showCounts={false} compact />
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
          <div className="mv-row-4col">
            <section className="mv-panel" aria-labelledby="recent-alerts-title">
              <div className="mv-panel-header">
                <h2 id="recent-alerts-title" className="mv-panel-title">Recent Alerts</h2>
                <Link className="mv-quiet-button" to="/alerts">View all</Link>
              </div>
              <AlertsPanel limit={3} compact />
            </section>

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
