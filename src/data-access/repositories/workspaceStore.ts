import type {
  AwsAccountRecord, AzureAccountRecord, BtpAccountRecord, GcpAccountRecord, NewWorkspaceAccount, WorkspaceAccountRecord,
  WorkspaceAccountsByProvider, WorkspaceProfile, WorkspaceProvider,
} from '../contracts/workspace';
import { MOCK_AZURE_ACCOUNTS } from '../../demo/azure/mockAzureData';
import { MOCK_AWS_ACCOUNTS } from '../../demo/aws/mockAwsData';
import { MOCK_GCP_ACCOUNTS } from '../../demo/gcp/mockGcpData';
import { MOCK_BTP_ACCOUNTS } from '../../demo/btp/mockBtpData';
import { getWorkspaceProfile, onWorkspaceProfileChange } from './workspaceProfile';

/**
 * The cloud accounts an organisation has connected, per provider, plus the first-run flags. PROTOTYPE:
 * held in memory and re-seeded from the active profile (see ./workspaceProfile); swap each body for the
 * `/{provider}/accounts` calls through ./rest when the backend is wired. The provider pages read this
 * store instead of fixtures, so connecting, renaming or removing an account is reflected everywhere.
 *
 * Lower level than `workspaceRepository` on purpose: other repositories (budgets, cloud insights, SAP)
 * read the connected accounts from here without depending on the repositories that read them.
 */
export const WORKSPACE_PROVIDERS: readonly WorkspaceProvider[] = ['azure', 'aws', 'gcp', 'btp'];

const ID_PREFIX: Record<WorkspaceProvider, string> = { azure: 'az-acc', aws: 'aws-acc', gcp: 'gcp-acc', btp: 'btp-acc' };

interface Flags {
  /** The user closed the getting-started checklist. */
  dismissed: boolean;
  /** The guided tour was taken. */
  tourDone: boolean;
}

function seedAccounts(profile: WorkspaceProfile): WorkspaceAccountsByProvider {
  if (profile === 'empty') return { azure: [], aws: [], gcp: [], btp: [] };
  return structuredClone({ azure: MOCK_AZURE_ACCOUNTS, aws: MOCK_AWS_ACCOUNTS, gcp: MOCK_GCP_ACCOUNTS, btp: MOCK_BTP_ACCOUNTS }) as WorkspaceAccountsByProvider;
}

let accounts: WorkspaceAccountsByProvider = seedAccounts(getWorkspaceProfile());
let flags: Flags = { dismissed: false, tourDone: false };
/** Highest id number handed out per provider; never goes down, so a removed account's id is not reused. */
let issued: Record<WorkspaceProvider, number> = highestIds();
let version = 0;
const listeners = new Set<() => void>();

function idNumber(id: string): number {
  const match = /-(\d+)$/.exec(id);
  return match ? Number(match[1]) : 0;
}

function highestIds(): Record<WorkspaceProvider, number> {
  const highest = (list: Array<{ id: string }>) => list.reduce((max, a) => Math.max(max, idNumber(a.id)), 0);
  return { azure: highest(accounts.azure), aws: highest(accounts.aws), gcp: highest(accounts.gcp), btp: highest(accounts.btp) };
}

function commit(): void {
  version += 1;
  listeners.forEach((listener) => listener());
}

function replace<P extends WorkspaceProvider>(provider: P, next: WorkspaceAccountsByProvider[P]): void {
  accounts = { ...accounts, [provider]: next };
  commit();
}

onWorkspaceProfileChange((profile) => {
  accounts = seedAccounts(profile);
  flags = { dismissed: false, tourDone: false };
  issued = highestIds();
  commit();
});

export const workspaceStore = {
  /** Changes on every write; a stable snapshot for `useSyncExternalStore`. */
  getVersion(): number {
    return version;
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  list<P extends WorkspaceProvider>(provider: P): WorkspaceAccountsByProvider[P] {
    return structuredClone(accounts[provider]);
  },
  get<P extends WorkspaceProvider>(provider: P, id: string): WorkspaceAccountsByProvider[P][number] | undefined {
    const found = (accounts[provider] as WorkspaceAccountRecord[]).find((a) => a.id === id);
    return found ? structuredClone(found) as WorkspaceAccountsByProvider[P][number] : undefined;
  },
  count(provider?: WorkspaceProvider): number {
    return provider ? accounts[provider].length : WORKSPACE_PROVIDERS.reduce((sum, p) => sum + accounts[p].length, 0);
  },
  /** Providers with at least one connected account, in the fixed order azure, aws, gcp, btp. */
  connectedProviders(): WorkspaceProvider[] {
    return WORKSPACE_PROVIDERS.filter((p) => accounts[p].length > 0);
  },

  /** Adds an account (flagged as sample data: its costs are the provider's sample dataset) and returns it. */
  add<P extends WorkspaceProvider>(provider: P, input: NewWorkspaceAccount<P>): WorkspaceAccountsByProvider[P][number] {
    issued = { ...issued, [provider]: issued[provider] + 1 };
    const record = { ...input, id: `${ID_PREFIX[provider]}-${issued[provider]}`, sample: true } as WorkspaceAccountsByProvider[P][number];
    replace(provider, [...accounts[provider], record] as WorkspaceAccountsByProvider[P]);
    return structuredClone(record);
  },
  rename(provider: WorkspaceProvider, id: string, name: string): void {
    const clean = name.trim();
    if (!clean) return;
    replace(provider, (accounts[provider] as WorkspaceAccountRecord[]).map((a) => (a.id === id ? { ...a, name: clean } : a)) as never);
  },
  remove(provider: WorkspaceProvider, id: string): boolean {
    const before = accounts[provider].length;
    const next = (accounts[provider] as WorkspaceAccountRecord[]).filter((a) => a.id !== id);
    if (next.length === before) return false;
    replace(provider, next as never);
    return true;
  },

  getFlags(): Flags {
    return { ...flags };
  },
  setFlags(patch: Partial<Flags>): void {
    flags = { ...flags, ...patch };
    commit();
  },

  /** Back to the seed of the active profile. */
  reset(): void {
    accounts = seedAccounts(getWorkspaceProfile());
    flags = { dismissed: false, tourDone: false };
    issued = highestIds();
    commit();
  },
};

export type { AwsAccountRecord, AzureAccountRecord, BtpAccountRecord, GcpAccountRecord };
