import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AwsCostTabProps } from '../../model/AwsCostTabProps';
import type { AwsInstance, AwsYearlyMonth, CspRecommendation } from '../../model/awsTypes';
import { isAccountWide, momPct } from '../../model/awsDerivations';
import { extendDailyHistory, topWithOther } from '../../../../shared/lib/costAnalysis';
import { DailyCostHistory } from '../../../../shared/ui/DailyCostHistory';
import { CostByRegion } from '../../../../shared/ui/CostByRegion';
import { DetailGroup } from '../../../../shared/ui/DetailGroup';
import { SpendTrendChart } from '../../../../shared/ui/SpendTrendChart';
import { DonutChart } from '../../../../shared/ui/DonutChart';
import { Tooltip as UiTooltip } from '../../../../shared/ui/Tooltip';

/**
 * Technical tab — Engineer / in-depth audience. Ported from the reference
 * CCM app's AWS cost page `activeTab === "technical"` render block:
 * "Monthly Spend by Service" and "Annual Cost Trend" (same as Executive/
 * Operations equivalents, duplicated under this tab's own ids per the
 * reference), "Daily Cost Trend" + "Cost by Service" side by side, "Top
 * Services by Spend" and "Cost by Region" (same cards Operations shows,
 * different ids), the itemized "Maitsys CSP Savings Opportunities" list
 * (Technical-tab-ONLY — Executive/Operations only show aggregate savings
 * numbers), "Cost Movers", the "Detailed Cost Breakdown" table over
 * `data.details`, and "EC2 Instances" + "Budgets".
 *
 * The long view is split into stacked groups with headings (spend over time,
 * breakdown, savings and budgets, resources) instead of one flat list. The
 * old "Daily Cost Trend" area is now "Daily Cost History", the shared panel
 * with a 7d | 14d | 30d switch and a bar or area view.
 *
 * Unlike Azure's Technical tab, none of AWS's resources/instances/budgets
 * are month-scoped in the reference, so there's no historical-month
 * "not available" guard here — they're the org's current live state
 * regardless of which month `data` resolves to.
 */
export function TechnicalTab(props: AwsCostTabProps) {
  const { data, yearlyData, budgets, instances, cspRecommendations, mspRate, chartColors } = props;

  const { keys: stackedKeys, rows: stackedRows } = buildStackedServiceData(yearlyData);
  const stackedColors = [chartColors.primary, chartColors.secondary, chartColors.tertiary];
  const hasOther = stackedRows.some((row) => Number(row.Other) > 0);

  const yearlyTotal = yearlyData.reduce((sum, m) => sum + m.totalCost, 0);
  const yearlyAvg = yearlyData.length > 0 ? yearlyTotal / yearlyData.length : 0;
  const peakMonth = [...yearlyData].sort((a, b) => b.totalCost - a.totalCost)[0];
  const trendData = yearlyData.map((m) => ({ date: monthLabel(m.year, m.month), amount: m.totalCost }));

  const dailyHistory = extendDailyHistory(data.dailyCosts, yearlyData);
  const donutColors = [chartColors.primary, chartColors.secondary, chartColors.tertiary, chartColors.axis];
  const serviceSlices = topWithOther(data.services, 3).map((s, i) => ({ label: s.name, value: s.cost, color: donutColors[i % donutColors.length] }));

  const sortedServices = [...data.services].sort((a, b) => b.cost - a.cost);
  const top6 = sortedServices.slice(0, 6);
  const top6Total = top6.reduce((sum, s) => sum + s.cost, 0);
  const cspSavingsTotal = data.totalCost * mspRate + cspRecommendations.reduce((sum, r) => sum + r.estimated_savings, 0);

  const currentIndex = yearlyData.findIndex((m) => m.totalCost === data.totalCost);
  const prevEntry = currentIndex > 0 ? yearlyData[currentIndex - 1] : yearlyData[yearlyData.length - 2];
  const movers = buildMovers(sortedServices, prevEntry?.topServices);

  const regionCosts = data.regions.map((r) => ({ name: r.region, cost: r.cost }));

  return (
    <div>
      <DetailGroup title="Spend over time" description="How the bill built up day by day, month by month and by service.">
        <DailyCostHistory series={dailyHistory} headingLevel="h3" forecastTotal={data.forecast} />

        <section className="mv-panel" id="aws-daily-trend">
          <div className="mv-panel-header">
            <h3 className="mv-panel-title">Monthly Spend by Service</h3>
          </div>
          {yearlyData.length === 0 || stackedKeys.length === 0 ? (
            <p className="mv-muted">No 12-month service history is stored for this account yet.</p>
          ) : (
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
          )}
        </section>

        <section className="mv-panel" id="aws-annual-trend">
          <div className="mv-panel-header">
            <h3 className="mv-panel-title">Annual Cost Trend — {yearlyData[yearlyData.length - 1]?.year ?? '—'}</h3>
          </div>
          <div className="mv-kpi-row-4" style={{ marginBottom: '1rem' }}>
            <article className="mv-kpi"><span className="mv-kpi-label">Yearly Total</span><strong className="mv-kpi-value">{formatCurrency(yearlyTotal)}</strong></article>
            <article className="mv-kpi"><span className="mv-kpi-label">Avg per Month</span><strong className="mv-kpi-value">{formatCurrency(yearlyAvg)}</strong></article>
            <article className="mv-kpi"><span className="mv-kpi-label">Peak Month</span><strong className="mv-kpi-value" style={{ fontSize: '1.125rem' }}>{peakMonth ? monthLabel(peakMonth.year, peakMonth.month) : '—'}</strong>{peakMonth && <span className="mv-muted">{formatCurrency(peakMonth.totalCost)}</span>}</article>
          </div>
          <SpendTrendChart title="Annual cost trend" data={trendData} />
        </section>
      </DetailGroup>

      <DetailGroup title="Cost breakdown" description="Where the spend goes: services, regions and what moved since last month.">
        <div className="mv-columns-split">
          <section className="mv-panel">
            <div className="mv-panel-header"><h3 className="mv-panel-title">Cost by Service</h3></div>
            <DonutChart title="Cost by service" totalLabel="Spend" data={serviceSlices} format={formatCurrency} />
          </section>
          <section className="mv-panel" id="aws-top-services">
            <div className="mv-panel-header">
              <h3 className="mv-panel-title">Top Services by Spend</h3>
            </div>
            {top6.length === 0 ? (
              <p className="mv-muted">No service data available.</p>
            ) : (
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
            )}
          </section>
        </div>

        {data.regions.length > 0 && <CostByRegion id="aws-region" regions={regionCosts} headingLevel="h3" />}

        <section className="mv-panel">
          <div className="mv-panel-header"><h3 className="mv-panel-title">Cost Movers</h3></div>
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

        {data.details.length > 0 && (
          <section className="mv-panel">
            <div className="mv-panel-header"><h3 className="mv-panel-title">Detailed Cost Breakdown</h3></div>
            <div className="mv-table-wrap">
              <table className="mv-table mv-table--stack">
                <thead><tr><th>Service</th><th>Usage Type</th><th className="mv-num">Cost</th><th className="mv-num">CSP Savings ({(mspRate * 100).toFixed(1)}%)</th></tr></thead>
                <tbody>
                  {data.details.map((row) => (
                    <tr key={`${row.service}-${row.usageType}`}>
                      <td data-label="Service" className="mv-stack-title">{row.service}</td>
                      <td data-label="Usage Type" className="mv-muted mv-wrap-anywhere">{row.usageType}</td>
                      <td data-label="Cost" className="mv-num">{formatCurrency(row.cost)}</td>
                      <td data-label={`CSP Savings (${(mspRate * 100).toFixed(1)}%)`} className="mv-num" style={{ color: 'var(--mv-success)' }}>{formatCurrency(row.cost * mspRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </DetailGroup>

      {(cspRecommendations.length > 0 || budgets.length > 0) && (
        <DetailGroup title="Savings and budgets" description="What Maitsys suggests and how spend compares with your budgets.">
          {cspRecommendations.length > 0 && (
            <section className="mv-panel" id="aws-csp-savings">
              <div className="mv-panel-header"><h3 className="mv-panel-title">Maitsys CSP Savings Opportunities</h3></div>
              <div className="mv-inline-error" style={{ marginBottom: '1rem', borderColor: 'var(--mv-success)', background: 'color-mix(in srgb, var(--mv-success) 7%, transparent)', color: 'var(--mv-text)' }}>
                <strong style={{ color: 'var(--mv-success)' }}>Maitsys CSP saves you {formatCurrency(data.totalCost * mspRate)}/month</strong>
                <p className="mv-muted" style={{ margin: '0.25rem 0 0' }}>{(mspRate * 100).toFixed(1)}% MSP pricing advantage on {formatCurrency(data.totalCost)} spend.</p>
              </div>
              <RecommendationsList recommendations={cspRecommendations.slice(0, 20)} />
            </section>
          )}

          {budgets.length > 0 && (
            <section className="mv-panel">
              <div className="mv-panel-header"><h3 className="mv-panel-title">Budgets</h3></div>
              <div className="mv-row-3col">
                {budgets.map((budget) => (
                  <BudgetCard key={budget.BudgetName} budget={budget} />
                ))}
              </div>
            </section>
          )}
        </DetailGroup>
      )}

      {instances.length > 0 && (
        <DetailGroup title="Resources" description="The EC2 instances running in this account.">
          <section className="mv-panel">
            <div className="mv-panel-header"><h3 className="mv-panel-title">EC2 Instances</h3></div>
            <InstancesTable instances={instances} />
          </section>
        </DetailGroup>
      )}
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function monthLabel(year: number, month: number): string {
  return `${MONTH_ABBR[month - 1] ?? month} ${year}`;
}

const TOP_SERVICE_KEYS = 3;
function buildStackedServiceData(yearlyData: AwsYearlyMonth[]): { keys: string[]; rows: Array<Record<string, number | string>> } {
  const totals = new Map<string, number>();
  yearlyData.forEach((month) => month.topServices.forEach((service) => totals.set(service.name, (totals.get(service.name) ?? 0) + service.cost)));
  const keys = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP_SERVICE_KEYS).map(([name]) => name);

  const rows = yearlyData.map((month) => {
    const row: Record<string, number | string> = { label: `${MONTH_ABBR[month.month - 1]} '${String(month.year).slice(2)}`, Other: 0 };
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

function humanize(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2');
}

function RecommendationsList({ recommendations }: { recommendations: CspRecommendation[] }) {
  return (
    <div style={{ display: 'grid', gap: '0.625rem' }}>
      {recommendations.map((rec) => (
        <div key={rec.id} style={{ padding: '0.75rem', border: '1px solid var(--mv-divider)', borderRadius: '0.5rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginBottom: '0.375rem' }}>
            <span className="mv-status mv-status--neutral">{humanize(rec.resource_type)}</span>
            {rec.action && <span className="mv-status mv-status--info">{humanize(rec.action)}</span>}
            <span className="mv-muted" style={{ marginLeft: 'auto' }}>{isAccountWide(rec.resource_id) ? 'Account-wide' : rec.resource_name}</span>
          </div>
          <p style={{ margin: '0 0 0.375rem' }}>{rec.description}</p>
          <div className="mv-muted" style={{ display: 'flex', gap: '1rem' }}>
            <span>Current: {formatCurrency(rec.current_monthly_cost)}/mo</span>
            <span>After: {formatCurrency(Math.max(0, rec.current_monthly_cost - rec.estimated_savings))}/mo</span>
            <strong style={{ color: 'var(--mv-success)', marginLeft: 'auto' }}>-{formatCurrency(rec.estimated_savings)}/mo</strong>
          </div>
        </div>
      ))}
    </div>
  );
}

function InstancesTable({ instances }: { instances: AwsInstance[] }) {
  return (
    <div className="mv-table-wrap">
      <table className="mv-table mv-table--stack">
        <thead><tr><th>Instance ID</th><th>Type</th><th>State</th><th>Region</th></tr></thead>
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
  return (
    <article className="mv-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.625rem', gap: '0.5rem' }}>
        <UiTooltip content={budget.BudgetName}><h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>{budget.BudgetName}</h4></UiTooltip>
        <span className={`mv-status mv-status--${tone}`}>{pct.toFixed(0)}%</span>
      </div>
      <div className="mv-muted" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <span>Spent: <strong style={{ color: 'var(--mv-text)' }}>{formatCurrency(budget.ActualSpend)}</strong></span>
        <span>Cap: <strong style={{ color: 'var(--mv-text)' }}>{formatCurrency(budget.BudgetLimit)}</strong></span>
      </div>
      <div style={{ height: '0.5rem', borderRadius: '62.4375rem', background: 'var(--mv-divider)', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: '62.4375rem', width: `${pct}%`, background: `var(--mv-${tone})` }} />
      </div>
    </article>
  );
}
