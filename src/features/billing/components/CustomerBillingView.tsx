import { useState } from 'react';
import type { Customer, Invoice } from '../../../shared/domain/billing/billingTypes';
import { formatCurrency, formatDate } from '../../../shared/domain/billing/billingDerivations';
import { CustomerInvoiceDetail, StatusPill } from './CustomerInvoiceDetail';
import { CheckIcon, FileTextIcon } from '../../../shared/ui/icons';
import { cssVars } from '../../../shared/lib/cssVars';

/** A defensive allowlist, kept even though every invoice in this build is
 * already one of these three statuses (there's no Draft/Approved/Pending
 * state) — matches the reference's own VISIBLE_STATUSES. */
const VISIBLE_STATUSES: Invoice['status'][] = ['Sent', 'Paid', 'Overdue'];

const isUnpaid = (invoice: Invoice) => invoice.status === 'Sent' || invoice.status === 'Overdue';

interface CustomerBillingViewProps {
  invoices: Invoice[];
  customer: Customer | undefined;
  onPay: (invoiceId: string) => void;
}

/**
 * The organisation's own invoices, newest first, with Pay Now for anything unpaid: on the invoice's row in the list
 * and in its detail. The first unpaid invoice is open when the page loads, so paying it is one click.
 */
export function CustomerBillingView({ invoices, customer, onPay }: CustomerBillingViewProps) {
  const visible = invoices.filter((inv) => VISIBLE_STATUSES.includes(inv.status)).sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = visible.find((inv) => inv.id === selectedId) ?? visible.find(isUnpaid) ?? visible[0] ?? null;

  // Paying from the list keeps that invoice open, so the "Paid" confirmation is what you see next.
  const pay = (invoiceId: string) => {
    setSelectedId(invoiceId);
    onPay(invoiceId);
  };

  if (!customer) {
    return <div className="mv-empty"><div className="mv-empty-icon" aria-hidden><FileTextIcon size={28} /></div><h2>No billing record found</h2><p>Contact Maitsys if you believe this is an error.</p></div>;
  }

  return (
    <div className="mv-split-panel" style={cssVars({ '--mv-cols': '2fr 3fr' })}>
      <section className="mv-panel">
        <div className="mv-panel-header"><h2 className="mv-panel-title" style={{ fontSize: '0.9375rem' }}>Your Invoices</h2><span className="mv-status mv-status--neutral">{visible.length}</span></div>
        {visible.length === 0 ? (
          <div className="mv-empty" style={{ margin: 0 }}>
            <div className="mv-empty-icon" aria-hidden><FileTextIcon size={28} /></div>
            <h2>No invoices yet</h2>
            <p>Invoices from Maitsys will appear here.</p>
          </div>
        ) : (
          <ul className="mv-invoice-list" aria-label="Your invoices">
            {visible.map((inv) => {
              const active = selected?.id === inv.id;
              return (
                <li key={inv.id} className={`mv-invoice-row${active ? ' is-active' : ''}`}>
                  <button type="button" className="mv-invoice-row-main" aria-pressed={active} onClick={() => setSelectedId(inv.id)}>
                    <span className="mv-invoice-row-title">
                      <strong>{inv.invoiceNumber}</strong>
                      <span className="mv-muted">{formatDate(inv.invoiceDate)} · Due {formatDate(inv.dueDate)}</span>
                    </span>
                    <span className="mv-invoice-row-amount">
                      <strong>{formatCurrency(inv.totalDue)}</strong>
                      <StatusPill status={inv.status} />
                    </span>
                  </button>
                  {isUnpaid(inv) && (
                    <button type="button" className="mv-primary-button mv-invoice-row-pay" aria-label={`Pay Now: ${inv.invoiceNumber}`} onClick={() => pay(inv.id)}>
                      <CheckIcon size={16} style={{ marginRight: '0.375rem' }} />Pay Now
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {selected ? <CustomerInvoiceDetail invoice={selected} customer={customer} allowPayment onPay={pay} /> : (
        <section className="mv-panel"><div className="mv-empty" style={{ margin: 0 }}><h2>Select an invoice</h2><p>Choose a record from the list to see its full detail.</p></div></section>
      )}
    </div>
  );
}
