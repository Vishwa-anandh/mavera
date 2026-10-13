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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <strong style={{ fontSize: 20, fontFamily: 'var(--mv-font-heading)' }}>Maitsys</strong>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#666' }}>AI Cloud Intelligence Platform</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h2 style={{ margin: 0, fontSize: 26, letterSpacing: '.04em' }}>INVOICE</h2>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#666' }}>{invoiceNumber}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: showShipTo ? 'repeat(auto-fit, minmax(200px, 1fr))' : '1fr', gap: 16, marginBottom: 20 }}>
        <div>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#999', letterSpacing: '.04em' }}>BILL TO</p>
          <p style={{ margin: '4px 0 0', fontWeight: 600 }}>{billTo.name}</p>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#444', whiteSpace: 'pre-line' }}>{billTo.address}</p>
        </div>
        {showShipTo && (
          <div>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#999', letterSpacing: '.04em' }}>SHIP TO</p>
            <p style={{ margin: '4px 0 0', fontWeight: 600 }}>{shipTo!.name}</p>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: '#444', whiteSpace: 'pre-line' }}>{shipTo!.address}</p>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 20, padding: 14, borderRadius: 10, background: '#f7f8fa' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, flex: 1 }}>
          <div><p style={{ margin: 0, fontSize: 10, color: '#999' }}>INVOICE DATE</p><p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 600 }}>{formatDate(invoiceDate)}</p></div>
          {serialNumber && <div><p style={{ margin: 0, fontSize: 10, color: '#999' }}>SERIAL #</p><p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 600 }}>{serialNumber}</p></div>}
          {poNumber && <div><p style={{ margin: 0, fontSize: 10, color: '#999' }}>PO #</p><p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 600 }}>{poNumber}</p></div>}
          {paymentTermName && <div><p style={{ margin: 0, fontSize: 10, color: '#999' }}>PAYMENT TERM</p><p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 600 }}>{paymentTermName}</p></div>}
          {customFields.filter((f) => f.label).map((f) => (
            <div key={f.id}><p style={{ margin: 0, fontSize: 10, color: '#999' }}>{f.label.toUpperCase()}</p><p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 600 }}>{f.value}</p></div>
          ))}
        </div>
        <div style={{ textAlign: 'right', flex: 'none' }}>
          <p style={{ margin: 0, fontSize: 10, color: '#999' }}>TOTAL DUE</p>
          <strong style={{ fontSize: 22 }}>{formatCurrency(totals.totalDue)}</strong>
          {dueDate && <p style={{ margin: '2px 0 0', fontSize: 11, color: '#999' }}>Due {formatDate(dueDate)}</p>}
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e2e2e2', textAlign: 'left' }}>
            <th style={{ padding: '6px 8px' }}>Description</th>
            <th style={{ padding: '6px 8px', textAlign: 'right' }}>Qty</th>
            <th style={{ padding: '6px 8px', textAlign: 'right' }}>Unit Price</th>
            {showDiscountColumn && <th style={{ padding: '6px 8px', textAlign: 'right' }}>Discount %</th>}
            {showBillingPeriod && <th style={{ padding: '6px 8px' }}>Billing Period</th>}
            {columns.map((c) => <th key={c.id} style={{ padding: '6px 8px' }}>{c.label}</th>)}
            <th style={{ padding: '6px 8px', textAlign: 'right' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={{ padding: '6px 8px' }}>{line.description || '—'}</td>
              <td style={{ padding: '6px 8px', textAlign: 'right' }}>{line.quantity}</td>
              <td style={{ padding: '6px 8px', textAlign: 'right' }}>{formatCurrency(line.vendorUnitPrice)}</td>
              {showDiscountColumn && <td style={{ padding: '6px 8px', textAlign: 'right' }}>{line.discountPctApplied > 0 ? `${line.discountPctApplied}%` : '—'}</td>}
              {showBillingPeriod && <td style={{ padding: '6px 8px' }}>{line.billingPeriodStart || line.billingPeriodEnd ? `${formatDate(line.billingPeriodStart)} – ${formatDate(line.billingPeriodEnd)}` : '—'}</td>}
              {columns.map((c) => <td key={c.id} style={{ padding: '6px 8px' }}>{line.extra[c.id] || '—'}</td>)}
              <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(line.finalLineAmount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: 260, display: 'grid', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>Subtotal</span><span>{formatCurrency(totals.lineSubtotal)}</span></div>
          {totals.overallAdjustmentAmount !== 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>Summary Adjustment ({overallAdjustmentPct}%)</span><span>{formatCurrency(totals.overallAdjustmentAmount)}</span></div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>Tax ({taxPct}%)</span><span>{formatCurrency(totals.tax)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, borderTop: '2px solid #e2e2e2', paddingTop: 6, marginTop: 4 }}><span>Total Due</span><span>{formatCurrency(totals.totalDue)}</span></div>
        </div>
      </div>

      {notes && (
        <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid #f0f0f0' }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#999' }}>NOTES</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#444' }}>{notes}</p>
        </div>
      )}
    </div>
  );
}
