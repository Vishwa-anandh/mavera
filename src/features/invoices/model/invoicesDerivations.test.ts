import { describe, expect, it } from 'vitest';
import { invoicesRepository } from '../../../data-access';
import { cspBreakdownOf, providerCountsOf } from './invoicesDerivations';

const byId = (id: string) => invoicesRepository.list().find((i) => i.id === id)!;

describe('cspBreakdownOf', () => {
  it('uses an Azure service\'s own negotiated saving and the flat 7% rate for the rest', () => {
    const b = cspBreakdownOf(byId('inv-azure-09'));
    expect(b.rate).toBe(0.07);
    expect(b.basis).toBe('service');
    expect(b.rows.map((r) => r.name)).toEqual(['Virtual Machines', 'Storage', 'SQL Database', 'App Service', 'Networking']);
    expect(b.base).toBe(8420);
    expect(b.total).toBeCloseTo(642.8, 2);
    expect(b.effectiveRate).toBeCloseTo(0.0763, 3);
    expect(b.rows[0]).toMatchObject({ cost: 3820, savings: 305.6 });
    expect(b.rows[3].savings).toBeCloseTo(68.6, 2);
  });

  it('applies the flat provider rate to every AWS service', () => {
    const b = cspBreakdownOf(byId('inv-aws-09'));
    expect(b.rate).toBe(0.035);
    expect(b.base).toBe(5310);
    expect(b.total).toBeCloseTo(185.85, 2);
    expect(b.effectiveRate).toBeCloseTo(0.035, 6);
  });

  it('breaks a SAP BTP invoice down by subaccount at the BTP rate', () => {
    const b = cspBreakdownOf(byId('inv-btp-09'));
    expect(b.basis).toBe('subaccount');
    expect(b.rows.map((r) => r.name)).toEqual(['prod-eu10', 'prod-us10', 'qa-eu10']);
    expect(b.base).toBe(1860);
    expect(b.total).toBeCloseTo(37.2, 2);
  });

  it('falls back to a BTP invoice\'s service list when it has no subaccounts', () => {
    const b = cspBreakdownOf(byId('inv-btp-08'));
    expect(b.basis).toBe('service');
    expect(b.base).toBe(1800);
  });

  it('has no rows, and no saving, when the invoice has no breakdown', () => {
    const b = cspBreakdownOf(byId('inv-azure-07'));
    expect(b.rows).toEqual([]);
    expect(b).toMatchObject({ base: 0, total: 0, effectiveRate: 0 });
  });
});

describe('providerCountsOf', () => {
  it('counts invoices overall and per provider', () => {
    expect(providerCountsOf(invoicesRepository.list())).toEqual({ all: 9, azure: 3, aws: 2, btp: 2, gcp: 2 });
    expect(providerCountsOf([])).toEqual({ all: 0, azure: 0, aws: 0, btp: 0, gcp: 0 });
  });
});
