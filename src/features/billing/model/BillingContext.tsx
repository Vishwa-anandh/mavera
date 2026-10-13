import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { CUSTOMERS, MOCK_CUSTOMER_INVOICES, PAYMENT_TERMS } from '../../../demo/billing/mockBillingData';
import { markInvoicePaid } from '../../../shared/domain/billing/billingDerivations';
import type { Customer, Invoice, PaymentTerm } from '../../../shared/domain/billing/billingTypes';

export interface BillingContextValue {
  customers: Customer[];
  setCustomers: (customers: Customer[]) => void;
  terms: PaymentTerm[];
  setTerms: (terms: PaymentTerm[]) => void;
  invoices: Invoice[];
  addInvoice: (invoice: Invoice) => void;
  payInvoice: (invoiceId: string) => void;
}

const BillingContext = createContext<BillingContextValue | undefined>(undefined);

const CUSTOMERS_KEY = 'mv_billing_customers';
const TERMS_KEY = 'mv_billing_terms';
const INVOICES_KEY = 'mv_billing_invoices';

function loadOrSeed<T>(key: string, seed: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : seed;
  } catch {
    return seed;
  }
}

/**
 * Shared billing state, persisted to localStorage — there's no real backend,
 * and invoice creation (Super Admin, its own login) and invoice viewing/
 * paying (the org's own Billing page, a different login) now happen in two
 * entirely separate sessions, so plain in-memory state wouldn't survive the
 * reload between them. Mounted once in App.tsx, above both route trees.
 */
export function BillingProvider({ children }: { children?: ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>(() => loadOrSeed(CUSTOMERS_KEY, CUSTOMERS));
  const [terms, setTerms] = useState<PaymentTerm[]>(() => loadOrSeed(TERMS_KEY, PAYMENT_TERMS));
  const [invoices, setInvoices] = useState<Invoice[]>(() => loadOrSeed(INVOICES_KEY, MOCK_CUSTOMER_INVOICES));

  useEffect(() => { localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers)); }, [customers]);
  useEffect(() => { localStorage.setItem(TERMS_KEY, JSON.stringify(terms)); }, [terms]);
  useEffect(() => { localStorage.setItem(INVOICES_KEY, JSON.stringify(invoices)); }, [invoices]);

  const addInvoice = useCallback((invoice: Invoice) => setInvoices((current) => [invoice, ...current]), []);
  const payInvoice = useCallback((invoiceId: string) => setInvoices((current) => current.map((inv) => (inv.id === invoiceId ? markInvoicePaid(inv) : inv))), []);

  const value = useMemo<BillingContextValue>(
    () => ({ customers, setCustomers, terms, setTerms, invoices, addInvoice, payInvoice }),
    [customers, terms, invoices, addInvoice, payInvoice],
  );

  return <BillingContext.Provider value={value}>{children ?? <Outlet />}</BillingContext.Provider>;
}

export function useBilling(): BillingContextValue {
  const ctx = useContext(BillingContext);
  if (!ctx) throw new Error('useBilling must be used within a BillingProvider');
  return ctx;
}
