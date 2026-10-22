import { describe, it, expect } from 'vitest';
import { DEMO_PROVIDERS, MAX_INVOICE_BYTES, formatFileSize, formatInvoiceMoney, hashText, invoiceFileProblem, simulateInvoiceParse, type DemoProvider } from './parseInvoice';

const PROVIDERS = DEMO_PROVIDERS.map((p) => p.id);
const cents = (value: number) => Math.round(value * 100);

describe('simulateInvoiceParse', () => {
  it('gives the same result for the same provider, file name and size', () => {
    for (const provider of PROVIDERS) {
      const a = simulateInvoiceParse({ provider, fileName: 'invoice-sep.pdf', sizeBytes: 182_400 });
      const b = simulateInvoiceParse({ provider, fileName: 'invoice-sep.pdf', sizeBytes: 182_400 });
      expect(b).toEqual(a);
    }
  });

  it('ignores the letter case and surrounding spaces of the file name', () => {
    const a = simulateInvoiceParse({ provider: 'aws', fileName: 'Invoice.PDF', sizeBytes: 5000 });
    const b = simulateInvoiceParse({ provider: 'aws', fileName: ' invoice.pdf ', sizeBytes: 5000 });
    expect({ ...b, fileName: a.fileName }).toEqual(a);
  });

  it('changes when the provider, the name or the size changes', () => {
    const base = simulateInvoiceParse({ provider: 'azure', fileName: 'a.pdf', sizeBytes: 1000 });
    expect(simulateInvoiceParse({ provider: 'aws', fileName: 'a.pdf', sizeBytes: 1000 }).invoiceNumber).not.toBe(base.invoiceNumber);
    expect(simulateInvoiceParse({ provider: 'azure', fileName: 'b.pdf', sizeBytes: 1000 }).total).not.toBe(base.total);
    expect(simulateInvoiceParse({ provider: 'azure', fileName: 'a.pdf', sizeBytes: 1001 }).total).not.toBe(base.total);
  });

  it.each(PROVIDERS)('is internally consistent for %s: items add to the subtotal, tax and total follow, services add up', (provider: DemoProvider) => {
    for (const [name, size] of [['one.pdf', 90_000], ['two.xlsx', 420_000], ['march invoice.pdf', 2_500_000], ['x.pdf', 1]] as const) {
      const r = simulateInvoiceParse({ provider, fileName: name, sizeBytes: size });
      expect(r.lineItems.length).toBeGreaterThanOrEqual(5);
      expect(r.lineItems.every((item) => item.amount > 0 && item.description && item.usage)).toBe(true);
      const itemCents = r.lineItems.reduce((sum, item) => sum + cents(item.amount), 0);
      expect(itemCents).toBe(cents(r.subtotal));
      expect(cents(r.tax)).toBe(Math.round(itemCents * r.taxRate));
      expect(cents(r.total)).toBe(itemCents + cents(r.tax));
      expect(r.spendByService.reduce((sum, row) => sum + cents(row.amount), 0)).toBe(itemCents);
      expect(r.spendByService.map((row) => row.amount)).toEqual([...r.spendByService.map((row) => row.amount)].sort((a, b) => b - a));
      expect(r.spendByService.reduce((sum, row) => sum + row.sharePercent, 0)).toBeGreaterThan(99);
      expect(r.spendByService.reduce((sum, row) => sum + row.sharePercent, 0)).toBeLessThan(101);
      const amounts = r.lineItems.map((item) => item.amount);
      expect(amounts).toEqual([...amounts].sort((a, b) => b - a));
      expect(r.total).toBeGreaterThan(1500);
    }
  });

  it('formats the invoice number and period the way each provider does', () => {
    const azure = simulateInvoiceParse({ provider: 'azure', fileName: 'a.pdf', sizeBytes: 10 });
    const aws = simulateInvoiceParse({ provider: 'aws', fileName: 'a.pdf', sizeBytes: 10 });
    const btp = simulateInvoiceParse({ provider: 'btp', fileName: 'a.xlsx', sizeBytes: 10 });
    const gcp = simulateInvoiceParse({ provider: 'gcp', fileName: 'a.pdf', sizeBytes: 10 });
    expect(azure.invoiceNumber).toMatch(/^G\d{9}$/);
    expect(aws.invoiceNumber).toMatch(/^\d{10}$/);
    expect(btp.invoiceNumber).toMatch(/^BTP-\d{4}-\d{6}$/);
    expect(gcp.invoiceNumber).toMatch(/^\d{10}$/);
    expect(btp.currency).toBe('EUR');
    expect(azure.currency).toBe('USD');
    for (const r of [azure, aws, btp, gcp]) expect(r.billingPeriod).toMatch(/^1–(28|29|30|31) [A-Z][a-z]+ 20(25|26)$/);
  });

  it('keeps every period between October 2025 and September 2026', () => {
    for (let i = 0; i < 200; i += 1) {
      const { billingPeriod } = simulateInvoiceParse({ provider: 'azure', fileName: `f${i}.pdf`, sizeBytes: i });
      const [, month, year] = billingPeriod.split(' ');
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const ordinal = Number(year) * 12 + months.indexOf(month);
      expect(ordinal).toBeGreaterThanOrEqual(2025 * 12 + 9);
      expect(ordinal).toBeLessThanOrEqual(2026 * 12 + 8);
    }
  });
});

describe('hashText', () => {
  it('is stable and spreads different text', () => {
    expect(hashText('abc')).toBe(hashText('abc'));
    expect(hashText('abc')).not.toBe(hashText('abd'));
    expect(hashText('')).toBe(0x811c9dc5);
  });
});

describe('invoiceFileProblem', () => {
  it('accepts PDF and XLSX files whatever the letter case', () => {
    expect(invoiceFileProblem({ name: 'bill.pdf', size: 1000 })).toBeNull();
    expect(invoiceFileProblem({ name: 'BILL.XLSX', size: 1000 })).toBeNull();
  });
  it('rejects other types, empty files and files over the limit', () => {
    expect(invoiceFileProblem({ name: 'bill.csv', size: 1000 })).toBe('bill.csv is not a PDF or XLSX file.');
    expect(invoiceFileProblem({ name: 'bill', size: 1000 })).toMatch(/not a PDF or XLSX/);
    expect(invoiceFileProblem({ name: 'bill.pdf', size: 0 })).toBe('bill.pdf is empty.');
    expect(invoiceFileProblem({ name: 'bill.pdf', size: MAX_INVOICE_BYTES })).toBeNull();
    expect(invoiceFileProblem({ name: 'bill.pdf', size: MAX_INVOICE_BYTES + 1 })).toBe('bill.pdf is larger than 10 MB.');
  });
});

describe('formatting', () => {
  it('formats file sizes and money in their own currency', () => {
    expect([formatFileSize(512), formatFileSize(2048), formatFileSize(3 * 1024 * 1024)]).toEqual(['512 B', '2.0 KB', '3.0 MB']);
    expect(formatInvoiceMoney(1234.5, 'USD')).toBe('$1,234.50');
    expect(formatInvoiceMoney(1234.5, 'EUR')).toBe('€1,234.50');
  });
});
