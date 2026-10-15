import { calcLine } from '../../shared/domain/billing/billingPricing';
import { addDaysIso, buildInvoice } from '../../shared/domain/billing/billingDerivations';
import type { Customer, Invoice, InvoiceLine, PaymentTerm } from '../../shared/domain/billing/billingTypes';

export const PAYMENT_TERMS: PaymentTerm[] = [
  { id: 'term-30', name: 'Net 30', days: 30 },
  { id: 'term-60', name: 'Net 60', days: 60 },
  { id: 'term-90', name: 'Net 90', days: 90 },
];

export const CUSTOMERS: Customer[] = [
  { id: 'cust-1', name: 'Northwind Traders', orgId: null, billingAddress: '400 Market St\nAustin, TX 78701', shippingAddress: '400 Market St\nAustin, TX 78701', primaryContactEmail: 'ap@northwindtraders.example', discountPct: 5, active: true },
  { id: 'cust-2', name: 'Contoso Ltd', orgId: null, billingAddress: '1 Redmond Way\nRedmond, WA 98052', shippingAddress: '1 Redmond Way\nRedmond, WA 98052', primaryContactEmail: 'billing@contoso.example', discountPct: 10, active: true },
  { id: 'cust-3', name: 'Fabrikam Inc', orgId: null, billingAddress: '55 Industrial Ave\nChicago, IL 60607', shippingAddress: '200 Distribution Ct\nChicago, IL 60609', primaryContactEmail: 'finance@fabrikam.example', discountPct: 0, active: true },
  { id: 'cust-4', name: 'Adventure Works', orgId: null, billingAddress: '88 Trailhead Rd\nDenver, CO 80202', shippingAddress: '88 Trailhead Rd\nDenver, CO 80202', primaryContactEmail: 'accounts@adventureworks.example', discountPct: 0, active: false },
];

/**
 * Stands in for a real multi-tenant `customer.orgId === user.currentOrgId`
 * match — Mavera's User type doesn't model an org id today, so
 * CustomerBillingView treats this one customer as "the current viewer's own
 * organisation's billing record" rather than inventing an org-id concept
 * nothing else in the app uses yet.
 */
export const SELF_CUSTOMER_ID = 'cust-1';

function line(lineNumber: number, description: string, quantity: number, vendorUnitPrice: number, discountPct: number, extra: Record<string, string> = {}, billingPeriodStart?: string, billingPeriodEnd?: string): InvoiceLine {
  const calc = calcLine({ quantity, vendorUnitPrice, discountPct, adjustmentPct: 0 });
  return { id: `line-seed-${lineNumber}-${description.slice(0, 4)}`, lineNumber, description, quantity, vendorUnitPrice, extra, billingPeriodStart, billingPeriodEnd, ...calc };
}

const seedInvoice1 = buildInvoice({
  customerId: 'cust-1',
  invoiceDate: '2026-08-01T00:00:00Z',
  serialNumber: 'SN-2026-0801',
  poNumber: 'PO-4471',
  paymentTerm: PAYMENT_TERMS[0],
  customFields: [{ id: 'cf-1', label: 'Account Manager', value: 'Sarah Johnson' }],
  columns: [],
  lines: [
    line(1, 'Cloud Cost Monitoring — Monthly Subscription', 1, 2400, 5, {}, '2026-08-01T00:00:00Z', '2026-08-31T00:00:00Z'),
    line(2, 'Priority Support', 1, 300, 5),
  ],
  overallAdjustmentPct: 0,
  taxPct: 8.25,
  sequence: 1,
});

const seedInvoice2 = buildInvoice({
  customerId: 'cust-2',
  invoiceDate: '2026-09-01T00:00:00Z',
  serialNumber: null,
  poNumber: 'PO-CT-8834',
  paymentTerm: PAYMENT_TERMS[1],
  customFields: [],
  columns: [{ id: 'col-env', label: 'Environment' }],
  lines: [
    line(1, 'SAP BTP Monitoring — Enterprise Tier', 1, 4800, 10, { 'col-env': 'Production' }),
    line(2, 'Premium Support Add-on', 1, 1200, 10, { 'col-env': 'Production' }),
    line(3, 'Onboarding & Migration', 1, 2000, 0, { 'col-env': 'One-time' }),
  ],
  overallAdjustmentPct: -2,
  taxPct: 6.5,
  sequence: 2,
});

const seedInvoice3 = buildInvoice({
  customerId: 'cust-3',
  invoiceDate: '2026-07-01T00:00:00Z',
  serialNumber: null,
  poNumber: null,
  paymentTerm: PAYMENT_TERMS[0],
  customFields: [],
  columns: [],
  lines: [line(1, 'Cloud Cost Monitoring — Quarterly License', 1, 6900, 0)],
  overallAdjustmentPct: 0,
  taxPct: 8.25,
  sequence: 3,
});

const seedInvoice4 = buildInvoice({
  customerId: 'cust-1',
  invoiceDate: '2026-06-15T00:00:00Z',
  serialNumber: 'SN-2026-0615',
  poNumber: 'PO-4210',
  paymentTerm: PAYMENT_TERMS[0],
  customFields: [],
  columns: [],
  lines: [line(1, 'Cloud Cost Monitoring — Monthly Subscription', 1, 2400, 5)],
  overallAdjustmentPct: 0,
  taxPct: 8.25,
  sequence: 4,
});

/** Overdue is never derived automatically in Mavera (nothing in the
 * reference computes it from dueDate either — it only ever appeared via
 * hand-authored seed data there too), so this one is seeded by hand with a
 * due date already in the past. */
const seedInvoice5: Invoice = { ...buildInvoice({
  customerId: 'cust-2',
  invoiceDate: '2026-05-01T00:00:00Z',
  serialNumber: null,
  poNumber: 'PO-CT-8790',
  paymentTerm: PAYMENT_TERMS[0],
  customFields: [],
  columns: [],
  lines: [line(1, 'SAP BTP Monitoring — Enterprise Tier', 1, 4800, 10)],
  overallAdjustmentPct: 0,
  taxPct: 6.5,
  sequence: 5,
}), status: 'Overdue', dueDate: '2026-06-01T00:00:00Z' };

export const MOCK_CUSTOMER_INVOICES: Invoice[] = [
  { ...seedInvoice1, status: 'Paid', paidDate: addDaysIso(seedInvoice1.invoiceDate, 12), paymentReference: 'PAY-DEMO-000101', paymentMethod: 'card' },
  seedInvoice2,
  { ...seedInvoice3, status: 'Paid', paidDate: addDaysIso(seedInvoice3.invoiceDate, 20), paymentReference: 'PAY-DEMO-000103', paymentMethod: 'card' },
  seedInvoice4,
  seedInvoice5,
];
