import { ServiceBreakdownList } from '../../../../shared/ui/ServiceBreakdownList';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AwsCostTabProps } from '../../model/AwsCostTabProps';
import type { AwsInstance, AwsYearlyMonth } from '../../model/awsTypes';
import { momPct } from '../../model/awsDerivations';
import { extendDailyHistory } from '../../../../shared/lib/costAnalysis';
import { DailyCostHistory } from '../../../../shared/ui/DailyCostHistory';
import { CostByRegion } from '../../../../shared/ui/CostByRegion';
import { Tooltip as UiTooltip } from '../../../../shared/ui/Tooltip';

/**
 * Operations tab — Manager / Dept-Head audience. Ported from the reference
 * CCM app's AWS cost page `activeTab === "operations"` render block:
 * "Monthly Spend by Service" (12-month stacked-by-service chart), "Top
 * Services by Spend", "Cost by Region", the current-month-only "Service
 * Breakdown" table, "EC2 Instances", "Cost Movers" and "Budgets".
 *
 * "Daily Cost History" (the shared panel with a 7d | 14d | 30d switch and a
 * bar or area view) follows the monthly chart, as in the reference.
 *
 * Mirrors Azure's already-built `azure/tabs/OperationsTab.tsx` structurally
 * (same stacked-chart-capped-to-3-services deviation, same `NamedListCard`/
 * `buildMovers` pattern) — swapped to AWS's own fields: `data.services`
 * items are `{name, cost}` (not `value`), and there's no Alerts/Advisor
 * section here either (the reference's Operations tab doesn't have one for
 * AWS, same as it doesn't for Azure).
 */
export function OperationsTab(props: AwsCostTabProps) {
  const { data, yearlyData, budgets, instances, cspRecommendations, isCurrentMonth, mspRate, chartColors } = props;

  const { keys: stackedKeys, rows: stackedRows } = buildStackedServiceData(yearlyData);
  const stackedColors = [chartColors.primary, chartColors.secondary, chartColors.tertiary];
  const hasOther = stackedRows.some((row) => Number(row.Other) > 0);

  const sortedServices = [...data.services].sort((a, b) => b.cost - a.cost);
  const top6 = sortedServices.slice(0, 6);
  const top6Total = top6.reduce((sum, s) => sum + s.cost, 0);
  const cspSavingsTotal = data.totalCost * mspRate + cspRecommendations.reduce((sum, r) => sum + r.estimated_savings, 0);

  const currentIndex = findCurrentYearlyIndex(yearlyData, data.totalCost, isCurrentMonth);
  const prevEntry = currentIndex > 0 ? yearlyData[currentIndex - 1] : undefined;
  const movers = buildMovers(sortedServices, prevEntry?.topServices);

  const regionCosts = data.regions.map((r) => ({ name: r.region, cost: r.cost }));

  const dailyHistory = extendDailyHistory(data.dailyCosts, yearlyData);

  const runningCount = instances.filter((i) => i.State === 'running').length;
  const stoppedCount = instances.filter((i) => i.State === 'stopped').length;

  return (
    <div>
      <section className="mv-panel" id="ops-monthly-spend" style={{ marginBottom: '1rem' }}>
        <div className="mv-panel-header">
          <h2 className="mv-panel-title">Monthly Spend by Service</h2>
        </div>
        {yearlyData.length === 0 ? (
          <p className="mv-muted">No 12-month service history is stored for this account yet.</p>
        ) : stackedKeys.length === 0 ? (
          <p className="mv-muted">No service breakdown available across the stored history.</p>
        ) : (
          <>
            <div role="img" aria-label="Monthly spend by service, last 12 months" style={{ width: '100%', height: '13.75rem' }}>
              <ResponsiveContainer>
                <BarChart data={stackedRows} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={chartColors.grid} vertical={false} />
                  <XAxis dataKey="label" stroke={chartColors.axis} tick={{ fontSize: 12 }} />
                  <YAxis stroke={chartColors.axis} tick={{ fontSize: 12 }} tickFormatter={(value: number) => `$${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`} />
                  <Tooltip formatter={(value, name) => [formatCurrency(Number(value)), String(name)]} contentStyle={{ borderRadius: 8, borderColor: chartColors.grid }} />
                  {stackedKeys.map((name, i) => (
                    <Bar key={name} dataKey={name} stackId="services" fill={stackedColors[i % stackedColors.length]} radius={!hasOther && i === stackedKeys.length - 1 ? 4 : 0} />
                  ))}
                  {hasOther && <Bar dataKey="Other" stackId="services" fill={chartColors.axis} radius={4} />}
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.875rem', marginTop: '0.75rem' }}>
              {stackedKeys.map((name, i) => (
                <span key={name} className="mv-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                  <span aria-hidden style={{ width: '0.625rem', height: '0.625rem', borderRadius: 2, background: stackedColors[i % stackedColors.length], display: 'inline-block' }} />
                  {name}
                </span>
              ))}
              {hasOther && (
                <span className="mv-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                  <span aria-hidden style={{ width: '0.625rem', height: '0.625rem', borderRadius: 2, background: chartColors.axis, display: 'inline-block' }} />
                  Other
                </span>
              )}
            </div>
          </>
        )}
      </section>

      <div className="mv-detail-stack">
        <DailyCostHistory series={dailyHistory} forecastTotal={data.forecast} />
      </div>

      <section className="mv-panel" id="ops-top-services" style={{ marginBottom: '1rem' }}>
        <div className="mv-panel-header">
          <h2 className="mv-panel-title">Top Services by Spend</h2>
        </div>
        {top6.length === 0 ? (
          <p className="mv-muted">No service data available.</p>
        ) : (
          <>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {top6.map((svc) => {
                const savings = top6Total > 0 ? (svc.cost / top6Total) * cspSavingsTotal : 0;
                const max = Math.max(...top6.map((s) => s.cost), 1);
                return (
                  <div key={svc.name} style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.25rem', fontSize: '0.8125rem', minWidth: 0 }}>
                      <UiTooltip content={svc.name}><span className="mv-muted">{svc.name}</span></UiTooltip>
                      <span style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
                        <strong>{formatCurrency(svc.cost)}</strong>
                        {savings > 0 && <span style={{ color: 'var(--mv-success)', fontSize: '0.6875rem' }}>-{formatCurrency(savings)}</span>}
                      </span>
                    </div>
                    <div style={{ height: '0.375rem', borderRadius: '62.4375rem', background: 'var(--mv-divider)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: '62.4375rem', width: `${(svc.cost / max) * 100}%`, background: 'var(--mv-primary)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mv-muted" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--mv-divider)' }}>
              <span>Total</span>
              <strong style={{ color: 'var(--mv-text)' }}>{formatCurrency(top6Total)}</strong>
            </div>
          </>
        )}
      </section>

      {data.regions.length > 0 && (
        <div className="mv-detail-stack">
          <CostByRegion id="ops-region" regions={regionCosts} />
        </div>
      )}

      {isCurrentMonth && data.details.length > 0 && (
        <div id="aws-service-breakdown" style={{ marginBottom: '1rem' }}>
          <ServiceBreakdownList lines={data.details} cspRate={mspRate} format={formatCurrency} />
        </div>
      )}

      {instances.length > 0 && (
        <section className="mv-panel" style={{ marginBottom: '1rem' }}>
          <div className="mv-panel-header">
            <h2 className="mv-panel-title">EC2 Instances</h2>
          </div>
          <div className="mv-kpi-row-4" style={{ marginBottom: '1rem' }}>
            <article className="mv-kpi"><span className="mv-kpi-label">Running</span><strong className="mv-kpi-value" style={{ color: 'var(--mv-success)' }}>{runningCount}</strong></article>
            <article className="mv-kpi"><span className="mv-kpi-label">Stopped</span><strong className="mv-kpi-value">{stoppedCount}</strong></article>
            <article className="mv-kpi"><span className="mv-kpi-label">Total</span><strong className="mv-kpi-value">{instances.length}</strong></article>
          </div>
          <InstancesTable instances={instances} />
        </section>
      )}

      <section className="mv-panel" style={{ marginBottom: '1rem' }}>
        <div className="mv-panel-header">
          <h2 className="mv-panel-title">Cost Movers</h2>
        </div>
        {!prevEntry && <div className="mv-notice" style={{ marginBottom: '0.75rem' }}>Month-over-month comparisons need at least one prior month of stored history.</div>}
        {movers.length === 0 ? (
          <p className="mv-muted">No service-level cost data available.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(15rem, 1fr))', gap: '0.625rem' }}>
            {movers.map((mover) => (
              <div key={mover.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.625rem', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', background: 'var(--mv-surface-subtle)' }}>
                <div style={{ minWidth: 0 }}>
                  <UiTooltip content={mover.name}><p style={{ margin: 0, fontWeight: 500 }}>{mover.name}</p></UiTooltip>
                  <p className="mv-muted" style={{ margin: 0 }}>{formatCurrency(mover.current)}</p>
                </div>
                {mover.change !== null && (
                  <span className={`mv-status mv-status--${mover.change > 0 ? 'danger' : 'success'}`}>{mover.change > 0 ? '+' : ''}{mover.change.toFixed(1)}%</span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mv-panel">
        <div className="mv-panel-header">
          <h2 className="mv-panel-title">Budgets</h2>
        </div>
        {budgets.length === 0 ? (
          <p className="mv-muted">No active budgets found.</p>
        ) : (
          <div className="mv-row-3col">
            {budgets.map((budget) => (
              <BudgetCard key={budget.BudgetName} budget={budget} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TOP_SERVICE_KEYS = 3;

function buildStackedServiceData(yearlyData: AwsYearlyMonth[]): { keys: string[]; rows: Array<Record<string, number | string>> } {
  const totals = new Map<string, number>();
  yearlyData.forEach((month) => month.topServices.forEach((service) => totals.set(service.name, (totals.get(service.name) ?? 0) + service.cost)));
  const keys = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP_SERVICE_KEYS).map(([name]) => name);

  const rows = yearlyData.map((month) => {
    const row: Record<string, number | string> = { label: `${MONTH_SHORT[month.month - 1]} '${String(month.year).slice(2)}`, Other: 0 };
    let topSum = 0;
    keys.forEach((name) => {
      const cost = month.topServices.find((service) => service.name === name)?.cost ?? 0;
      row[name] = cost;
      topSum += cost;
    });
    row.Other = Math.max(0, month.totalCost - topSum);
    return row;
  });

  return { keys, rows };
}

function findCurrentYearlyIndex(yearlyData: AwsYearlyMonth[], totalCost: number, isCurrentMonth: boolean): number {
  if (isCurrentMonth) return yearlyData.length - 1;
  const idx = yearlyData.findIndex((month) => month.totalCost === totalCost);
  return idx >= 0 ? idx : yearlyData.length - 1;
}

interface MoverRow {
  name: string;
  current: number;
  change: number | null;
}

function buildMovers(sortedServices: Array<{ name: string; cost: number }>, prevServices: Array<{ name: string; cost: number }> | undefined): MoverRow[] {
  return sortedServices
    .slice(0, 8)
    .map((service) => {
      const prevService = prevServices?.find((s) => s.name === service.name);
      const change = prevService && prevService.cost ? momPct(service.cost, prevService.cost) : null;
      return { name: service.name, current: service.cost, change };
    })
    .sort((a, b) => (b.change ?? 0) - (a.change ?? 0));
}

function InstancesTable({ instances }: { instances: AwsInstance[] }) {
  return (
    <div className="mv-table-wrap">
      <table className="mv-table mv-table--stack">
        <thead>
          <tr><th>Instance ID</th><th>Type</th><th>State</th><th>Region</th></tr>
        </thead>
        <tbody>
          {instances.map((inst) => (
            <tr key={inst.InstanceId}>
              <UiTooltip content={inst.InstanceId}><td data-label="Instance ID" className="mv-code mv-stack-title mv-wrap-anywhere">{inst.InstanceId}</td></UiTooltip>
              <td data-label="Type">{inst.InstanceType}</td>
              <td data-label="State"><span className={`mv-status mv-status--${inst.State === 'running' ? 'success' : 'neutral'}`}>{inst.State}</span></td>
              <td data-label="Region">{inst.Region}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function budgetTone(pct: number, over: boolean): 'danger' | 'warning' | 'success' {
  if (over) return 'danger';
  if (pct >= 80) return 'warning';
  return 'success';
}

function BudgetCard({ budget }: { budget: { BudgetName: string; ActualSpend: number; BudgetLimit: number; ForecastedSpend: number } }) {
  const pct = budget.BudgetLimit > 0 ? Math.min((budget.ActualSpend / budget.BudgetLimit) * 100, 100) : 0;
  const over = budget.BudgetLimit > 0 && budget.ActualSpend > budget.BudgetLimit;
  const tone = budgetTone(pct, over);
  const forecastExceeds = budget.ForecastedSpend > budget.BudgetLimit;
  return (
    <article className="mv-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.625rem', gap: '0.5rem' }}>
        <UiTooltip content={budget.BudgetName}><h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>{budget.BudgetName}</h3></UiTooltip>
        <span className={`mv-status mv-status--${tone}`}>{pct.toFixed(0)}%</span>
      </div>
      <div className="mv-muted" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <span>Spent: <strong style={{ color: 'var(--mv-text)' }}>{formatCurrency(budget.ActualSpend)}</strong></span>
        <span>Cap: <strong style={{ color: 'var(--mv-text)' }}>{formatCurrency(budget.BudgetLimit)}</strong></span>
      </div>
      <div style={{ height: '0.5rem', borderRadius: '62.4375rem', background: 'var(--mv-divider)', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: '62.4375rem', width: `${pct}%`, background: `var(--mv-${tone})` }} />
      </div>
      {forecastExceeds && <p className="mv-text-warning" style={{ margin: '0.5rem 0 0' }}>Forecasted spend {formatCurrency(budget.ForecastedSpend)} exceeds this budget.</p>}
    </article>
  );
}
