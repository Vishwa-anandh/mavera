import { useState } from 'react';
import type { Customer, Invoice } from '../../../shared/domain/billing/billingTypes';
import { formatCurrency, formatDate } from '../../../shared/domain/billing/billingDerivations';
import { CustomerInvoiceDetail, StatusPill } from './CustomerInvoiceDetail';
import { FileTextIcon } from '../../../shared/ui/icons';
import { cssVars } from '../../../shared/lib/cssVars';

/** A defensive allowlist, kept even though every invoice in this build is
 * already one of these three statuses (there's no Draft/Approved/Pending
 * state) — matches the reference's own VISIBLE_STATUSES. */
const VISIBLE_STATUSES: Invoice['status'][] = ['Sent', 'Paid', 'Overdue'];

interface CustomerBillingViewProps {
  invoices: Invoice[];
  customer: Customer | undefined;
  onPay: (invoiceId: string) => void;
}

/** The non-privileged member's version of InvoicesTab — a read-only history
 * of their own organisation's invoices, with Pay Now for anything unpaid. */
export function CustomerBillingView({ invoices, customer, onPay }: CustomerBillingViewProps) {
  const visible = invoices.filter((inv) => VISIBLE_STATUSES.includes(inv.status)).sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
  const [selectedId, setSelectedId] = useState<string | null>(visible[0]?.id ?? null);
  const selected = visible.find((inv) => inv.id === selectedId) ?? null;

  if (!customer) {
    return <div className="mv-empty"><div className="mv-empty-icon" aria-hidden><FileTextIcon size={28} /></div><h2>No billing record found</h2><p>Contact Maitsys if you believe this is an error.</p></div>;
  }

  return (
    <div className="mv-split-panel" style={cssVars({ '--mv-cols': '2fr 3fr' })}>
      <section className="mv-panel">
        <div className="mv-panel-header"><h2 className="mv-panel-title" style={{ fontSize: 15 }}>Your Invoices</h2><span className="mv-status mv-status--neutral">{visible.length}</span></div>
        {visible.length === 0 ? (
          <div className="mv-empty" style={{ margin: 0 }}>
            <div className="mv-empty-icon" aria-hidden><FileTextIcon size={28} /></div>
            <h2>No invoices yet</h2>
            <p>Invoices from Maitsys will appear here.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {visible.map((inv) => (
              <button
                key={inv.id}
                onClick={() => setSelectedId(inv.id)}
                style={{ textAlign: 'left', border: `1px solid ${selectedId === inv.id ? 'var(--mv-primary)' : 'var(--mv-border)'}`, borderRadius: 10, padding: 12, background: selectedId === inv.id ? 'var(--mv-selected)' : 'transparent', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <strong style={{ fontSize: 13 }}>{inv.invoiceNumber}</strong>
                    <p className="mv-muted" style={{ margin: '3px 0 0', fontSize: 11 }}>{formatDate(inv.invoiceDate)} · Due {formatDate(inv.dueDate)}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <strong style={{ fontSize: 14 }}>{formatCurrency(inv.totalDue)}</strong>
                    <div style={{ marginTop: 4 }}><StatusPill status={inv.status} /></div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {selected ? <CustomerInvoiceDetail invoice={selected} customer={customer} allowPayment onPay={onPay} /> : (
        <section className="mv-panel"><div className="mv-empty" style={{ margin: 0 }}><h2>Select an invoice</h2><p>Choose a record from the list to see its full detail.</p></div></section>
      )}
    </div>
  );
}
