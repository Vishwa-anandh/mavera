import { calcInvoiceTotals } from './billingPricing';
import type { Invoice, InvoiceLine, InvoiceStatus, PaymentTerm, SentEmail } from './billingTypes';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

export function formatDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

/** DST-safe day math — operates on the UTC calendar date rather than
 * parsing/re-formatting a local Date, so "+30 days" never lands on the
 * wrong day around a DST transition. */
export function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso);
  const utc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + days);
  return new Date(utc).toISOString();
}

export function dueDateFor(invoiceDate: string, term: PaymentTerm | undefined): string {
  return addDaysIso(invoiceDate, term?.days ?? 14);
}

export function recomputeInvoiceTotals(lines: InvoiceLine[], taxPct: number, overallAdjustmentPct: number): Pick<Invoice, 'lineSubtotal' | 'overallAdjustmentAmount' | 'subtotal' | 'tax' | 'totalDue'> {
  return calcInvoiceTotals(lines.map((l) => l.finalLineAmount), taxPct, overallAdjustmentPct);
}

let invoiceIdCounter = 100;

export function nextInvoiceNumber(year: number, sequence: number): string {
  return `INV-${year}-${String(sequence).padStart(4, '0')}`;
}

export interface BuildInvoiceInput {
  customerId: string;
  invoiceDate: string;
  serialNumber: string | null;
  poNumber: string | null;
  paymentTerm: PaymentTerm | undefined;
  customFields: Invoice['customFields'];
  columns: Invoice['columns'];
  lines: InvoiceLine[];
  overallAdjustmentPct: number;
  taxPct: number;
  sequence: number;
}

/** Assembles a brand-new invoice — always created already-Sent, matching the
 * reference exactly (there is no Draft/Approved/Pending state; every
 * invoice is immediately visible to the customer once "sent"). */
export function buildInvoice(input: BuildInvoiceInput): Invoice {
  invoiceIdCounter += 1;
  const totals = recomputeInvoiceTotals(input.lines, input.taxPct, input.overallAdjustmentPct);
  const year = new Date(input.invoiceDate).getFullYear();

  return {
    id: `cust-inv-${invoiceIdCounter}`,
    invoiceNumber: nextInvoiceNumber(year, input.sequence),
    customerId: input.customerId,
    currency: 'USD',
    invoiceDate: input.invoiceDate,
    serialNumber: input.serialNumber,
    poNumber: input.poNumber,
    dueDate: dueDateFor(input.invoiceDate, input.paymentTerm),
    paymentTermName: input.paymentTerm ? `${input.paymentTerm.days} days` : '14 days',
    status: 'Sent',
    customFields: input.customFields,
    columns: input.columns,
    lines: input.lines,
    ...totals,
    taxPct: input.taxPct,
    overallAdjustmentPct: input.overallAdjustmentPct,
    publishedDate: new Date().toISOString(),
    paidDate: null,
    paymentReference: null,
    paymentMethod: null,
    publicToken: crypto.randomUUID(),
  };
}

/** Simulates "sending" the invoice by email — there's no real mail server in
 * this prototype, so this materializes exactly what would have been sent
 * (subject/body/link) for display in SentEmailModal, same as the reference. */
export function synthesizeSentEmail(invoice: Invoice, customerEmail: string, customerName: string): SentEmail {
  const publicUrl = `${window.location.origin}/invoice/${invoice.publicToken}`;
  return {
    invoiceId: invoice.id,
    to: customerEmail,
    subject: `Invoice ${invoice.invoiceNumber} from Maitsys`,
    body: `Hi ${customerName},\n\nYour invoice ${invoice.invoiceNumber} for ${formatCurrency(invoice.totalDue)} is ready. Due ${formatDate(invoice.dueDate)}.\n\nView and pay online: ${publicUrl}\n\nThank you for your business.\n— Maitsys Billing`,
    publicUrl,
    sentAt: new Date().toISOString(),
  };
}

export function markInvoicePaid(invoice: Invoice): Invoice {
  return {
    ...invoice,
    status: 'Paid',
    paidDate: new Date().toISOString(),
    paymentReference: `PAY-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
    paymentMethod: 'card',
  };
}

export const STATUS_TONE: Record<InvoiceStatus, 'success' | 'info' | 'danger'> = { Sent: 'info', Paid: 'success', Overdue: 'danger' };
