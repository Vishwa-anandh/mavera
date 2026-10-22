import type { AlertChannel, Budget, CloudAccountOption, NewAlertChannel, NewBudget } from '../contracts/budgets';
import { MOCK_BUDGETS, MOCK_CHANNELS, allCloudAccountOptions } from '../../demo/budgets/mockBudgetsData';
import { getWorkspaceProfile, onWorkspaceProfileChange } from './workspaceProfile';
import { workspaceStore } from './workspaceStore';

/**
 * Budgets and their alert channels. PROTOTYPE: held in memory for the browser session (they come
 * back after a reload); swap each body for the `/budgets` and `/integrations` calls through ./rest
 * when the backend is wired. Every method returns copies.
 */
let budgets: Budget[] = [];
let channels: AlertChannel[] = [];
let nextBudget = 1;
let nextChannel = 1;

/** A brand-new organisation (empty profile) has no budgets and no alert channels. */
function seed(): void {
  const empty = getWorkspaceProfile() === 'empty';
  budgets = empty ? [] : structuredClone(MOCK_BUDGETS);
  channels = empty ? [] : structuredClone(MOCK_CHANNELS);
  nextBudget = budgets.length + 1;
  nextChannel = channels.length + 1;
}
seed();
onWorkspaceProfileChange(seed);

const PROVIDER_LABEL = { azure: 'Azure', aws: 'AWS', btp: 'SAP BTP', gcp: 'GCP' } as const;

export const budgetsRepository = {
  listBudgets(): Budget[] {
    return structuredClone(budgets);
  },

  listChannels(): AlertChannel[] {
    return structuredClone(channels);
  },

  /** Populated organisations list the sample accounts; a new one lists whatever it has connected. */
  listCloudAccounts(): CloudAccountOption[] {
    if (getWorkspaceProfile() !== 'empty') return allCloudAccountOptions();
    return (['azure', 'aws', 'btp', 'gcp'] as const).flatMap((provider) =>
      workspaceStore.list(provider).map((a) => ({ id: a.id, name: `${PROVIDER_LABEL[provider]} - ${a.name}`, provider })),
    );
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
    seed();
  },
};
