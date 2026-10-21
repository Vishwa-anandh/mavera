import { useId } from 'react';
import { BarList } from '../../../shared/ui/BarList';
import { DonutChart } from '../../../shared/ui/DonutChart';
import { PercentIcon } from '../../../shared/ui/icons';
import { PROVIDER_LABELS, formatCurrency, type CspBreakdown } from '../model/invoicesDerivations';
import type { Invoice } from '../model/invoicesTypes';

const DONUT_COLORS = ['#175CD3', '#EC7211', '#059669', '#7C3AED', '#DC6803', '#4285F4', '#DB2777', '#65A30D'];

const percent = (fraction: number) => `${(fraction * 100).toFixed(1)}%`;

/**
 * The "Maitsys CSP Savings" block of the selected-invoice analysis: the discount rate and the saving in money terms,
 * a donut of where the saving comes from, and sorted bars of the spend it applies to. The saving is what the flat
 * provider rate (or, for Azure, a service's own negotiated discount) takes off the invoiced charges, so it is an
 * estimate against the invoice, not a separate credit.
 */
export function CspSavingsBlock({ invoice, breakdown }: { invoice: Invoice; breakdown: CspBreakdown }) {
  const titleId = useId();
  const { rows, rate, base, total, effectiveRate, basis } = breakdown;
  const noun = basis === 'subaccount' ? 'subaccount' : 'service';
  const providerName = PROVIDER_LABELS[invoice.provider];

  return (
    <section className="mv-csp" aria-labelledby={titleId}>
      <header className="mv-csp-head">
        <div>
          <h3 className="mv-csp-title" id={titleId}><PercentIcon size={16} aria-hidden />Maitsys CSP Savings</h3>
          <p className="mv-muted">{percent(rate)} {providerName} discount{Math.abs(effectiveRate - rate) > 0.0005 ? `, ${percent(effectiveRate)} across this invoice with negotiated rates` : ''}</p>
        </div>
        <div className="mv-csp-total">
          <strong>{formatCurrency(total, invoice.currency)}</strong>
          <span className="mv-muted">saved on {formatCurrency(base, invoice.currency)} of charges</span>
        </div>
      </header>

      <div className="mv-csp-charts">
        <div>
          <h4 className="mv-csp-subtitle">Savings by {noun}</h4>
          <DonutChart
            title={`CSP savings by ${noun}`}
            totalLabel="Saved"
            format={(v) => formatCurrency(v, invoice.currency)}
            data={rows.map((r, i) => ({ label: r.name, value: r.savings, color: DONUT_COLORS[i % DONUT_COLORS.length] }))}
          />
        </div>
        <div>
          <h4 className="mv-csp-subtitle">Spend by {noun}</h4>
          <BarList
            label={`Spend by ${noun}`}
            items={rows.map((r) => ({
              key: r.name,
              label: r.name,
              value: r.cost,
              display: formatCurrency(r.cost, invoice.currency),
              meta: `${r.sharePct.toFixed(1)}% of charges · ${formatCurrency(r.savings, invoice.currency)} saved${r.cost > 0 ? ` at ${percent(r.savings / r.cost)}` : ''}`,
            }))}
          />
        </div>
      </div>
    </section>
  );
}
