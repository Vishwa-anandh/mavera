import { InvoicePreview } from './InvoicePreview';
import type { Customer, Invoice } from '../../../shared/domain/billing/billingTypes';

/** Thin adapter: a saved Invoice + its Customer -> InvoicePreview's props.
 * This is what a customer sees on the public pay page, and what Finance
 * sees when they toggle "View Invoice" instead of the data-summary view. */
export function InvoiceDocument({ invoice, customer }: { invoice: Invoice; customer: Customer | undefined }) {
  const billTo = { name: customer?.name ?? 'Customer', address: customer?.billingAddress ?? '' };
  const shipTo = customer && customer.shippingAddress !== customer.billingAddress ? { name: customer.name, address: customer.shippingAddress } : null;

  return (
    <InvoicePreview
      invoiceNumber={invoice.invoiceNumber}
      invoiceDate={invoice.invoiceDate}
      dueDate={invoice.dueDate}
      serialNumber={invoice.serialNumber}
      poNumber={invoice.poNumber}
      paymentTermName={invoice.paymentTermName}
      billTo={billTo}
      shipTo={shipTo}
      customFields={invoice.customFields}
      columns={invoice.columns}
      lines={invoice.lines}
      overallAdjustmentPct={invoice.overallAdjustmentPct}
      taxPct={invoice.taxPct}
    />
  );
}
