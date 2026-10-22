import type {
  NewWorkspaceAccount, OnboardingState, OnboardingStep, WorkspaceAccountsByProvider, WorkspaceProfile, WorkspaceProvider, WorkspaceSampleSpend,
} from '../contracts/workspace';
import { accessRepository } from './accessRepository';
import { budgetsRepository } from './budgetsRepository';
import { cloudSamplesRepository } from './cloudSamplesRepository';
import { sapAdminRepository } from './sapAdminRepository';
import { smartAlertsRepository } from './smartAlertsRepository';
import { getWorkspaceProfile, setWorkspaceProfile } from './workspaceProfile';
import { WORKSPACE_PROVIDERS, workspaceStore } from './workspaceStore';

/**
 * The organisation's workspace: the cloud accounts it has connected and how far through first-time setup it
 * is. PROTOTYPE: in memory and re-seeded from the active profile when a demo account signs in or out, so one
 * demo login never sees another's changes; swap each body for the `/{provider}/accounts` calls through ./rest
 * when the backend is wired.
 *
 * - A `populated` organisation starts with today's sample accounts, budgets, alerts, invoices and SAP systems.
 * - An `empty` organisation (a brand-new one) starts with nothing connected. Connecting an account gives it
 *   the provider's sample cost dataset under the account's own name (see cloudSamplesRepository), so every
 *   page lights up consistently. That data is sample data, and the pages say so.
 *
 * SAP systems are SAP destinations and live in `sapAdminRepository`; this repository only reads them for the
 * checklist.
 */
const STEP_LABELS: Record<OnboardingStep['id'], string> = {
  cloud: 'Connect a cloud account',
  sap: 'Connect an SAP system',
  budget: 'Create a budget',
  alerts: 'Add alert recipients',
  teammate: 'Invite a teammate',
  tour: 'Take the guided tour',
};

/** Which subscribed module a step belongs to; absent means every organisation. */
const STEP_MODULE: Partial<Record<OnboardingStep['id'], OnboardingStep['module']>> = {
  cloud: 'cloudCost', budget: 'cloudCost', sap: 'sapMonitoring',
};

function onboarding(): OnboardingState {
  const flags = workspaceStore.getFlags();
  const hasRecipients = smartAlertsRepository.listRecipients().some((c) => c.recipients.length > 0) || sapAdminRepository.alerts.listRecipients().length > 0;
  const done: Record<OnboardingStep['id'], boolean> = {
    cloud: workspaceStore.count() > 0,
    sap: sapAdminRepository.destinations.count() > 0,
    budget: budgetsRepository.listBudgets().length > 0,
    alerts: hasRecipients,
    teammate: accessRepository.getSnapshot().members.length > 1,
    tour: flags.tourDone,
  };
  const steps = (Object.keys(STEP_LABELS) as Array<OnboardingStep['id']>).map((id): OnboardingStep => ({ id, label: STEP_LABELS[id], done: done[id], module: STEP_MODULE[id] }));
  return { steps, doneCount: steps.filter((s) => s.done).length, dismissed: flags.dismissed, tourDone: flags.tourDone };
}

export const workspaceRepository = {
  // ---- change notification (for useSyncExternalStore) ----
  getVersion: workspaceStore.getVersion,
  subscribe: workspaceStore.subscribe,

  // ---- profile ----
  getProfile(): WorkspaceProfile {
    return getWorkspaceProfile();
  },
  /** Selects the profile and re-seeds every store from it (a demo sign-in or sign-out). */
  setProfile(profile: WorkspaceProfile): void {
    setWorkspaceProfile(profile);
  },

  // ---- accounts ----
  listAccounts: workspaceStore.list,
  getAccount: workspaceStore.get,
  accountCount: workspaceStore.count,
  connectedProviders: workspaceStore.connectedProviders,
  /** Every connected account across the four providers, with its provider. */
  listAll(): Array<{ provider: WorkspaceProvider; id: string; name: string }> {
    return WORKSPACE_PROVIDERS.flatMap((provider) => workspaceStore.list(provider).map((a) => ({ provider, id: a.id, name: a.name })));
  },

  /** True when any connected account runs on the provider's sample dataset (every account connected in this prototype does). */
  hasSampleAccounts(): boolean {
    return WORKSPACE_PROVIDERS.some((provider) => workspaceStore.list(provider).some((a) => a.sample));
  },

  /**
   * Connects an account. It has no live feed in this prototype, so it is shown the provider's sample dataset
   * under its own name; a new organisation's first account of a provider also brings that provider's sample
   * alerts. Returns the stored record (with its generated id).
   */
  addConnectedAccount<P extends WorkspaceProvider>(provider: P, input: NewWorkspaceAccount<P>): WorkspaceAccountsByProvider[P][number] {
    const record = workspaceStore.add(provider, input);
    if (getWorkspaceProfile() === 'empty') smartAlertsRepository.seedSampleAlerts(provider, record.id);
    return record;
  },
  renameAccount(provider: WorkspaceProvider, id: string, name: string): void {
    workspaceStore.rename(provider, id, name);
  },
  removeAccount(provider: WorkspaceProvider, id: string): boolean {
    const removed = workspaceStore.remove(provider, id);
    if (removed && getWorkspaceProfile() === 'empty') smartAlertsRepository.removeForAccount(id);
    return removed;
  },

  /** Current-month sample spend of the connected accounts per provider: what a new organisation's dashboard sums. */
  sampleSpend(): WorkspaceSampleSpend[] {
    return cloudSamplesRepository.sampleSpend();
  },

  // ---- first-run checklist ----
  onboarding,
  dismissOnboarding(dismissed = true): void {
    workspaceStore.setFlags({ dismissed });
  },
  markTourDone(): void {
    workspaceStore.setFlags({ tourDone: true });
  },

  /** Back to the seed of the active profile (tests, and "reset demo"). */
  reset(): void {
    setWorkspaceProfile(getWorkspaceProfile());
  },
};
