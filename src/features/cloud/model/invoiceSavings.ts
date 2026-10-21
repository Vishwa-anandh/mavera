import { CSP_DISCOUNT_RATES } from '../../../data-access';
import type { InvoiceItem, ProviderKey } from '../../dashboard';

const PROVIDERS: ProviderKey[] = ['azure', 'aws', 'btp', 'gcp'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface InvoiceMonth {
  /** "2026-09", for ordering: the billed month when the invoice says it, else its invoice date. */
  key: string;
  /** "Sep 2026". */
  name: string;
  azure: number;
  aws: number;
  btp: number;
  gcp: number;
  /** Everything invoiced that month. */
  total: number;
  /** The Maitsys CSP saving on that month's invoices. */
  savings: number;
}

export interface InvoiceProviderSaving {
  provider: ProviderKey;
  rate: number;
  /** What was invoiced by this provider. */
  base: number;
  savings: number;
}

export interface InvoiceSavings {
  /** Oldest first, at most `limit` months; invoices with no usable date are left out of the months but kept in the totals. */
  months: InvoiceMonth[];
  invoiced: number;
  savings: number;
  /** savings / invoiced, as a fraction (0.0699 is 6.99%), 0 with nothing invoiced. */
  avgRate: number;
  /** Providers that have invoices, largest saving first. */
  byProvider: InvoiceProviderSaving[];
}

const amountOf = (item: InvoiceItem): number => {
  const n = Number(item.total_cost);
  return Number.isFinite(n) ? n : 0;
};

const monthKeyOf = (item: InvoiceItem): string | null => {
  const match = /^(\d{4})-(\d{2})/.exec(item.billing_period_start ?? item.invoice_date ?? item.created_at ?? '');
  return match && Number(match[2]) >= 1 && Number(match[2]) <= 12 ? `${match[1]}-${match[2]}` : null;
};

const monthName = (key: string): string => `${MONTH_NAMES[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;

/**
 * What the Cost Overview "Maitsys CSP Savings vs Invoice Total" chart shows: each month's invoiced total split by
 * provider, with the CSP saving on it. The saving is the flat provider rate times the invoiced amount (an estimate:
 * a service with a negotiated discount on the Invoices page can save a little more), so it is labelled as such.
 */
export function invoiceSavingsOf(items: InvoiceItem[], limit = 6): InvoiceSavings {
  const months = new Map<string, InvoiceMonth>();
  const providers = new Map<ProviderKey, InvoiceProviderSaving>();
  let invoiced = 0;
  let savings = 0;
  for (const item of items) {
    const amount = amountOf(item);
    const provider = PROVIDERS.find((p) => p === item.provider);
    const saving = provider ? amount * CSP_DISCOUNT_RATES[provider] : 0;
    invoiced += amount;
    savings += saving;
    if (provider) {
      const entry = providers.get(provider) ?? { provider, rate: CSP_DISCOUNT_RATES[provider], base: 0, savings: 0 };
      entry.base += amount;
      entry.savings += saving;
      providers.set(provider, entry);
    }
    const key = monthKeyOf(item);
    if (!key) continue;
    const month = months.get(key) ?? { key, name: monthName(key), azure: 0, aws: 0, btp: 0, gcp: 0, total: 0, savings: 0 };
    if (provider) month[provider] += amount;
    month.total += amount;
    month.savings += saving;
    months.set(key, month);
  }
  return {
    months: [...months.values()].sort((a, b) => a.key.localeCompare(b.key)).slice(-limit),
    invoiced,
    savings,
    avgRate: invoiced > 0 ? savings / invoiced : 0,
    byProvider: [...providers.values()].sort((a, b) => b.savings - a.savings),
  };
}

/** The invoices out of a `GET /invoices` response, which the API may send as `{ data: [...] }` or as a bare array. */
export function invoiceItemsOf(response: { data?: InvoiceItem[] } | InvoiceItem[] | null | undefined): InvoiceItem[] {
  if (Array.isArray(response)) return response;
  return response && Array.isArray(response.data) ? response.data : [];
}
