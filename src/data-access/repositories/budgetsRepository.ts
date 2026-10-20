import type { AlertChannel, Budget, CloudAccountOption, NewAlertChannel, NewBudget } from '../contracts/budgets';
import { MOCK_BUDGETS, MOCK_CHANNELS, allCloudAccountOptions } from '../../demo/budgets/mockBudgetsData';

/**
 * Budgets and their alert channels. PROTOTYPE: held in memory for the browser session (they come
 * back after a reload); swap each body for the `/budgets` and `/integrations` calls through ./rest
 * when the backend is wired. Every method returns copies.
 */
let budgets: Budget[] = structuredClone(MOCK_BUDGETS);
let channels: AlertChannel[] = structuredClone(MOCK_CHANNELS);
let nextBudget = MOCK_BUDGETS.length + 1;
let nextChannel = MOCK_CHANNELS.length + 1;

export const budgetsRepository = {
  listBudgets(): Budget[] {
    return structuredClone(budgets);
  },

  listChannels(): AlertChannel[] {
    return structuredClone(channels);
  },

  listCloudAccounts(): CloudAccountOption[] {
    return allCloudAccountOptions();
  },

  /** Creates a budget; `channel_ids` also ties those budget-based channels to it. */
  createBudget(input: NewBudget): Budget {
    const { channel_ids = [], ...fields } = input;
    const budget: Budget = { ...fields, id: `budget-${nextBudget++}` };
    budgets = [...budgets, budget];
    channels = channels.map((c) => (c.alert_scope === 'budget_specific' && channel_ids.includes(c.id) ? { ...c, budget_ids: [...c.budget_ids, budget.id] } : c));
    return structuredClone(budget);
  },

  /** Deletes a budget and unties it from every channel (a budget-based channel may be left with none). */
  deleteBudget(id: string): void {
    budgets = budgets.filter((b) => b.id !== id);
    channels = channels.map((c) => (c.budget_ids.includes(id) ? { ...c, budget_ids: c.budget_ids.filter((b) => b !== id) } : c));
  },

  addChannel(input: NewAlertChannel): AlertChannel {
    const channel: AlertChannel = {
      ...input,
      enabled: input.enabled ?? true,
      budget_ids: input.alert_scope === 'global' ? [] : [...input.budget_ids],
      id: `channel-${nextChannel++}`,
      created_at: new Date().toISOString(),
    };
    channels = [...channels, channel];
    return structuredClone(channel);
  },

  setChannelEnabled(id: string, enabled: boolean): void {
    channels = channels.map((c) => (c.id === id ? { ...c, enabled } : c));
  },

  removeChannel(id: string): void {
    channels = channels.filter((c) => c.id !== id);
  },

  /** Back to the seeded sample data (tests, and "reset demo"). */
  reset(): void {
    budgets = structuredClone(MOCK_BUDGETS);
    channels = structuredClone(MOCK_CHANNELS);
    nextBudget = MOCK_BUDGETS.length + 1;
    nextChannel = MOCK_CHANNELS.length + 1;
  },
};
