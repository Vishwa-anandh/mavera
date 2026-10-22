import type { Invoice, InvoiceProvider } from '../contracts/invoices';
import { SEED_INVOICES } from '../../demo/invoices/mockInvoicesData';
import { getWorkspaceProfile, onWorkspaceProfileChange } from './workspaceProfile';

/**
 * Uploaded cloud invoices. PROTOTYPE: parsing happens server-side in the real product and there is no backend
 * here, so the list lives in module memory. It survives moving between pages for the rest of the session (the
 * Cost Overview invoices view reads the same list) and is gone on reload. Reads return copies.
 */
let invoices: Invoice[] = [];

/** A brand-new organisation (empty profile) has uploaded no invoices yet. */
function seed(): void {
  invoices = getWorkspaceProfile() === 'empty' ? [] : structuredClone(SEED_INVOICES);
}
seed();
onWorkspaceProfileChange(seed);

/** Restores the seed list. Tests call this between cases; the app never does. */
export function resetInvoicesStore(): void {
  seed();
}

/**
 * The Maitsys CSP discount per provider, as a fraction of the invoiced amount. The reference app kept two copies of
 * this table that drifted apart (one without Google Cloud); this is the one canonical copy.
 */
export const CSP_DISCOUNT_RATES: Record<InvoiceProvider, number> = { azure: 0.07, aws: 0.035, btp: 0.02, gcp: 0.035 };

export const invoicesRepository = {
  list(): Invoice[] {
    return structuredClone(invoices);
  },
  add(invoice: Invoice): Invoice[] {
    invoices = [structuredClone(invoice), ...invoices];
    return structuredClone(invoices);
  },
  /** Deletes one invoice; false when there was no such invoice. */
  remove(id: string): boolean {
    const before = invoices.length;
    invoices = invoices.filter((inv) => inv.id !== id);
    return invoices.length < before;
  },
  /** Puts a deleted invoice back (Undo) at its old place in the list; does nothing if it is already there. */
  restore(invoice: Invoice, index = 0): Invoice[] {
    if (!invoices.some((inv) => inv.id === invoice.id)) {
      const at = Math.min(Math.max(index, 0), invoices.length);
      invoices = [...invoices.slice(0, at), structuredClone(invoice), ...invoices.slice(at)];
    }
    return structuredClone(invoices);
  },
};
