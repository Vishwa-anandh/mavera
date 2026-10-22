import type { Customer, Invoice } from '../../../shared/domain/billing/billingTypes';
import { formatCurrency, formatDate, STATUS_TONE } from '../../../shared/domain/billing/billingDerivations';
import { CheckIcon } from '../../../shared/ui/icons';

export function StatusPill({ status }: { status: Invoice['status'] }) {
  return <span className={`mv-status mv-status--${STATUS_TONE[status]}`}>{status}</span>;
}

function MetaChip({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div style={{ padding: '0.5rem 0.75rem', borderRadius: '0.5rem', background: 'var(--mv-surface-subtle)' }}>
      <p className="mv-muted" style={{ margin: 0, fontSize: '0.75rem', fontWeight: 500 }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', fontWeight: 500 }}>{value}</p>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <article className="mv-kpi" style={{ minHeight: 'auto', padding: '0.875rem' }}>
      <span className="mv-kpi-label">{label}</span>
      <strong className="mv-kpi-value" style={{ fontSize: '1.125rem', marginTop: '0.5rem' }}>{value}</strong>
    </article>
  );
}

interface CustomerInvoiceDetailProps {
  invoice: Invoice;
  customer: Customer | undefined;
  allowPayment?: boolean;
  onPay?: (invoiceId: string) => void;
}

/**
 * The app's own read-only data-summary view — as opposed to the branded
 * InvoiceDocument. Always read-only regardless of who's viewing (pricing is
 * set once at creation); the only interactive element is an optional Pay
 * Now button.
 */
export function CustomerInvoiceDetail({ invoice, customer, allowPayment, onPay }: CustomerInvoiceDetailProps) {
  const showDiscountCol = invoice.lines.some((l) => l.discountPctApplied > 0);
  const showAdjustmentCol = invoice.lines.some((l) => l.maitsysAdjustmentPctApplied > 0);
  const canPay = allowPayment && (invoice.status === 'Sent' || invoice.status === 'Overdue');

  return (
    <section className="mv-panel">
      <div className="mv-panel-header">
        <div>
          <StatusPill status={invoice.status} />
          <h2 className="mv-panel-title" style={{ marginTop: '0.375rem' }}>{invoice.invoiceNumber}</h2>
          <p className="mv-muted" style={{ margin: '2px 0 0', fontSize: '0.8125rem' }}>{customer?.name ?? 'Unknown customer'}{customer && customer.discountPct > 0 ? ` · ${customer.discountPct}% standard discount` : ''}</p>
        </div>
        {canPay && <button className="mv-primary-button mv-invoice-pay" onClick={() => onPay?.(invoice.id)}><CheckIcon size={16} style={{ marginRight: '0.375rem' }} />Pay Now</button>}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        <MetaChip label="Invoice Date" value={formatDate(invoice.invoiceDate)} />
        <MetaChip label="Serial #" value={invoice.serialNumber} />
        <MetaChip label="PO #" value={invoice.poNumber} />
        <MetaChip label="Payment Term" value={invoice.paymentTermName} />
        <MetaChip label="Due" value={formatDate(invoice.dueDate)} />
        <MetaChip label="Published" value={formatDate(invoice.publishedDate)} />
        {invoice.paidDate && <MetaChip label="Paid" value={formatDate(invoice.paidDate)} />}
        {invoice.customFields.filter((f) => f.label).map((f) => <MetaChip key={f.id} label={f.label} value={f.value} />)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(8.75rem, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <Kpi label="Line Items Subtotal" value={formatCurrency(invoice.lineSubtotal)} />
        <Kpi label={`Summary Adjustment${invoice.overallAdjustmentPct ? ` (${invoice.overallAdjustmentPct}%)` : ''}`} value={formatCurrency(invoice.overallAdjustmentAmount)} />
        <Kpi label={`Tax (${invoice.taxPct}%)`} value={formatCurrency(invoice.tax)} />
        <Kpi label="Total Due" value={formatCurrency(invoice.totalDue)} />
      </div>

      <div className="mv-table-wrap">
        <table className="mv-table mv-table--stack">
          <thead>
            <tr>
              <th>Description</th>
              <th className="mv-num">Vendor Total</th>
              {showDiscountCol && <th className="mv-num">Discount %</th>}
              <th className="mv-num">Net</th>
              {showAdjustmentCol && <th className="mv-num">Adj. %</th>}
              <th className="mv-num">Final Amount</th>
              {invoice.columns.map((c) => <th key={c.id}>{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((l) => (
              <tr key={l.id}>
                <td className="mv-stack-title">{l.description || '—'}</td>
                <td data-label="Vendor Total" className="mv-num">{formatCurrency(l.vendorLineTotal)}</td>
                {showDiscountCol && <td data-label="Discount %" className="mv-num">{l.discountPctApplied > 0 ? `${l.discountPctApplied}%` : '—'}</td>}
                <td data-label="Net" className="mv-num">{formatCurrency(l.netAmountAfterDiscount)}</td>
                {showAdjustmentCol && <td data-label="Adj. %" className="mv-num">{l.maitsysAdjustmentPctApplied > 0 ? `${l.maitsysAdjustmentPctApplied}%` : '—'}</td>}
                <td data-label="Final Amount" className="mv-num" style={{ fontWeight: 500 }}>{formatCurrency(l.finalLineAmount)}</td>
                {invoice.columns.map((c) => <td key={c.id} data-label={c.label}>{l.extra[c.id] || '—'}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {invoice.status === 'Paid' && invoice.paymentReference && (
        <p className="mv-muted" style={{ marginTop: '1rem', fontSize: '0.75rem' }}>Paid via {invoice.paymentMethod} · Reference {invoice.paymentReference}</p>
      )}
    </section>
  );
}
