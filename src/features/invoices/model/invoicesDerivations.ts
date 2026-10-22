import { CSP_DISCOUNT_RATES } from '../../../data-access';
import type { CloudProvider } from '../../../shared/types/auth';
import type { Invoice, InvoiceService, ProviderFilter } from './invoicesTypes';

/** One canonical rate map (it lives in data-access): the reference app kept two independent copies
 * (a shared MSP_SAVINGS constant missing `gcp`, and a second hardcoded rate
 * inline on this page) that had silently drifted apart. */
export const CSP_RATES: Record<CloudProvider, number> = CSP_DISCOUNT_RATES;

export const PROVIDER_LABELS: Record<CloudProvider, string> = { azure: 'Azure', aws: 'AWS', btp: 'SAP BTP', gcp: 'Google Cloud' };

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function monthLabel(month: number, year: number): string {
  return `${MONTH_NAMES[(month - 1 + 12) % 12]} ${year}`;
}

export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
}

export function formatDate(value: string | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function filterByProvider(invoices: Invoice[], filter: ProviderFilter): Invoice[] {
  const filtered = filter === 'all' ? invoices : invoices.filter((inv) => inv.provider === filter);
  return [...filtered].sort((a, b) => (b.year - a.year) || (b.month - a.month));
}

export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export interface InvoiceKpis {
  totalCount: number;
  countByProvider: Record<CloudProvider, number>;
  totalSpend: number;
  latestMonthLabel: string | null;
}

export function invoiceKpisOf(invoices: Invoice[]): InvoiceKpis {
  const countByProvider: Record<CloudProvider, number> = { azure: 0, aws: 0, btp: 0, gcp: 0 };
  let totalSpend = 0;
  let latest: Invoice | null = null;
  for (const inv of invoices) {
    countByProvider[inv.provider] += 1;
    totalSpend += inv.total_cost;
    if (!latest || inv.year > latest.year || (inv.year === latest.year && inv.month > latest.month)) latest = inv;
  }
  return {
    totalCount: invoices.length,
    countByProvider,
    totalSpend,
    latestMonthLabel: latest ? monthLabel(latest.month, latest.year) : null,
  };
}

export interface ServiceSavingsRow {
  name: string;
  cost: number;
  sharePct: number;
  savings: number;
}

/** Per-service CSP savings breakdown for the non-BTP detail panel: Azure
 * services use their own real `savings` figure when set, everything else
 * (and any Azure service without one) falls back to cost × the flat rate. */
export function serviceSavingsRowsOf(services: InvoiceService[], provider: CloudProvider): ServiceSavingsRow[] {
  const totalCost = services.reduce((sum, s) => sum + s.cost, 0);
  const rate = CSP_RATES[provider];
  return services
    .map((s) => ({
      name: s.name,
      cost: s.cost,
      sharePct: totalCost > 0 ? (s.cost / totalCost) * 100 : 0,
      savings: s.savings && s.savings > 0 ? s.savings : s.cost * rate,
    }))
    .sort((a, b) => b.cost - a.cost);
}

export function totalSavingsOf(rows: ServiceSavingsRow[]): number {
  return rows.reduce((sum, r) => sum + r.savings, 0);
}

export interface CspBreakdown {
  /** The provider's flat CSP discount rate. */
  rate: number;
  /** What the rows break down: services, or subaccounts for a SAP BTP invoice that lists them. */
  basis: 'service' | 'subaccount';
  rows: ServiceSavingsRow[];
  /** The charges the rows add up to, before tax. */
  base: number;
  /** Total saving over the rows. */
  total: number;
  /** Saving as a share of `base`; above the flat rate when a service has a negotiated discount. */
  effectiveRate: number;
}

/**
 * What the Maitsys CSP Savings block shows for one invoice: per-service rows (per-subaccount for a SAP BTP invoice
 * that lists subaccounts), the saving in money terms and the rate it works out to. Azure services keep their own
 * negotiated figure; everything else is cost times the flat provider rate. Empty rows mean the invoice has no
 * breakdown to analyse.
 */
export function cspBreakdownOf(invoice: Invoice): CspBreakdown {
  const rate = CSP_RATES[invoice.provider];
  const isBtp = invoice.provider === 'btp';
  const subaccounts = isBtp ? invoice.raw_summary.subaccountCosts ?? [] : [];
  const globalLines = isBtp ? invoice.raw_summary.globalAccountCosts ?? [] : [];
  const basis = subaccounts.length > 0 ? 'subaccount' : 'service';
  const lines: InvoiceService[] = subaccounts.length > 0
    ? subaccounts.map((s) => ({ name: s.name, cost: s.totalCost }))
    : invoice.services.length > 0 || globalLines.length === 0
      ? invoice.services
      : globalLines.map((g) => ({ name: g.name, cost: g.cost }));
  const rows = serviceSavingsRowsOf(lines, invoice.provider);
  const base = rows.reduce((sum, r) => sum + r.cost, 0);
  const total = totalSavingsOf(rows);
  return { rate, basis, rows, base, total, effectiveRate: base > 0 ? total / base : 0 };
}

/** Invoice counts for the provider filter chips; `all` is every invoice. */
export function providerCountsOf(invoices: Invoice[]): Record<ProviderFilter, number> {
  const counts: Record<ProviderFilter, number> = { all: invoices.length, azure: 0, aws: 0, btp: 0, gcp: 0 };
  for (const inv of invoices) counts[inv.provider] += 1;
  return counts;
}

const CANNED_SERVICE_TEMPLATES: Record<CloudProvider, string[]> = {
  azure: ['Virtual Machines', 'Storage', 'SQL Database', 'App Service'],
  aws: ['EC2', 'S3', 'RDS', 'Lambda'],
  btp: ['HANA Cloud', 'Application Runtime', 'Integration Suite'],
  gcp: ['Compute Engine', 'Cloud Storage', 'BigQuery'],
};

let fakeInvoiceCounter = 1000;

/**
 * Simulates the reference's server-side PDF/XLSX parse: there's no backend
 * to actually extract line items from the uploaded file, so this produces a
 * plausible canned invoice instead — same UX shell (a short "parsing" delay,
 * then a materialized result), honest about what a no-backend build can do.
 */
export function buildFakeParsedInvoice(provider: CloudProvider, fileName: string, billingName: string | undefined, now: Date): Invoice {
  fakeInvoiceCounter += 1;
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const rate = CSP_RATES[provider];
  const serviceNames = CANNED_SERVICE_TEMPLATES[provider];
  const baseCosts = serviceNames.map((_, i) => 800 + i * 340);
  const services: InvoiceService[] = serviceNames.map((name, i) => ({
    name,
    cost: baseCosts[i],
    ...(provider === 'azure' ? { savings: Math.round(baseCosts[i] * (rate + 0.02) * 100) / 100 } : {}),
  }));
  const charges = services.reduce((sum, s) => sum + s.cost, 0);
  const taxRate = 0.08;
  const taxAmount = Math.round(charges * taxRate * 100) / 100;

  return {
    id: `inv-fake-${fakeInvoiceCounter}`,
    provider,
    month,
    year,
    total_cost: Math.round((charges + taxAmount) * 100) / 100,
    currency: 'USD',
    file_name: fileName,
    services,
    raw_summary: {
      invoiceNumber: `${provider.toUpperCase()}-${year}${String(month).padStart(2, '0')}-${fakeInvoiceCounter}`,
      billingProfile: billingName || `${PROVIDER_LABELS[provider]} Production`,
      billingPeriodStart: new Date(year, month - 1, 1).toISOString(),
      billingPeriodEnd: new Date(year, month, 0).toISOString(),
      invoiceDate: now.toISOString(),
      dueDate: new Date(now.getTime() + 14 * 86_400_000).toISOString(),
      charges,
      taxAmount,
      taxRate,
      sections: [{ name: 'Compute & Storage', total: charges, tax: taxAmount }],
    },
  };
}

/** The file name hints that say which cloud an invoice belongs to. SAP BTP invoices arrive as spreadsheets, the rest as PDFs. */
const PROVIDER_NAME_HINTS: Array<[CloudProvider, RegExp]> = [
  ['azure', /azure|microsoft|msft/],
  ['aws', /(^|[^a-z])aws([^a-z]|$)|amazon/],
  ['btp', /(^|[^a-z])btp([^a-z]|$)|(^|[^a-z])sap([^a-z]|$)/],
  ['gcp', /(^|[^a-z])gcp([^a-z]|$)|google/],
];

export interface InvoiceUploadGuess {
  /** The provider to upload under; null when the file cannot be used. */
  provider: CloudProvider | null;
  /** True when the file name (or the only provider that fits) settles it, so the upload can start without asking. */
  confident: boolean;
  /** Why the file cannot be used, when it cannot. */
  problem: string | null;
}

/**
 * Works out which provider an invoice file belongs to from its name and type, among the providers this member may
 * upload for. A name that mentions a provider ("azure-invoice-oct.pdf") settles it; a lone spreadsheet is SAP BTP; a
 * PDF with no hint is the member's only PDF provider when there is just one, and otherwise a guess (the first) the
 * caller should ask about rather than act on.
 */
export function detectInvoiceUpload(fileName: string, allowed: CloudProvider[]): InvoiceUploadGuess {
  const name = fileName.toLowerCase();
  const isSheet = name.endsWith('.xlsx');
  const isPdf = name.endsWith('.pdf');
  if (allowed.length === 0) return { provider: null, confident: false, problem: 'No cloud access: contact your administrator.' };
  if (!isSheet && !isPdf) return { provider: null, confident: false, problem: 'Invoices must be a PDF (Azure, AWS, Google Cloud) or an XLSX (SAP BTP) file.' };

  const fits = (provider: CloudProvider) => (provider === 'btp') === isSheet;
  const hinted = PROVIDER_NAME_HINTS.find(([, pattern]) => pattern.test(name))?.[0];
  if (hinted && allowed.includes(hinted)) {
    if (!fits(hinted)) return { provider: null, confident: false, problem: `${PROVIDER_LABELS[hinted]} invoices must be a ${hinted === 'btp' ? '.xlsx' : '.pdf'} file.` };
    return { provider: hinted, confident: true, problem: null };
  }
  const candidates = allowed.filter(fits);
  if (candidates.length === 0) return { provider: null, confident: false, problem: `You can upload ${isSheet ? 'PDF' : 'SAP BTP spreadsheet'} invoices only for the providers you have access to.` };
  return { provider: candidates[0], confident: candidates.length === 1, problem: null };
}
