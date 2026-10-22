import type { MspRow } from '../model/savingsInsights';

function money(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

/**
 * Maitsys MSP savings (per-provider rates): the discount Maitsys's contracts give on each provider,
 * the month's spend it applies to and the saving, with a total. Applied automatically, never a task.
 */
export function MspSavingsPanel({ rows, annualisedPct }: { rows: MspRow[]; annualisedPct: number }) {
  const total = rows.reduce((sum, r) => sum + r.saving, 0);
  const spend = rows.reduce((sum, r) => sum + r.spend, 0);
  return (
    <section className="mv-panel" aria-labelledby="msp-panel-title">
      <div className="mv-panel-header">
        <div>
          <h3 id="msp-panel-title" className="mv-panel-title">Maitsys MSP Savings (per-provider rates)</h3>
          <p className="mv-muted">Applied automatically through Maitsys's contracted MSP/CSP rates. {annualisedPct.toFixed(2)}% of annualised spend.</p>
        </div>
        <strong className="mv-saving-total">{money(total)}</strong>
      </div>
      <div className="mv-table-wrap">
        <table className="mv-table mv-table--stack">
          <caption className="mv-sr-only">Maitsys discount rate, monthly spend and monthly saving per provider</caption>
          <thead><tr><th>Provider</th><th className="mv-num">Discount rate</th><th className="mv-num">Monthly spend</th><th className="mv-num">Monthly saving</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.provider}>
                <td data-label="Provider" className="mv-stack-title">{row.label}</td>
                <td data-label="Discount rate" className="mv-num">{(row.rate * 100).toFixed(1)}%</td>
                <td data-label="Monthly spend" className="mv-num">{money(row.spend)}</td>
                <td data-label="Monthly saving" className="mv-num">{money(row.saving)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><th scope="row" className="mv-stack-title">Total</th><td data-label="Discount rate" className="mv-num">{spend > 0 ? `${((total / spend) * 100).toFixed(2)}%` : '—'}</td><td data-label="Monthly spend" className="mv-num">{money(spend)}</td><td data-label="Monthly saving" className="mv-num">{money(total)}</td></tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
