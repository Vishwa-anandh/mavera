/**
 * Contracts for the organisation workspace: which cloud accounts an organisation has connected,
 * and how far through first-time setup it is. The account records are structurally the same
 * shapes the four provider features use, so a record can be handed straight to their pages.
 */
export type WorkspaceProvider = 'azure' | 'aws' | 'gcp' | 'btp';

/**
 * What a demo organisation starts with. `populated` is today's sample organisation (two accounts per
 * provider, budgets, alerts, invoices, SAP systems); `empty` is a brand-new organisation with nothing
 * connected, whose data appears only as accounts are connected.
 */
export type WorkspaceProfile = 'populated' | 'empty';

export interface WorkspaceAccountBase {
  id: string;
  name: string;
  /** True for an account connected during this session: its cost data is the provider's sample dataset. */
  sample?: boolean;
}

export interface AzureAccountRecord extends WorkspaceAccountBase {
  subscriptionId: string;
  tenantId: string;
  clientId: string;
}

export interface AwsAccountRecord extends WorkspaceAccountBase {
  region: string;
  accessKey: string;
}

export interface GcpAccountRecord extends WorkspaceAccountBase {
  projectId: string;
}

export interface BtpAccountRecord extends WorkspaceAccountBase {
  targetUrl: string;
  region?: string;
  hasCis: boolean;
}

export interface WorkspaceAccountsByProvider {
  azure: AzureAccountRecord[];
  aws: AwsAccountRecord[];
  gcp: GcpAccountRecord[];
  btp: BtpAccountRecord[];
}

/** What the connect forms hand over: everything but the generated id. */
export type NewWorkspaceAccount<P extends WorkspaceProvider> = Omit<WorkspaceAccountsByProvider[P][number], 'id' | 'sample'>;

export type WorkspaceAccountRecord = WorkspaceAccountsByProvider[WorkspaceProvider][number];

/** The steps of the getting-started checklist; each is derived from the stores, never stored. */
export type OnboardingStepId = 'cloud' | 'sap' | 'budget' | 'alerts' | 'teammate' | 'tour';

export interface OnboardingStep {
  id: OnboardingStepId;
  label: string;
  done: boolean;
  /** The subscribed module the step belongs to; absent when it applies to every organisation. */
  module?: 'cloudCost' | 'sapMonitoring';
}

export interface OnboardingState {
  steps: OnboardingStep[];
  doneCount: number;
  /** The user closed the checklist; it can be reopened. */
  dismissed: boolean;
  /** The guided tour was taken (the one step that cannot be derived from data). */
  tourDone: boolean;
}

/** The counts the live coach compares to notice that a step was done; each one only ever changes through its own page. */
export interface WorkspaceProgressSignals {
  accounts: number;
  destinations: number;
  budgets: number;
  recipients: number;
  members: number;
}

/** Per-provider current-month sample spend for the connected accounts, as the dashboard shows it. */
export interface WorkspaceSampleSpend {
  provider: WorkspaceProvider;
  accounts: number;
  /** Sum of the sample current-month totals of the connected accounts. */
  total: number;
  currency: string;
}
