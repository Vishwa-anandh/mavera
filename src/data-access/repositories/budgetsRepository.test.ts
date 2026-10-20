import { beforeEach, describe, expect, it } from 'vitest';
import { budgetsRepository } from './budgetsRepository';

describe('budgetsRepository', () => {
  beforeEach(() => budgetsRepository.reset());

  it('returns copies, so callers cannot change the stored data', () => {
    budgetsRepository.listBudgets()[0].name = 'Changed';
    expect(budgetsRepository.listBudgets()[0].name).toBe('Org-Wide Monthly Cap');
  });

  it('creates a budget with a new id and ties the chosen budget-based channels to it', () => {
    const budget = budgetsRepository.createBudget({ name: 'Q4 Data', target_amount: 5000, alert_threshold: 80, scope_type: 'organization', scope_value: '', channel_ids: ['channel-2'] });
    expect(budget.id).toBe('budget-4');
    expect(budgetsRepository.listBudgets().map((b) => b.id)).toContain('budget-4');
    expect(budgetsRepository.listChannels().find((c) => c.id === 'channel-2')?.budget_ids).toEqual(['budget-2', 'budget-4']);
    // A global channel is never given a budget list.
    expect(budgetsRepository.listChannels().find((c) => c.id === 'channel-1')?.budget_ids).toEqual([]);
  });

  it('does not reuse the id of a deleted budget', () => {
    budgetsRepository.deleteBudget('budget-3');
    const created = budgetsRepository.createBudget({ name: 'New', target_amount: 1, alert_threshold: 80, scope_type: 'organization', scope_value: '' });
    expect(created.id).toBe('budget-4');
  });

  it('unties a deleted budget from every channel', () => {
    budgetsRepository.deleteBudget('budget-2');
    expect(budgetsRepository.listChannels().find((c) => c.id === 'channel-2')?.budget_ids).toEqual([]);
  });

  it('adds, pauses and removes channels', () => {
    const added = budgetsRepository.addChannel({ provider: 'email', alert_scope: 'global', budget_ids: ['ignored'], email_addresses: ['a@x.com'], webhook_url: '' });
    expect(added).toMatchObject({ enabled: true, budget_ids: [] });
    budgetsRepository.setChannelEnabled(added.id, false);
    expect(budgetsRepository.listChannels().find((c) => c.id === added.id)?.enabled).toBe(false);
    budgetsRepository.removeChannel(added.id);
    expect(budgetsRepository.listChannels().some((c) => c.id === added.id)).toBe(false);
  });
});
