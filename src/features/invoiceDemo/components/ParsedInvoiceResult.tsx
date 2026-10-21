import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { formatInvoiceMoney, PROVIDER_LABEL, type ParsedInvoice } from '../model/parseInvoice';

interface ParsedInvoiceResultProps {
  invoice: ParsedInvoice;
  onReset: () => void;
}

/** The sample result of a parse: the headline figures, the line items, spend by service and what to do next. */
export const ParsedInvoiceResult = forwardRef<HTMLHeadingElement, ParsedInvoiceResultProps>(function ParsedInvoiceResult({ invoice, onReset }, headingRef) {
  const money = (amount: number) => formatInvoiceMoney(amount, invoice.currency);
  const largest = Math.max(...invoice.spendByService.map((row) => row.amount), 0);

  return (
    <section className="mv-idemo-result" aria-labelledby="idemo-result-title">
      <div className="mv-idemo-result-head">
        <div>
          <h2 id="idemo-result-title" className="mv-idemo-result-title" tabIndex={-1} ref={headingRef}>{PROVIDER_LABEL[invoice.provider]} invoice {invoice.invoiceNumber}</h2>
          <p className="mv-muted">From {invoice.fileName}</p>
        </div>
        <div className="mv-idemo-result-actions">
          <span className="mv-idemo-sample" title="The figures are generated from the file name and size. Your file is not read.">Sample parse, prototype</span>
          <button type="button" className="mv-secondary-button" onClick={onReset}>Try another invoice</button>
        </div>
      </div>

      <dl className="mv-idemo-facts" aria-label="Invoice summary">
        <div><dt>Invoice number</dt><dd className="mv-mono">{invoice.invoiceNumber}</dd></div>
        <div><dt>Billing period</dt><dd>{invoice.billingPeriod}</dd></div>
        <div><dt>Tax ({Math.round(invoice.taxRate * 100)}%)</dt><dd>{money(invoice.tax)}</dd></div>
        <div className="mv-idemo-fact-total"><dt>Total</dt><dd>{money(invoice.total)}</dd></div>
      </dl>

      <div className="mv-idemo-columns">
        <section aria-labelledby="idemo-items-title">
          <h3 id="idemo-items-title" className="mv-panel-title">Line items</h3>
          <div className="mv-table-wrap">
            <table className="mv-table mv-idemo-table">
              <thead><tr><th>Service</th><th className="mv-idemo-desc">Description</th><th className="mv-num mv-idemo-usage">Usage</th><th className="mv-num">Amount</th></tr></thead>
              <tbody>
                {invoice.lineItems.map((item) => (
                  <tr key={`${item.service}-${item.description}`}>
                    <td>{item.service}<span className="mv-idemo-sub">{item.description} · {item.usage}</span></td>
                    <td className="mv-muted mv-idemo-desc">{item.description}</td>
                    <td className="mv-num mv-idemo-usage">{item.usage}</td>
                    <td className="mv-num">{money(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><th scope="row">Subtotal</th><td className="mv-idemo-desc" /><td className="mv-idemo-usage" /><td className="mv-num">{money(invoice.subtotal)}</td></tr>
                <tr><th scope="row">Tax ({Math.round(invoice.taxRate * 100)}%)</th><td className="mv-idemo-desc" /><td className="mv-idemo-usage" /><td className="mv-num">{money(invoice.tax)}</td></tr>
                <tr className="mv-idemo-total-row"><th scope="row">Total</th><td className="mv-idemo-desc" /><td className="mv-idemo-usage" /><td className="mv-num">{money(invoice.total)}</td></tr>
              </tfoot>
            </table>
          </div>
        </section>

        <section aria-labelledby="idemo-services-title">
          <h3 id="idemo-services-title" className="mv-panel-title">Spend by service</h3>
          <ul className="mv-idemo-bars" aria-label="Spend by service, largest first">
            {invoice.spendByService.map((row) => (
              <li key={row.service}>
                <div className="mv-idemo-bar-label"><span>{row.service}</span><span className="mv-muted">{money(row.amount)} · {row.sharePercent.toFixed(1)}%</span></div>
                <div className="mv-idemo-bar-track" aria-hidden="true"><div className="mv-idemo-bar-fill" style={{ width: `${largest > 0 ? Math.max(2, (row.amount / largest) * 100) : 0}%` }} /></div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside className="mv-idemo-cta" aria-label="Next steps">
        <div>
          <h3 className="mv-panel-title">Track every invoice, not just this one</h3>
          <p className="mv-muted">Register your company to keep parsed invoices next to your live cloud costs, budgets and alerts.</p>
        </div>
        <div className="mv-idemo-cta-actions">
          <Link className="mv-primary-button" to="/company-signup">Register your company</Link>
          <Link className="mv-secondary-button" to="/login">Sign in</Link>
        </div>
      </aside>
    </section>
  );
});
