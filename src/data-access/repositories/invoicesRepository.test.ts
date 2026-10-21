import { beforeEach, describe, expect, it } from 'vitest';
import { CSP_DISCOUNT_RATES, invoicesRepository as repo, resetInvoicesStore } from './invoicesRepository';

beforeEach(() => resetInvoicesStore());

describe('invoicesRepository', () => {
  it('lists the sample invoices as copies', () => {
    expect(repo.list()).toHaveLength(9);
    repo.list()[0].total_cost = 1;
    expect(repo.list()[0].total_cost).not.toBe(1);
  });

  it('adds an invoice at the front and deletes one by id', () => {
    const [first] = repo.list();
    repo.add({ ...first, id: 'inv-new' });
    expect(repo.list()[0].id).toBe('inv-new');
    expect(repo.remove('inv-new')).toBe(true);
    expect(repo.remove('inv-new')).toBe(false);
    expect(repo.list()).toHaveLength(9);
  });

  it('keeps one CSP rate per provider, Google Cloud included', () => {
    expect(CSP_DISCOUNT_RATES).toEqual({ azure: 0.07, aws: 0.035, btp: 0.02, gcp: 0.035 });
  });
});
