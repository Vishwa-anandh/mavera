import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AzureCostTabProps } from '../../model/AzureCostTabProps';
import type { AzureBudget, AzureYearlyMonth } from '../../model/azureTypes';
import { cspSavingsByService, momPct } from '../../model/azureDerivations';
import { SpendTrendChart } from '../../../../shared/ui/SpendTrendChart';
import { Tooltip as UiTooltip } from '../../../../shared/ui/Tooltip';

/**
 * Operations tab — Manager / Dept-Head audience. Ported from the reference
 * CCM app's Azure cost page `activeTab === "operations"` render block:
 * "Monthly Spend by Service" (a 12-month stacked-by-service bar chart),
 * "Daily Cost History", the 4-up "Cost Insights" callouts, "Top Services" +
 * "By Resource Group" + "By Region", "Cost Movers" (month-over-month
 * per-service change) and the "Budget Limits" grid.
 *
 * Two adaptations from the reference source, both because this port has no
 * live backend behind it:
 * - The reference's "Monthly Spend by Service" chart offers a "Fetch
 *   12-Month History" backfill action when `yearlyData` is empty; there's no
 *   backfill endpoint here; the empty state below just says so.
 * - "Daily Cost History" reused the reference's own `DailyCostHistoryTabs`
 *   widget (a day/week/month tab-switcher shared with the Technical tab,
 *   which this port's Technical tab already omits). Its day-to-day role is
 *   covered here with the existing `SpendTrendChart` fed the already
 *   month-resolved `data.dailyCosts`, rather than re-building that shared
 *   widget from scratch.
 *
 * `data.topResources` and `data.resources` (the raw per-resource inventory)
 * are Technical-tab content and intentionally not used here. Likewise, the
 * reference's own `operations` block has no Alerts or Azure Advisor
 * Recommendations section — those aren't rendered here either, despite this
 * tab's Manager audience.
 *
 * The reference's 5-color `AZURE_COLORS` palette for the stacked chart has
 * no equivalent in this design system (only 3 chart-role tokens exist), so
 * the top-services breakdown is capped to 3 named services + "Other".
 */
export function OperationsTab(props: AzureCostTabProps) {
  const { data, yearlyData, budgets, cspRecommendations, isCurrentMonth, chartColors } = props;

  const { keys: stackedKeys, rows: stackedRows } = buildStackedServiceData(yearlyData);
  const stackedColors = [chartColors.primary, chartColors.secondary, chartColors.tertiary];
  const hasOther = stackedRows.some((row) => Number(row.Other) > 0);

  const currentIndex = findCurrentYearlyIndex(yearlyData, data.totalCost, isCurrentMonth);
  const prevEntry = currentIndex > 0 ? yearlyData[currentIndex - 1] : undefined;
  const momChange = prevEntry ? momPct(data.totalCost, prevEntry.totalCost) : null;

  const sortedServices = [...data.services].sort((a, b) => b.cost - a.cost);
  const topService = sortedServices[0];
  const topServicePct = topService && data.totalCost > 0 ? (topService.cost / data.totalCost) * 100 : null;

  const forecastTotal = isCurrentMonth ? data.forecast : null;
  const forecastPct = forecastTotal && data.totalCost > 0 ? (data.totalCost / forecastTotal) * 100 : null;
  const forecastHigh = forecastPct !== null && forecastPct > 85;

  const mainBudget = budgets.find((b) => b.amount > 0);
  const budgetPct = mainBudget ? (data.totalCost / mainBudget.amount) * 100 : null;
  const budgetOver = mainBudget ? data.totalCost > mainBudget.amount : false;

  const movers = buildMovers(sortedServices, prevEntry?.topServices, data.totalCost);
  const dailyTrend = data.dailyCosts.map((point) => ({ date: point.date, amount: point.cost }));

  return (
    <div>
      <section className="mv-panel" style={{ marginBottom: '1rem' }}>
        <div className="mv-panel-header">
          <h2 className="mv-panel-title">Monthly Spend by Service</h2>
        </div>
        {yearlyData.length === 0 ? (
          <p className="mv-muted">No 12-month service history is stored for this subscription yet.</p>
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

      <section className="mv-panel" style={{ marginBottom: '1rem' }}>
        <div className="mv-panel-header">
          <h2 className="mv-panel-title">Daily Cost Trend</h2>
        </div>
        <SpendTrendChart title="Daily cost trend" data={dailyTrend} />
      </section>

      <section className="mv-panel" style={{ marginBottom: '1rem' }}>
        <div className="mv-panel-header">
          <h2 className="mv-panel-title">Cost Insights</h2>
        </div>
        <div className="mv-kpi-row-4">
          <article className="mv-kpi">
            <span className="mv-kpi-label">Month-over-Month</span>
            {momChange !== null && prevEntry ? (
              <>
                <strong className="mv-kpi-value" style={{ color: momChange > 0 ? 'var(--mv-danger)' : 'var(--mv-success)' }}>
                  {momChange > 0 ? '+' : ''}{momChange}%
                </strong>
                <span className="mv-muted">Spend {momChange > 0 ? 'up' : 'down'} from {formatCurrency(prevEntry.totalCost)} to {formatCurrency(data.totalCost)}</span>
              </>
            ) : (
              <>
                <strong className="mv-kpi-value">—</strong>
                <span className="mv-muted">Not enough month-over-month history to compare yet.</span>
              </>
            )}
          </article>

          <article className="mv-kpi">
            <span className="mv-kpi-label">Top Cost Driver</span>
            <strong className="mv-kpi-value" style={{ fontSize: '1.125rem' }}>{topService ? topService.name : 'No service data'}</strong>
            <span className="mv-muted">{topService && topServicePct !== null ? `${formatCurrency(topService.cost)} · ${topServicePct.toFixed(1)}% of total spend` : 'No service breakdown available yet.'}</span>
          </article>

          <article className="mv-kpi">
            <span className="mv-kpi-label">Forecast</span>
            <strong className="mv-kpi-value" style={{ fontSize: '1.125rem' }}>{forecastTotal ? formatCurrency(forecastTotal) : 'N/A'}</strong>
            <span className={forecastHigh ? 'mv-text-warning' : 'mv-muted'}>
              {forecastPct !== null
                ? `${forecastPct.toFixed(0)}% of projected month-end spend used${forecastHigh ? ' — approaching forecast' : ''}`
                : isCurrentMonth
                  ? 'Insufficient data for a forecast projection.'
                  : 'Forecasts only apply to the current billing cycle.'}
            </span>
          </article>

          <article className="mv-kpi">
            <span className="mv-kpi-label">Budget vs. Actual</span>
            <strong className="mv-kpi-value" style={{ fontSize: '1.125rem', color: budgetOver ? 'var(--mv-danger)' : undefined }}>
              {mainBudget ? (budgetOver ? `Over by ${formatCurrency(data.totalCost - mainBudget.amount)}` : `${formatCurrency(mainBudget.amount - data.totalCost)} left`) : 'No budgets'}
            </strong>
            <span className="mv-muted">
              {mainBudget && budgetPct !== null ? `${mainBudget.name} · ${budgetPct.toFixed(0)}% of ${formatCurrency(mainBudget.amount)} used` : 'Set up an Azure budget to track spend against a target.'}
            </span>
          </article>
        </div>
      </section>

      <div className="mv-row-3col" style={{ marginBottom: '1rem' }}>
        <NamedListCard title="Top Services" rows={sortedServices.slice(0, LIST_VISIBLE)} savingsFor={(name) => cspSavingsByService(cspRecommendations, name)} />
        <NamedListCard title="By Resource Group" rows={data.resourceGroups} />
        <NamedListCard title="By Region" rows={data.locations} />
      </div>

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
                  <p className="mv-muted" style={{ margin: 0 }}>{formatCurrency(mover.current)} · {mover.pctOfTotal.toFixed(1)}% of total</p>
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
          <h2 className="mv-panel-title">Budget Limits</h2>
        </div>
        {budgets.length === 0 ? (
          <p className="mv-muted">No budgets configured for this subscription.</p>
        ) : (
          <div className="mv-row-3col">
            {budgets.map((budget) => (
              <BudgetCard key={budget.name} budget={budget} />
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

/** `AzureServiceCost` and `AzureNamedCost` (azureTypes.ts) are both exactly
 * `{ name, cost }` — one structural shape covers services, resource groups
 * and regions alike, so the list card below takes any of them. */
type NamedCost = { name: string; cost: number };

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** Capped to 3 — this design system defines exactly 3 chart-role color
 * tokens (`chartColors.primary/secondary/tertiary`), unlike the reference's
 * bespoke 6-shade `AZURE_COLORS` array. */
const TOP_SERVICE_KEYS = 3;
const LIST_VISIBLE = 6;
const MOVERS_VISIBLE = 8;

function buildStackedServiceData(yearlyData: AzureYearlyMonth[]): { keys: string[]; rows: Array<Record<string, number | string>> } {
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

/** Finds which `yearlyData` row the already-resolved `data` corresponds to,
 * without needing the selected year/month directly (not part of
 * `AzureCostTabProps` — the parent shell resolves `data` itself). The
 * current month is always the last row; a historical month is matched back
 * by its (distinctly-valued, in this mock dataset) total — the same value
 * `AzureCostPage`'s `emptyCosts()` sources it from. */
function findCurrentYearlyIndex(yearlyData: AzureYearlyMonth[], totalCost: number, isCurrentMonth: boolean): number {
  if (isCurrentMonth) return yearlyData.length - 1;
  const idx = yearlyData.findIndex((month) => month.totalCost === totalCost);
  return idx >= 0 ? idx : yearlyData.length - 1;
}

interface MoverRow {
  name: string;
  current: number;
  change: number | null;
  pctOfTotal: number;
}

function buildMovers(sortedServices: NamedCost[], prevServices: NamedCost[] | undefined, totalCost: number): MoverRow[] {
  return sortedServices
    .slice(0, MOVERS_VISIBLE)
    .map((service) => {
      const prevService = prevServices?.find((s) => s.name === service.name);
      const change = prevService && prevService.cost ? momPct(service.cost, prevService.cost) : null;
      return {
        name: service.name,
        current: service.cost,
        change,
        pctOfTotal: totalCost > 0 ? (service.cost / totalCost) * 100 : 0,
      };
    })
    .sort((a, b) => (b.change ?? 0) - (a.change ?? 0));
}

function NamedListCard({ title, rows, savingsFor }: { title: string; rows: NamedCost[]; savingsFor?: (name: string) => number }) {
  const max = Math.max(...rows.map((row) => row.cost), 1);
  return (
    <section className="mv-panel">
      <div className="mv-panel-header">
        <h2 className="mv-panel-title">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <p className="mv-muted">No data available.</p>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {rows.map((row) => {
            const savings = savingsFor?.(row.name) ?? 0;
            return (
              <div key={row.name} style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.25rem', fontSize: '0.8125rem', minWidth: 0 }}>
                  <UiTooltip content={row.name}><span className="mv-muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</span></UiTooltip>
                  <span style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline', flex: 'none' }}>
                    <strong>{formatCurrency(row.cost)}</strong>
                    {savings > 0 && <span style={{ color: 'var(--mv-success)', fontSize: '0.6875rem' }}>-{formatCurrency(savings)}</span>}
                  </span>
                </div>
                <div style={{ height: '0.375rem', borderRadius: '62.4375rem', background: 'var(--mv-divider)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: '62.4375rem', width: `${(row.cost / max) * 100}%`, background: 'var(--mv-primary)' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function budgetTone(pct: number, over: boolean): 'danger' | 'warning' | 'success' {
  if (over) return 'danger';
  if (pct >= 80) return 'warning';
  return 'success';
}

function BudgetCard({ budget }: { budget: AzureBudget }) {
  const spent = budget.currentSpend?.amount ?? 0;
  const pct = budget.amount > 0 ? Math.min((spent / budget.amount) * 100, 100) : 0;
  const over = budget.amount > 0 && spent > budget.amount;
  const tone = budgetTone(pct, over);
  return (
    <article className="mv-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.625rem', gap: '0.5rem' }}>
        <UiTooltip content={budget.name}><h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>{budget.name}</h3></UiTooltip>
        <span className={`mv-status mv-status--${tone}`}>{pct.toFixed(0)}%</span>
      </div>
      <div className="mv-muted" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <span>Spent: <strong style={{ color: 'var(--mv-text)' }}>{formatCurrency(spent)}</strong></span>
        <span>Cap: <strong style={{ color: 'var(--mv-text)' }}>{formatCurrency(budget.amount)}</strong></span>
      </div>
      <div style={{ height: '0.5rem', borderRadius: '62.4375rem', background: 'var(--mv-divider)', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: '62.4375rem', width: `${pct}%`, background: `var(--mv-${tone})` }} />
      </div>
    </article>
  );
}
