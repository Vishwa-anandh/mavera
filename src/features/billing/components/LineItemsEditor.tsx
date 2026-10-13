import type { InvoiceColumn, InvoiceLine } from '../../../shared/domain/billing/billingTypes';
import { calcLine } from '../../../shared/domain/billing/billingPricing';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, TrashIcon } from '../../../shared/ui/icons';

let nextLineId = 1;
let nextColumnId = 1;

function blankLine(lineNumber: number): InvoiceLine {
  const calc = calcLine({ quantity: 1, vendorUnitPrice: 0, discountPct: 0, adjustmentPct: 0 });
  return { id: `line-${nextLineId++}`, lineNumber, description: '', quantity: 1, vendorUnitPrice: 0, extra: {}, ...calc };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

interface LineItemsEditorProps {
  lines: InvoiceLine[];
  columns: InvoiceColumn[];
  onChange: (lines: InvoiceLine[], columns: InvoiceColumn[]) => void;
  /** Shows the Discount % column at all — only meaningful when a customer
   * (and its flat discount rate) has been selected. */
  discountAvailable?: boolean;
  /** The single flat rate applied when a row's discount checkbox is
   * checked — matches the reference: discount is a boolean toggle bound to
   * the customer's own rate, not a free-text per-line percentage. */
  customerDiscountPct?: number;
  billingPeriodAvailable?: boolean;
}

/**
 * Dynamic rows+columns line-item editor, shared by Billing's generate flow
 * and the standalone Invoice Builder. Every edit recomputes that row's
 * pricing via billingPricing.ts's calcLine — Amount is always computed,
 * never typed directly.
 */
export function LineItemsEditor({ lines, columns, onChange, discountAvailable = false, customerDiscountPct = 0, billingPeriodAvailable = false }: LineItemsEditorProps) {
  const recalc = (line: InvoiceLine, patch: Partial<Pick<InvoiceLine, 'quantity' | 'vendorUnitPrice' | 'discountPctApplied'>>): InvoiceLine => {
    const quantity = patch.quantity ?? line.quantity;
    const vendorUnitPrice = patch.vendorUnitPrice ?? line.vendorUnitPrice;
    const discountPct = patch.discountPctApplied ?? line.discountPctApplied;
    const calc = calcLine({ quantity, vendorUnitPrice, discountPct, adjustmentPct: line.maitsysAdjustmentPctApplied });
    return { ...line, quantity, vendorUnitPrice, ...calc };
  };

  const updateLine = (id: string, patch: Partial<Pick<InvoiceLine, 'quantity' | 'vendorUnitPrice' | 'discountPctApplied' | 'description' | 'billingPeriodStart' | 'billingPeriodEnd'>>) => {
    onChange(lines.map((line) => (line.id === id ? ('description' in patch || 'billingPeriodStart' in patch || 'billingPeriodEnd' in patch ? { ...line, ...patch } : recalc(line, patch)) : line)), columns);
  };

  const updateExtra = (id: string, columnId: string, value: string) =>
    onChange(lines.map((line) => (line.id === id ? { ...line, extra: { ...line.extra, [columnId]: value } } : line)), columns);

  const addLine = () => onChange([...lines, blankLine(lines.length + 1)], columns);
  const removeLine = (id: string) => onChange(lines.filter((l) => l.id !== id).map((l, i) => ({ ...l, lineNumber: i + 1 })), columns);

  const toggleDiscount = (id: string, checked: boolean) => updateLine(id, { discountPctApplied: checked ? customerDiscountPct : 0 });
  const allDiscounted = discountAvailable && lines.length > 0 && lines.every((l) => l.discountPctApplied > 0);
  const toggleAllDiscount = () => onChange(lines.map((line) => recalc(line, { discountPctApplied: allDiscounted ? 0 : customerDiscountPct })), columns);

  const addColumn = () => {
    const label = window.prompt('Column label (e.g. Subscription ID)');
    if (!label) return;
    const column: InvoiceColumn = { id: `col-${nextColumnId++}`, label };
    onChange(lines.map((l) => ({ ...l, extra: { ...l.extra, [column.id]: '' } })), [...columns, column]);
  };
  const removeColumn = (id: string) => {
    onChange(lines.map((l) => { const { [id]: _removed, ...rest } = l.extra; return { ...l, extra: rest }; }), columns.filter((c) => c.id !== id));
  };
  const moveColumn = (index: number, dir: -1 | 1) => {
    const next = [...columns];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(lines, next);
  };

  const showBillingPeriod = billingPeriodAvailable;

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <p className="mv-muted" style={{ fontSize: 12, fontWeight: 600 }}>Line Items</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="mv-quiet-button" onClick={addColumn}><PlusIcon size={14} style={{ marginRight: 4 }} />Add Column</button>
          <button type="button" className="mv-quiet-button" onClick={addLine}><PlusIcon size={14} style={{ marginRight: 4 }} />Add Row</button>
        </div>
      </div>

      <div className="mv-table-wrap">
        <table className="mv-table">
          <thead>
            <tr>
              <th>Description</th>
              <th className="mv-num">Qty</th>
              <th className="mv-num">Unit Price</th>
              {discountAvailable && (
                <th className="mv-num">
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 400 }}>
                    <input type="checkbox" checked={allDiscounted} onChange={toggleAllDiscount} />Discount %
                  </label>
                </th>
              )}
              {showBillingPeriod && <th>Billing Start</th>}
              {showBillingPeriod && <th>Billing End</th>}
              {columns.map((col, i) => (
                <th key={col.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {col.label}
                    <button type="button" className="mv-icon-button" aria-label={`Move ${col.label} left`} disabled={i === 0} onClick={() => moveColumn(i, -1)} style={{ width: 20, height: 20 }}><ChevronLeftIcon size={12} /></button>
                    <button type="button" className="mv-icon-button" aria-label={`Move ${col.label} right`} disabled={i === columns.length - 1} onClick={() => moveColumn(i, 1)} style={{ width: 20, height: 20 }}><ChevronRightIcon size={12} /></button>
                    <button type="button" className="mv-icon-button" aria-label={`Remove ${col.label}`} onClick={() => removeColumn(col.id)} style={{ width: 20, height: 20 }}><TrashIcon size={12} /></button>
                  </div>
                </th>
              ))}
              <th className="mv-num">Amount</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id}>
                <td><input className="mv-select" style={{ width: '100%' }} value={line.description} onChange={(e) => updateLine(line.id, { description: e.target.value })} placeholder="Item description" /></td>
                <td className="mv-num"><input className="mv-select" type="number" min={0} step="1" style={{ width: 72, textAlign: 'right' }} value={line.quantity} onChange={(e) => updateLine(line.id, { quantity: Number(e.target.value) })} /></td>
                <td className="mv-num"><input className="mv-select" type="number" min={0} step="0.01" style={{ width: 100, textAlign: 'right' }} value={line.vendorUnitPrice} onChange={(e) => updateLine(line.id, { vendorUnitPrice: Number(e.target.value) })} /></td>
                {discountAvailable && (
                  <td className="mv-num">
                    <input type="checkbox" checked={line.discountPctApplied > 0} onChange={(e) => toggleDiscount(line.id, e.target.checked)} />
                    {line.discountPctApplied > 0 && <span className="mv-muted" style={{ marginLeft: 6, fontSize: 12 }}>{line.discountPctApplied}%</span>}
                  </td>
                )}
                {showBillingPeriod && <td><input className="mv-select" type="date" value={line.billingPeriodStart?.slice(0, 10) ?? ''} onChange={(e) => updateLine(line.id, { billingPeriodStart: e.target.value })} /></td>}
                {showBillingPeriod && <td><input className="mv-select" type="date" value={line.billingPeriodEnd?.slice(0, 10) ?? ''} onChange={(e) => updateLine(line.id, { billingPeriodEnd: e.target.value })} /></td>}
                {columns.map((col) => (
                  <td key={col.id}><input className="mv-select" style={{ width: '100%' }} value={line.extra[col.id] ?? ''} onChange={(e) => updateExtra(line.id, col.id, e.target.value)} /></td>
                ))}
                <td className="mv-num" style={{ fontWeight: 600 }}>{formatCurrency(line.finalLineAmount)}</td>
                <td><button type="button" className="mv-icon-button" aria-label="Remove row" onClick={() => removeLine(line.id)}><TrashIcon size={15} /></button></td>
              </tr>
            ))}
            {lines.length === 0 && (
              <tr><td colSpan={20} className="mv-muted" style={{ textAlign: 'center', padding: 20 }}>No line items yet — click "Add Row" to start.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
