import { useParams } from 'react-router-dom';
import { useBilling } from '../model/BillingContext';
import { InvoiceDocument } from '../components/InvoiceDocument';
import { StatusPill } from '../components/CustomerInvoiceDetail';
import { formatCurrency, formatDate } from '../../../shared/domain/billing/billingDerivations';
import { CheckIcon, FileTextIcon } from '../../../shared/ui/icons';
import { cssVars } from '../../../shared/lib/cssVars';

/**
 * Fully public, unauthenticated — reached only via the token embedded in
 * the "sent" email link. Resolved only by `publicToken` (never `id`), so
 * incrementing/guessing an id can never expose another customer's invoice.
 * No login, no editing, no way to see other invoices — a customer can only
 * view the document and, if unpaid, pay it.
 */
export function PublicInvoicePage() {
  const { token } = useParams<{ token: string }>();
  const { invoices, customers, payInvoice } = useBilling();
  const invoice = invoices.find((inv) => inv.publicToken === token);
  const customer = invoice ? customers.find((c) => c.id === invoice.customerId) : undefined;

  if (!invoice) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--mv-surface-subtle)' }}>
        <div className="mv-empty">
          <div className="mv-empty-icon" aria-hidden><FileTextIcon size={28} /></div>
          <h2>Invoice not found</h2>
          <p>This link is invalid or the invoice has been removed.</p>
        </div>
      </div>
    );
  }

  const canPay = invoice.status === 'Sent' || invoice.status === 'Overdue';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--mv-surface-subtle)', padding: '32px 20px' }}>
      <div className="mv-split-panel" style={{ maxWidth: 1100, margin: '0 auto', ...cssVars({ '--mv-cols': '2fr 1fr' }) }}>
        <InvoiceDocument invoice={invoice} customer={customer} />
        <section className="mv-panel" style={{ position: 'sticky', top: 24 }}>
          <div className="mv-panel-header"><h2 className="mv-panel-title">Payment Summary</h2><StatusPill status={invoice.status} /></div>
          <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="mv-muted">Subtotal</span><span>{formatCurrency(invoice.lineSubtotal)}</span></div>
            {invoice.overallAdjustmentAmount !== 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="mv-muted">Summary Adjustment</span><span>{formatCurrency(invoice.overallAdjustmentAmount)}</span></div>}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="mv-muted">Tax</span><span>{formatCurrency(invoice.tax)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--mv-divider)' }}><strong>Total Due</strong><strong style={{ fontSize: 18 }}>{formatCurrency(invoice.totalDue)}</strong></div>
            <p className="mv-muted" style={{ fontSize: 12 }}>Due {formatDate(invoice.dueDate)}</p>
          </div>
          {invoice.status === 'Paid' ? (
            <div className="mv-notice" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><CheckIcon size={18} style={{ color: 'var(--mv-success)' }} /><strong>Paid — thank you!</strong></div>
          ) : canPay ? (
            <button className="mv-primary-button" style={{ width: '100%' }} onClick={() => payInvoice(invoice.id)}>Pay Now</button>
          ) : null}
        </section>
      </div>
    </div>
  );
}
