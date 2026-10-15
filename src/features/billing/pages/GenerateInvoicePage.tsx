import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBilling } from '../model/BillingContext';
import { buildInvoice, dueDateFor, formatCurrency, formatDate, recomputeInvoiceTotals, synthesizeSentEmail } from '../../../shared/domain/billing/billingDerivations';
import { LineItemsEditor } from '../components/LineItemsEditor';
import { CustomFieldsEditor } from '../components/CustomFieldsEditor';
import { InvoicePreview, type InvoicePreviewProps } from '../components/InvoicePreview';
import { SendInvoiceConfirmModal } from '../components/SendInvoiceConfirmModal';
import { SentEmailModal } from '../components/SentEmailModal';
import { Select } from '../../../shared/ui/Select';
import { cssVars } from '../../../shared/lib/cssVars';
import type { CustomField, InvoiceColumn, InvoiceLine } from '../../../shared/domain/billing/billingTypes';
import type { SentEmail } from '../../../shared/domain/billing/billingTypes';
import { PageHeader } from '../../../shared/ui/PageHeader';

/**
 * Mounts the shared invoice-builder engine with the FULL prop set (customer
 * discount, payment-term-driven due date, custom columns AND custom fields
 * together) — the former standalone /invoice-builder page mounted the same three
 * components with the minimal set instead. A single continuous form, not a
 * wizard, matching the reference: the dropzone-based "upload a source
 * invoice to seed line items" step is consolidated into "Add Row" here
 * (start from scratch) rather than a separate modal + navigate-with-state
 * hop for equivalent functionality.
 */
export function GenerateInvoicePage() {
  const { customers, terms, invoices, addInvoice } = useBilling();
  const navigate = useNavigate();

  const activeCustomers = customers.filter((c) => c.active);
  const [customerId, setCustomerId] = useState(activeCustomers[0]?.id ?? '');
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [serialNumber, setSerialNumber] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [paymentTermId, setPaymentTermId] = useState(terms[0]?.id ?? '');
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [columns, setColumns] = useState<InvoiceColumn[]>([]);
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [overallAdjustmentPct, setOverallAdjustmentPct] = useState(0);
  const [taxPct, setTaxPct] = useState(8);
  const [showPreview, setShowPreview] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentEmail, setSentEmail] = useState<SentEmail | null>(null);
  const [createdInvoiceId, setCreatedInvoiceId] = useState<string | null>(null);

  const customer = customers.find((c) => c.id === customerId);
  const term = terms.find((t) => t.id === paymentTermId);
  const totals = recomputeInvoiceTotals(lines, taxPct, overallAdjustmentPct);
  const dueDate = invoiceDate ? dueDateFor(new Date(invoiceDate).toISOString(), term) : null;

  const previewProps: InvoicePreviewProps = useMemo(() => ({
    invoiceNumber: `INV-${new Date(invoiceDate || Date.now()).getFullYear()}-${String(invoices.length + 1).padStart(4, '0')}`,
    invoiceDate: invoiceDate ? new Date(invoiceDate).toISOString() : new Date().toISOString(),
    dueDate,
    serialNumber: serialNumber || null,
    poNumber: poNumber || null,
    paymentTermName: term ? `${term.days} days` : null,
    billTo: { name: customer?.name ?? 'Customer', address: customer?.billingAddress ?? '' },
    shipTo: customer && customer.shippingAddress !== customer.billingAddress ? { name: customer.name, address: customer.shippingAddress } : null,
    customFields,
    columns,
    lines,
    overallAdjustmentPct,
    taxPct,
  }), [invoiceDate, invoices.length, dueDate, serialNumber, poNumber, term, customer, customFields, columns, lines, overallAdjustmentPct, taxPct]);

  const canSend = Boolean(customer) && lines.length > 0;

  const handleConfirmSend = () => {
    if (!customer) return;
    setSending(true);
    window.setTimeout(() => {
      const invoice = buildInvoice({
        customerId: customer.id,
        invoiceDate: new Date(invoiceDate).toISOString(),
        serialNumber: serialNumber || null,
        poNumber: poNumber || null,
        paymentTerm: term,
        customFields,
        columns,
        lines,
        overallAdjustmentPct,
        taxPct,
        sequence: invoices.length + 1,
      });
      addInvoice(invoice);
      const email = synthesizeSentEmail(invoice, customer.primaryContactEmail, customer.name);
      setCreatedInvoiceId(invoice.id);
      setSentEmail(email);
      setConfirming(false);
      setSending(false);
    }, 900);
  };

  return (
    <div>
      <PageHeader title="New Invoice" subtitle="Build a customer invoice and send it — Maitsys tracks payment status until it's paid.">
        <button className="mv-secondary-button" onClick={() => setShowPreview((v) => !v)}>{showPreview ? 'Hide Preview' : 'Show Preview'}</button>
      </PageHeader>

      <div className="mv-split-panel" style={cssVars({ '--mv-cols': showPreview ? '1fr 1fr' : '1fr' })}>
        <section className="mv-panel">
          <div className="mv-panel-header"><h2 className="mv-panel-title">Invoice Details</h2></div>
          <Select
            label="Customer"
            style={{ height: '2.75rem' }}
            value={customerId}
            onChange={setCustomerId}
            options={activeCustomers.map((c) => ({ value: c.id, label: `${c.name}${c.discountPct > 0 ? ` (${c.discountPct}% discount)` : ''}` }))}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(8.75rem, 1fr))', gap: '1rem' }}>
            <label className="mv-field">Invoice Date<input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} /></label>
            <label className="mv-field">Serial Number<input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} /></label>
            <label className="mv-field">PO Number<input value={poNumber} onChange={(e) => setPoNumber(e.target.value)} /></label>
          </div>
          <Select
            label="Payment Term"
            style={{ height: '2.75rem' }}
            value={paymentTermId}
            onChange={setPaymentTermId}
            options={terms.map((t) => ({ value: t.id, label: t.name }))}
            helpText={dueDate ? `Due ${formatDate(dueDate)}` : undefined}
          />

          <CustomFieldsEditor fields={customFields} onChange={setCustomFields} />
          <LineItemsEditor
            lines={lines}
            columns={columns}
            onChange={(l, c) => { setLines(l); setColumns(c); }}
            discountAvailable
            customerDiscountPct={customer?.discountPct ?? 0}
            billingPeriodAvailable
          />

          <div className="mv-panel" style={{ background: 'var(--mv-surface-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}><span className="mv-muted">Line Items Subtotal</span><strong>{formatCurrency(totals.lineSubtotal)}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span className="mv-muted">Summary Adjustment %</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input className="mv-select" type="number" step="0.1" style={{ width: '5rem', textAlign: 'right' }} value={overallAdjustmentPct} onChange={(e) => setOverallAdjustmentPct(Number(e.target.value))} />
                <strong>{formatCurrency(totals.overallAdjustmentAmount)}</strong>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span className="mv-muted">Tax %</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input className="mv-select" type="number" min={0} step="0.1" style={{ width: '5rem', textAlign: 'right' }} value={taxPct} onChange={(e) => setTaxPct(Number(e.target.value))} />
                <strong>{formatCurrency(totals.tax)}</strong>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid var(--mv-divider)' }}><strong>Total Due</strong><strong style={{ fontSize: '1rem' }}>{formatCurrency(totals.totalDue)}</strong></div>
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="mv-primary-button" disabled={!canSend} onClick={() => setConfirming(true)}>Send Invoice</button>
          </div>
        </section>

        {showPreview && (
          <div className="mv-print-area">
            <InvoicePreview {...previewProps} />
          </div>
        )}
      </div>

      {confirming && <SendInvoiceConfirmModal previewProps={previewProps} sending={sending} onCancel={() => setConfirming(false)} onConfirm={handleConfirmSend} />}
      {sentEmail && (
        <SentEmailModal
          email={sentEmail}
          onClose={() => {
            const invoiceId = createdInvoiceId;
            setSentEmail(null);
            navigate('/admin/billing', { state: invoiceId ? { selectedInvoiceId: invoiceId } : undefined });
          }}
        />
      )}
    </div>
  );
}
