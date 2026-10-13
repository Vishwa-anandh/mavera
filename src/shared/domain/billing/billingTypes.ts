export interface Customer {
  id: string;
  name: string;
  /** Links to an existing CCM org — that org's users see this customer's
   * invoices in their own CustomerBillingView. null = a standalone
   * billing-only record with no app login attached. */
  orgId: string | null;
  billingAddress: string;
  shippingAddress: string;
  primaryContactEmail: string;
  /** Flat per-customer discount rate (0–100), applied per line when that
   * line's discount toggle is checked. */
  discountPct: number;
  active: boolean;
}

export interface PaymentTerm {
  id: string;
  /** e.g. "Net 30" */
  name: string;
  days: number;
}

export interface CustomField {
  id: string;
  label: string;
  value: string;
}

/** An arbitrary extra line-item column (e.g. "Subscription ID") — display
 * only, not part of pricing. Each row's value for this column lives in
 * that row's `extra` bag, keyed by this column's id. */
export interface InvoiceColumn {
  id: string;
  label: string;
}

export interface InvoiceLine {
  id: string;
  lineNumber: number;
  description: string;
  quantity: number;
  vendorUnitPrice: number;
  vendorLineTotal: number;
  discountPctApplied: number;
  discountAmount: number;
  netAmountAfterDiscount: number;
  /** Per-line Maitsys adjustment — fully modeled (matches the reference's
   * data model and calcLine) but there is deliberately no UI control to set
   * it to anything but 0 on a manually-built invoice, matching the
   * reference exactly. Kept so a future "pull from vendor invoice" flow has
   * somewhere to put a real value without a data migration. */
  maitsysAdjustmentPctApplied: number;
  maitsysAdjustmentAmount: number;
  finalLineAmount: number;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  /** Custom column values, keyed by InvoiceColumn.id. */
  extra: Record<string, string>;
}

export type InvoiceStatus = 'Sent' | 'Paid' | 'Overdue';

export interface SentEmail {
  invoiceId: string;
  to: string;
  subject: string;
  body: string;
  publicUrl: string;
  sentAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  currency: 'USD';
  invoiceDate: string;
  serialNumber: string | null;
  poNumber: string | null;
  dueDate: string;
  /** Snapshot of the payment term's day-count at creation time (e.g. "30
   * days") — never a live reference, so editing/deleting the term later
   * doesn't retroactively change historical invoices. */
  paymentTermName: string;
  status: InvoiceStatus;
  customFields: CustomField[];
  columns: InvoiceColumn[];
  lines: InvoiceLine[];
  lineSubtotal: number;
  overallAdjustmentPct: number;
  overallAdjustmentAmount: number;
  subtotal: number;
  taxPct: number;
  tax: number;
  totalDue: number;
  publishedDate: string | null;
  paidDate: string | null;
  paymentReference: string | null;
  paymentMethod: string | null;
  publicToken: string;
}
