import type { BtpCostTabProps } from '../../model/BtpCostTabProps';
import { momPct } from '../../model/btpDerivations';
import { SpendTrendChart } from '../../../../shared/ui/SpendTrendChart';
import { DonutChart } from '../../../../shared/ui/DonutChart';
import { Tooltip } from '../../../../shared/ui/Tooltip';

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
}

/**
 * Operations tab — Manager / Dept-Head audience. Ported from the reference
 * CCM app's BTP cost page operations block: a Month-Over-Month comparison
 * card, "Monthly Cost Trend" (the reference's own `dailyCosts` field is
 * actually month-granularity — renamed `monthlySamples` in this port, see
 * btpTypes.ts), "Service Cost Allocation" + "Environment Breakdown" side by
 * side, and a flat "Subaccount Cost Summary" table (not the interactive
 * drill-down — that's the Hierarchy tab).
 */
export function OperationsTab(props: BtpCostTabProps) {
  const { data, yearlyData, chartColors } = props;
  const currency = data.currency;

  const current = yearlyData[yearlyData.length - 1];
  const previous = yearlyData[yearlyData.length - 2];
  const momChange = current && previous ? momPct(current.totalCost, previous.totalCost) : null;
  const dayOfMonth = 27;
  const burnRate = data.totalCost / dayOfMonth;

  const trendData = data.monthlySamples.map((point) => ({ date: point.date, amount: point.cost }));
  const sortedServices = [...data.services].sort((a, b) => b.cost - a.cost);
  const top8 = sortedServices.slice(0, 8);
  const maxServiceCost = Math.max(...top8.map((s) => s.cost), 1);

  const envSlices = data.environments.map((e, i) => ({ label: e.type, value: e.cost, color: [chartColors.primary, chartColors.secondary, chartColors.tertiary, chartColors.axis][i % 4] }));
  const sortedSubaccounts = [...data.subaccounts].sort((a, b) => b.cost - a.cost);

  return (
    <div>
      <section className="mv-panel" style={{ marginBottom: '1rem' }}>
        <div className="mv-panel-header"><h2 className="mv-panel-title">Month-Over-Month Comparison</h2></div>
        <div className="mv-kpi-row-4">
          <article className="mv-kpi"><span className="mv-kpi-label">Current Month-to-Date</span><strong className="mv-kpi-value">{formatCurrency(data.totalCost, currency)}</strong><span className="mv-muted">Day {dayOfMonth}/30</span></article>
          <article className="mv-kpi"><span className="mv-kpi-label">Last Month Final</span><strong className="mv-kpi-value">{previous ? formatCurrency(previous.totalCost, currency) : '—'}</strong><span className="mv-muted">Actual</span></article>
          <article className="mv-kpi">
            <span className="mv-kpi-label">MoM Change</span>
            {momChange !== null && previous ? (
              <>
                <strong className="mv-kpi-value" style={{ color: momChange > 0 ? 'var(--mv-danger)' : 'var(--mv-success)' }}>{momChange > 0 ? '+' : ''}{momChange}%</strong>
                <span className="mv-muted">{formatCurrency(Math.abs(data.totalCost - previous.totalCost), currency)} diff</span>
              </>
            ) : <strong className="mv-kpi-value mv-muted">Insufficient data</strong>}
          </article>
          <article className="mv-kpi"><span className="mv-kpi-label">Daily Burn Rate</span><strong className="mv-kpi-value">{formatCurrency(burnRate, currency)}</strong><span className="mv-muted">per day avg</span></article>
        </div>
      </section>

      <section className="mv-panel" style={{ marginBottom: '1rem' }}>
        <div className="mv-panel-header"><h2 className="mv-panel-title">Monthly Cost Trend</h2></div>
        <SpendTrendChart title="Monthly cost trend" data={trendData} />
      </section>

      <div className="mv-row-3col" style={{ marginBottom: '1rem' }}>
        <section className="mv-panel">
          <div className="mv-panel-header"><h2 className="mv-panel-title">Service Cost Allocation</h2></div>
          {top8.length === 0 ? <p className="mv-muted">No service data available.</p> : (
            <>
              <div style={{ display: 'grid', gap: '0.625rem' }}>
                {top8.map((svc) => (
                  <div key={svc.name} style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.25rem', fontSize: '0.8125rem', minWidth: 0 }}>
                      <Tooltip content={svc.name}><span className="mv-muted">{svc.name}</span></Tooltip>
                      <span style={{ display: 'flex', gap: '0.5rem' }}><strong>{formatCurrency(svc.cost, currency)}</strong><span className="mv-muted">{data.totalCost > 0 ? `${((svc.cost / data.totalCost) * 100).toFixed(1)}%` : ''}</span></span>
                    </div>
                    <div style={{ height: '0.375rem', borderRadius: '62.4375rem', background: 'var(--mv-divider)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: '62.4375rem', width: `${(svc.cost / maxServiceCost) * 100}%`, background: 'var(--mv-primary)' }} />
                    </div>
                  </div>
                ))}
              </div>
              {sortedServices.length > 8 && <p className="mv-muted" style={{ marginTop: '0.75rem' }}>+{sortedServices.length - 8} more — see Technical tab</p>}
            </>
          )}
        </section>
        <section className="mv-panel">
          <div className="mv-panel-header"><h2 className="mv-panel-title">Environment Breakdown</h2></div>
          {envSlices.length === 0 ? <p className="mv-muted">No environment data — click Sync.</p> : <DonutChart title="Environment breakdown" totalLabel="Spend" data={envSlices} />}
        </section>
      </div>

      {sortedSubaccounts.length > 0 && (
        <section className="mv-panel">
          <div className="mv-panel-header"><h2 className="mv-panel-title">Subaccount Cost Summary</h2></div>
          <div className="mv-table-wrap">
            <table className="mv-table mv-table--stack">
              <thead><tr><th>Subaccount</th><th className="mv-num">Cost</th><th>Share</th></tr></thead>
              <tbody>
                {sortedSubaccounts.map((sub) => {
                  const pct = data.totalCost > 0 ? (sub.cost / data.totalCost) * 100 : 0;
                  return (
                    <tr key={sub.name}>
                      <td data-label="Subaccount" className="mv-stack-title">{sub.name}</td>
                      <td data-label="Cost" className="mv-num">{formatCurrency(sub.cost, currency)}</td>
                      <td data-label="Share">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ flex: 1, height: '0.375rem', borderRadius: '62.4375rem', background: 'var(--mv-divider)', overflow: 'hidden', minWidth: '3.75rem' }}>
                            <div style={{ height: '100%', borderRadius: '62.4375rem', width: `${pct}%`, background: 'var(--mv-primary)' }} />
                          </div>
                          <span className="mv-muted">{pct.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
