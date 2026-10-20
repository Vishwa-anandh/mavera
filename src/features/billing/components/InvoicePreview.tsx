import type { CustomField, InvoiceColumn, InvoiceLine } from '../../../shared/domain/billing/billingTypes';
import { calcInvoiceTotals } from '../../../shared/domain/billing/billingPricing';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export interface InvoicePreviewProps {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string | null;
  serialNumber?: string | null;
  poNumber?: string | null;
  paymentTermName?: string | null;
  billTo: { name: string; address: string };
  shipTo?: { name: string; address: string } | null;
  customFields: CustomField[];
  columns: InvoiceColumn[];
  lines: InvoiceLine[];
  overallAdjustmentPct: number;
  taxPct: number;
  notes?: string;
}

/**
 * The single source of visual truth for a Maitsys invoice — whatever
 * renders here is what a PDF export would capture. Always computes totals
 * via billingPricing.ts, never its own inline math (see the header comment
 * on that file for why that matters). Sender identity is a fixed Maitsys
 * brand mark — the reference exposed a logo/template picker that had no UI
 * control left pointing at it; Mavera doesn't reintroduce that choice.
 */
export function InvoicePreview({ invoiceNumber, invoiceDate, dueDate, serialNumber, poNumber, paymentTermName, billTo, shipTo, customFields, columns, lines, overallAdjustmentPct, taxPct, notes }: InvoicePreviewProps) {
  const totals = calcInvoiceTotals(lines.map((l) => l.finalLineAmount), taxPct, overallAdjustmentPct);
  const showDiscountColumn = lines.some((l) => l.discountPctApplied > 0);
  const showBillingPeriod = lines.some((l) => l.billingPeriodStart || l.billingPeriodEnd);
  const showShipTo = shipTo && shipTo.address.trim() !== billTo.address.trim();

  return (
    <div className="mv-panel" style={{ background: '#fff', color: '#1a1a1a' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <strong style={{ fontSize: '1.25rem', fontFamily: 'var(--mv-font-heading)' }}>Maitsys</strong>
          <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#666' }}>AI Cloud Intelligence Platform</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h2 style={{ margin: 0, fontSize: '1.625rem', letterSpacing: '.04em' }}>Invoice</h2>
          <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: '#666' }}>{invoiceNumber}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: showShipTo ? 'repeat(auto-fit, minmax(12.5rem, 1fr))' : '1fr', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.625rem', fontWeight: 500, color: '#999', letterSpacing: '.04em' }}>Bill to</p>
          <p style={{ margin: '0.25rem 0 0', fontWeight: 500 }}>{billTo.name}</p>
          <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: '#444', whiteSpace: 'pre-line' }}>{billTo.address}</p>
        </div>
        {showShipTo && (
          <div>
            <p style={{ margin: 0, fontSize: '0.625rem', fontWeight: 500, color: '#999', letterSpacing: '.04em' }}>Ship to</p>
            <p style={{ margin: '0.25rem 0 0', fontWeight: 500 }}>{shipTo!.name}</p>
            <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: '#444', whiteSpace: 'pre-line' }}>{shipTo!.address}</p>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem', padding: '0.875rem', borderRadius: '0.625rem', background: '#f7f8fa' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(7.5rem, 1fr))', gap: '0.75rem', flex: 1 }}>
          <div><p style={{ margin: 0, fontSize: '0.625rem', color: '#999' }}>Invoice date</p><p style={{ margin: '2px 0 0', fontSize: '0.8125rem', fontWeight: 500 }}>{formatDate(invoiceDate)}</p></div>
          {serialNumber && <div><p style={{ margin: 0, fontSize: '0.625rem', color: '#999' }}>SERIAL #</p><p style={{ margin: '2px 0 0', fontSize: '0.8125rem', fontWeight: 500 }}>{serialNumber}</p></div>}
          {poNumber && <div><p style={{ margin: 0, fontSize: '0.625rem', color: '#999' }}>PO #</p><p style={{ margin: '2px 0 0', fontSize: '0.8125rem', fontWeight: 500 }}>{poNumber}</p></div>}
          {paymentTermName && <div><p style={{ margin: 0, fontSize: '0.625rem', color: '#999' }}>Payment term</p><p style={{ margin: '2px 0 0', fontSize: '0.8125rem', fontWeight: 500 }}>{paymentTermName}</p></div>}
          {customFields.filter((f) => f.label).map((f) => (
            <div key={f.id}><p style={{ margin: 0, fontSize: '0.625rem', color: '#999' }}>{f.label.toUpperCase()}</p><p style={{ margin: '2px 0 0', fontSize: '0.8125rem', fontWeight: 500 }}>{f.value}</p></div>
          ))}
        </div>
        <div style={{ textAlign: 'right', flex: 'none' }}>
          <p style={{ margin: 0, fontSize: '0.625rem', color: '#999' }}>Total due</p>
          <strong style={{ fontSize: '1.375rem' }}>{formatCurrency(totals.totalDue)}</strong>
          {dueDate && <p style={{ margin: '2px 0 0', fontSize: '0.6875rem', color: '#999' }}>Due {formatDate(dueDate)}</p>}
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.25rem', fontSize: '0.8125rem' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e2e2e2', textAlign: 'left' }}>
            <th style={{ padding: '0.375rem 0.5rem' }}>Description</th>
            <th style={{ padding: '0.375rem 0.5rem', textAlign: 'right' }}>Qty</th>
            <th style={{ padding: '0.375rem 0.5rem', textAlign: 'right' }}>Unit Price</th>
            {showDiscountColumn && <th style={{ padding: '0.375rem 0.5rem', textAlign: 'right' }}>Discount %</th>}
            {showBillingPeriod && <th style={{ padding: '0.375rem 0.5rem' }}>Billing Period</th>}
            {columns.map((c) => <th key={c.id} style={{ padding: '0.375rem 0.5rem' }}>{c.label}</th>)}
            <th style={{ padding: '0.375rem 0.5rem', textAlign: 'right' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={{ padding: '0.375rem 0.5rem' }}>{line.description || '—'}</td>
              <td style={{ padding: '0.375rem 0.5rem', textAlign: 'right' }}>{line.quantity}</td>
              <td style={{ padding: '0.375rem 0.5rem', textAlign: 'right' }}>{formatCurrency(line.vendorUnitPrice)}</td>
              {showDiscountColumn && <td style={{ padding: '0.375rem 0.5rem', textAlign: 'right' }}>{line.discountPctApplied > 0 ? `${line.discountPctApplied}%` : '—'}</td>}
              {showBillingPeriod && <td style={{ padding: '0.375rem 0.5rem' }}>{line.billingPeriodStart || line.billingPeriodEnd ? `${formatDate(line.billingPeriodStart)} – ${formatDate(line.billingPeriodEnd)}` : '—'}</td>}
              {columns.map((c) => <td key={c.id} style={{ padding: '0.375rem 0.5rem' }}>{line.extra[c.id] || '—'}</td>)}
              <td style={{ padding: '0.375rem 0.5rem', textAlign: 'right', fontWeight: 500 }}>{formatCurrency(line.finalLineAmount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: '16.25rem', display: 'grid', gap: '0.375rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}><span>Subtotal</span><span>{formatCurrency(totals.lineSubtotal)}</span></div>
          {totals.overallAdjustmentAmount !== 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}><span>Summary Adjustment ({overallAdjustmentPct}%)</span><span>{formatCurrency(totals.overallAdjustmentAmount)}</span></div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}><span>Tax ({taxPct}%)</span><span>{formatCurrency(totals.tax)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9375rem', fontWeight: 500, borderTop: '2px solid #e2e2e2', paddingTop: '0.375rem', marginTop: '0.25rem' }}><span>Total Due</span><span>{formatCurrency(totals.totalDue)}</span></div>
        </div>
      </div>

      {notes && (
        <div style={{ marginTop: '1.25rem', paddingTop: '0.875rem', borderTop: '1px solid #f0f0f0' }}>
          <p style={{ margin: 0, fontSize: '0.625rem', fontWeight: 500, color: '#999' }}>Notes</p>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#444' }}>{notes}</p>
        </div>
      )}
    </div>
  );
}
