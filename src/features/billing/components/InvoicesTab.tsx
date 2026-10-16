import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Customer, Invoice, InvoiceStatus } from '../../../shared/domain/billing/billingTypes';
import { formatCurrency } from '../../../shared/domain/billing/billingDerivations';
import { CustomerInvoiceDetail, StatusPill } from './CustomerInvoiceDetail';
import { InvoiceDocument } from './InvoiceDocument';
import { FileTextIcon } from '../../../shared/ui/icons';
import { Select } from '../../../shared/ui/Select';
import { cssVars } from '../../../shared/lib/cssVars';

function shortDate(value: string): string {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_FILTERS: Array<InvoiceStatus | 'all'> = ['all', 'Sent', 'Paid', 'Overdue'];

interface InvoicesTabProps {
  invoices: Invoice[];
  customers: Customer[];
}

/** Finance's cross-customer, view-only invoice list — master-detail, no
 * actions besides viewing (no approve/edit/delete/pay; Pay Now is
 * customer-only, via CustomerBillingView). */
export function InvoicesTab({ invoices, customers }: InvoicesTabProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showDocument, setShowDocument] = useState(false);

  useEffect(() => {
    const state = location.state as { selectedInvoiceId?: string } | null;
    if (state?.selectedInvoiceId) {
      setSelectedId(state.selectedInvoiceId);
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? 'Unknown';

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return invoices
      .filter((inv) => statusFilter === 'all' || inv.status === statusFilter)
      .filter((inv) => customerFilter === 'all' || inv.customerId === customerFilter)
      .filter((inv) => !term || inv.invoiceNumber.toLowerCase().includes(term) || customerName(inv.customerId).toLowerCase().includes(term))
      .sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices, search, statusFilter, customerFilter]);

  const selected = invoices.find((inv) => inv.id === selectedId) ?? null;
  const selectedCustomer = selected ? customers.find((c) => c.id === selected.customerId) : undefined;

  return (
    <div className="mv-split-panel" style={cssVars({ '--mv-cols': 'minmax(0, 1.1fr) minmax(0, 1fr)' })}>
      <section className="mv-panel">
        <div className="mv-panel-header"><h2 className="mv-panel-title" style={{ fontSize: '0.9375rem' }}>Invoices</h2><span className="mv-status mv-status--neutral">{filtered.length}</span></div>
        <label className="mv-field">Search<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Invoice # or customer name" /></label>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.875rem' }}>
          <Select
            label="Status"
            hideLabel
            className="mv-field--flex"
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_FILTERS.map((s) => ({ value: s, label: s === 'all' ? 'All Statuses' : s }))}
          />
          <Select
            label="Customer"
            hideLabel
            className="mv-field--flex"
            value={customerFilter}
            onChange={setCustomerFilter}
            options={[{ value: 'all', label: 'All Customers' }, ...customers.map((c) => ({ value: c.id, label: c.name }))]}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="mv-empty" style={{ margin: 0 }}>
            <div className="mv-empty-icon" aria-hidden><FileTextIcon size={28} /></div>
            <h2>No invoices found</h2>
            <p>No invoices match your filters.</p>
          </div>
        ) : (
          <div className="mv-table-wrap">
            <table className="mv-table">
              <thead><tr><th>Invoice #</th><th>Customer</th><th className="mv-nowrap">Invoice date</th><th className="mv-nowrap">Due date</th><th>Status</th><th className="mv-num">Total</th></tr></thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr key={inv.id} onClick={() => { setSelectedId(inv.id); setShowDocument(false); }} style={{ cursor: 'pointer', background: selectedId === inv.id ? 'var(--mv-selected)' : undefined }}>
                    <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{inv.invoiceNumber}</td>
                    <td>{customerName(inv.customerId)}{customers.find((c) => c.id === inv.customerId)?.discountPct ? <span className="mv-status mv-status--neutral" style={{ marginLeft: '0.375rem', fontSize: '0.625rem' }}>{customers.find((c) => c.id === inv.customerId)?.discountPct}%</span> : null}</td>
                    <td className="mv-muted mv-nowrap">{shortDate(inv.invoiceDate)}</td>
                    <td className="mv-muted mv-nowrap">{shortDate(inv.dueDate)}</td>
                    <td><StatusPill status={inv.status} /></td>
                    <td className="mv-num mv-nowrap" style={{ fontWeight: 500 }}>{formatCurrency(inv.totalDue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
            <button className="mv-secondary-button" onClick={() => setShowDocument((v) => !v)}>{showDocument ? 'View Summary' : 'View Invoice'}</button>
          </div>
          {showDocument ? <InvoiceDocument invoice={selected} customer={selectedCustomer} /> : <CustomerInvoiceDetail invoice={selected} customer={selectedCustomer} />}
        </div>
      ) : (
        <section className="mv-panel">
          <div className="mv-empty" style={{ margin: 0 }}>
            <div className="mv-empty-icon" aria-hidden><FileTextIcon size={28} /></div>
            <h2>Select an invoice</h2>
            <p>Choose a record from the list to see its full detail.</p>
          </div>
        </section>
      )}
    </div>
  );
}
