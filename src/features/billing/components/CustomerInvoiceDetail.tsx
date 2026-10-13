import type { Customer, Invoice } from '../../../shared/domain/billing/billingTypes';
import { formatCurrency, formatDate, STATUS_TONE } from '../../../shared/domain/billing/billingDerivations';
import { CheckIcon } from '../../../shared/ui/icons';

export function StatusPill({ status }: { status: Invoice['status'] }) {
  return <span className={`mv-status mv-status--${STATUS_TONE[status]}`}>{status}</span>;
}

function MetaChip({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--mv-surface-subtle)' }}>
      <p className="mv-muted" style={{ margin: 0, fontSize: 12, fontWeight: 500 }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 600 }}>{value}</p>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <article className="mv-kpi" style={{ minHeight: 'auto', padding: 14 }}>
      <span className="mv-kpi-label">{label}</span>
      <strong className="mv-kpi-value" style={{ fontSize: 18, marginTop: 8 }}>{value}</strong>
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
          <h2 className="mv-panel-title" style={{ marginTop: 6 }}>{invoice.invoiceNumber}</h2>
          <p className="mv-muted" style={{ margin: '2px 0 0', fontSize: 13 }}>{customer?.name ?? 'Unknown customer'}{customer && customer.discountPct > 0 ? ` · ${customer.discountPct}% standard discount` : ''}</p>
        </div>
        {canPay && <button className="mv-primary-button" onClick={() => onPay?.(invoice.id)}><CheckIcon size={16} style={{ marginRight: 6 }} />Pay Now</button>}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <MetaChip label="Invoice Date" value={formatDate(invoice.invoiceDate)} />
        <MetaChip label="Serial #" value={invoice.serialNumber} />
        <MetaChip label="PO #" value={invoice.poNumber} />
        <MetaChip label="Payment Term" value={invoice.paymentTermName} />
        <MetaChip label="Due" value={formatDate(invoice.dueDate)} />
        <MetaChip label="Published" value={formatDate(invoice.publishedDate)} />
        {invoice.paidDate && <MetaChip label="Paid" value={formatDate(invoice.paidDate)} />}
        {invoice.customFields.filter((f) => f.label).map((f) => <MetaChip key={f.id} label={f.label} value={f.value} />)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
        <Kpi label="Line Items Subtotal" value={formatCurrency(invoice.lineSubtotal)} />
        <Kpi label={`Summary Adjustment${invoice.overallAdjustmentPct ? ` (${invoice.overallAdjustmentPct}%)` : ''}`} value={formatCurrency(invoice.overallAdjustmentAmount)} />
        <Kpi label={`Tax (${invoice.taxPct}%)`} value={formatCurrency(invoice.tax)} />
        <Kpi label="Total Due" value={formatCurrency(invoice.totalDue)} />
      </div>

      <div className="mv-table-wrap">
        <table className="mv-table">
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
                <td>{l.description || '—'}</td>
                <td className="mv-num">{formatCurrency(l.vendorLineTotal)}</td>
                {showDiscountCol && <td className="mv-num">{l.discountPctApplied > 0 ? `${l.discountPctApplied}%` : '—'}</td>}
                <td className="mv-num">{formatCurrency(l.netAmountAfterDiscount)}</td>
                {showAdjustmentCol && <td className="mv-num">{l.maitsysAdjustmentPctApplied > 0 ? `${l.maitsysAdjustmentPctApplied}%` : '—'}</td>}
                <td className="mv-num" style={{ fontWeight: 600 }}>{formatCurrency(l.finalLineAmount)}</td>
                {invoice.columns.map((c) => <td key={c.id}>{l.extra[c.id] || '—'}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {invoice.status === 'Paid' && invoice.paymentReference && (
        <p className="mv-muted" style={{ marginTop: 16, fontSize: 12 }}>Paid via {invoice.paymentMethod} · Reference {invoice.paymentReference}</p>
      )}
    </section>
  );
}
