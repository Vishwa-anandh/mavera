import type {
  AzureAccountSummary, AzureFullResponse, AzureTopService, AzureYearlyMonth, CspRecommendation as AzureCspRecommendation,
} from '../../features/azure';
import type { AwsAccountSummary, AwsFullResponse, AwsTopService, AwsYearlyMonth, CspRecommendation as AwsCspRecommendation } from '../../features/aws';
import type { GcpAccountSummary, GcpCosts, GcpTopService } from '../../features/gcp';
import type {
  BtpAccountSummary, BtpCosts, BtpServiceInstance, BtpSmConfig, BtpSubaccount, BtpTopService, BtpYearlyMonth,
} from '../../features/btp';
import type {
  AwsAccountRecord, AzureAccountRecord, BtpAccountRecord, GcpAccountRecord, WorkspaceAccountRecord, WorkspaceProvider, WorkspaceSampleSpend,
} from '../contracts/workspace';
import {
  MOCK_AZURE_ACCOUNTS, MOCK_AZURE_CSP_RECOMMENDATIONS, MOCK_AZURE_FULL, MOCK_AZURE_YEARLY, azureAccountSummaries, azureTopServicesAllAccounts,
} from '../../demo/azure/mockAzureData';
import { MOCK_AWS_CSP_RECOMMENDATIONS, MOCK_AWS_FULL, MOCK_AWS_YEARLY, awsAccountSummaries, awsTopServicesAllAccounts } from '../../demo/aws/mockAwsData';
import { MOCK_GCP_COSTS, gcpAccountSummaries, gcpTopServices } from '../../demo/gcp/mockGcpData';
import {
  MOCK_BTP_COSTS, MOCK_BTP_SERVICE_INSTANCES, MOCK_BTP_SM_CONFIGS, MOCK_BTP_SUBACCOUNTS, MOCK_BTP_YEARLY, btpAccountSummaries, btpCostsForAccount, btpTopServices,
} from '../../demo/btp/mockBtpData';
import { isEmptyWorkspace } from './workspaceProfile';
import { workspaceStore } from './workspaceStore';

/**
 * Cost data for the provider pages. PROTOTYPE: backed by the seeded provider samples in src/demo; swap
 * each body for the `/{provider}/summary|full|yearly` calls through ./rest when the backend is wired.
 *
 * An account the organisation connected during the session (`sample: true`) has no live feed here, so it
 * gets the provider's sample dataset re-labelled with the account's own name, id and identifiers. The
 * seeded demo accounts keep their own fixtures exactly as they were. Reads return copies, and are not
 * cheap: pages memoise them per account.
 */
const round = (n: number) => Math.round(n * 100) / 100;

const isSample = (account: WorkspaceAccountRecord | undefined): boolean => Boolean(account?.sample);

// ---- Azure ------------------------------------------------------------------------------------

const azure = {
  full(account?: AzureAccountRecord): AzureFullResponse {
    const copy = structuredClone(MOCK_AZURE_FULL);
    if (account) copy.billingMetadata = { name: account.name };
    return copy;
  },
  yearly(): AzureYearlyMonth[] {
    return structuredClone(MOCK_AZURE_YEARLY);
  },
  cspRecommendations(account?: AzureAccountRecord): AzureCspRecommendation[] {
    const copy = structuredClone(MOCK_AZURE_CSP_RECOMMENDATIONS);
    // The subscription-wide finding points at the connected subscription.
    return account && isSample(account) ? copy.map((r) => (r.resource_id === MOCK_AZURE_ACCOUNTS[0].subscriptionId ? { ...r, resource_id: account.subscriptionId } : r)) : copy;
  },
  /** One summary per account, in the order given: seeded accounts keep their fixture, connected ones are the sample re-labelled. */
  summaries(accounts: AzureAccountRecord[]): AzureAccountSummary[] {
    const fixtures = azureAccountSummaries();
    const primary = fixtures[0];
    return accounts.map((account) => {
      const fixture = isSample(account) ? undefined : fixtures.find((f) => f.id === account.id);
      const base = fixture ?? { ...primary, budgetStatus: null };
      return { ...structuredClone(base), id: account.id, name: account.name, subscriptionId: account.subscriptionId };
    });
  },
  topServices(accounts: AzureAccountRecord[]): AzureTopService[] {
    if (!accounts.some(isSample)) return azureTopServicesAllAccounts();
    return MOCK_AZURE_FULL.costs.services.map((s) => ({ name: s.name, value: round(s.cost * accounts.length) })).sort((a, b) => b.value - a.value);
  },
};

// ---- AWS --------------------------------------------------------------------------------------

const aws = {
  full(): AwsFullResponse {
    return structuredClone(MOCK_AWS_FULL);
  },
  yearly(): AwsYearlyMonth[] {
    return structuredClone(MOCK_AWS_YEARLY);
  },
  summaries(accounts: AwsAccountRecord[]): AwsAccountSummary[] {
    const fixtures = awsAccountSummaries();
    return accounts.map((account) => {
      const fixture = isSample(account) ? undefined : fixtures.find((f) => f.id === account.id);
      const base = fixture ?? { ...fixtures[0], budgetStatus: null };
      return { ...structuredClone(base), id: account.id };
    });
  },
  topServices(accounts: AwsAccountRecord[]): AwsTopService[] {
    if (!accounts.some(isSample)) return awsTopServicesAllAccounts();
    return MOCK_AWS_FULL.costs.services.map((s) => ({ name: s.name, value: round(s.cost * accounts.length) })).sort((a, b) => b.value - a.value);
  },
};

// ---- Google Cloud -----------------------------------------------------------------------------

const gcp = {
  costs(account?: GcpAccountRecord): GcpCosts {
    const copy = structuredClone(MOCK_GCP_COSTS);
    // The biggest sample project is the one the connected service account bills.
    if (account && isSample(account) && account.projectId && copy.projects.length > 0) copy.projects[0] = { ...copy.projects[0], name: account.projectId };
    return copy;
  },
  summaries(accounts: GcpAccountRecord[]): GcpAccountSummary[] {
    const fixtures = gcpAccountSummaries();
    return accounts.map((account) => {
      const fixture = isSample(account) ? undefined : fixtures.find((f) => f.id === account.id);
      return { ...structuredClone(fixture ?? fixtures[0]), id: account.id, name: account.name };
    });
  },
  topServices(accounts: GcpAccountRecord[]): GcpTopService[] {
    const services = gcpTopServices();
    if (!accounts.some(isSample)) return services;
    return services.map((s) => ({ name: s.name, cost: round(s.cost * accounts.length) }));
  },
};

// ---- SAP BTP ----------------------------------------------------------------------------------

const btp = {
  costs(account: BtpAccountRecord): BtpCosts {
    if (!isSample(account)) return structuredClone(btpCostsForAccount(account.id));
    // A connected account with CIS_Central gets the full hierarchy sample; without it, the flat sandbox sample.
    const copy = structuredClone(account.hasCis ? MOCK_BTP_COSTS : btpCostsForAccount('btp-acc-2'));
    if (copy.globalAccount) copy.globalAccount = { ...copy.globalAccount, displayName: account.name };
    return copy;
  },
  yearly(): BtpYearlyMonth[] {
    return structuredClone(MOCK_BTP_YEARLY);
  },
  summaries(accounts: BtpAccountRecord[]): BtpAccountSummary[] {
    const fixtures = btpAccountSummaries();
    return accounts.map((account) => {
      const fixture = isSample(account) ? undefined : fixtures.find((f) => f.id === account.id);
      const base = fixture ?? { ...(account.hasCis ? fixtures[0] : fixtures[1]), region: account.region };
      return { ...structuredClone(base), id: account.id };
    });
  },
  topServices(accounts: BtpAccountRecord[]): BtpTopService[] {
    const services = btpTopServices();
    const cis = accounts.filter((a) => a.hasCis).length;
    if (!accounts.some(isSample) || cis === 0) return structuredClone(services);
    return services.map((s) => ({ ...s, cost: round(s.cost * cis), previousCost: s.previousCost === undefined ? undefined : round(s.previousCost * cis) }));
  },
  /** The sample subaccount hierarchy (what an account with CIS_Central lists). */
  subaccounts(): BtpSubaccount[] {
    return structuredClone(MOCK_BTP_SUBACCOUNTS);
  },
  serviceInstances(subaccountGuid: string): BtpServiceInstance[] {
    return structuredClone(MOCK_BTP_SERVICE_INSTANCES[subaccountGuid] ?? []);
  },
  smConfig(subaccountGuid: string): BtpSmConfig | undefined {
    const config = MOCK_BTP_SM_CONFIGS[subaccountGuid];
    return config ? { ...config } : undefined;
  },
};

/** Current-month sample spend of the connected accounts, per provider (what the dashboard of a new organisation sums). */
function sampleSpend(): WorkspaceSampleSpend[] {
  const out: WorkspaceSampleSpend[] = [];
  const add = (provider: WorkspaceProvider, accounts: number, total: number, currency: string) => {
    if (accounts > 0) out.push({ provider, accounts, total: round(total), currency });
  };
  const azureTotal = azure.summaries(workspaceStore.list('azure')).reduce((s, a) => s + a.totalCost, 0);
  const awsTotal = aws.summaries(workspaceStore.list('aws')).reduce((s, a) => s + a.totalCost, 0);
  const gcpTotal = gcp.summaries(workspaceStore.list('gcp')).reduce((s, a) => s + a.totalCost, 0);
  const btpTotal = btp.summaries(workspaceStore.list('btp')).reduce((s, a) => s + a.totalCost, 0);
  add('azure', workspaceStore.count('azure'), azureTotal, 'USD');
  add('aws', workspaceStore.count('aws'), awsTotal, 'USD');
  add('gcp', workspaceStore.count('gcp'), gcpTotal, 'USD');
  add('btp', workspaceStore.count('btp'), btpTotal, 'EUR');
  return out;
}

/** What Savings & Optimization computes from: current-month spend and the CSP findings, per connected provider. */
export interface RecommendationInputs {
  spend: Record<WorkspaceProvider, number>;
  azureRecommendations: AzureCspRecommendation[];
  awsRecommendations: AwsCspRecommendation[];
  /** The BTP sample (its services and subaccounts feed the BTP-specific savings model). */
  btpCosts: BtpCosts;
}

function recommendationInputs(): RecommendationInputs {
  const btpCosts = structuredClone(MOCK_BTP_COSTS);
  if (!isEmptyWorkspace()) {
    return {
      spend: { azure: MOCK_AZURE_FULL.costs.totalCost, aws: MOCK_AWS_FULL.costs.totalCost, btp: MOCK_BTP_COSTS.totalCost, gcp: MOCK_GCP_COSTS.totalCost },
      azureRecommendations: structuredClone(MOCK_AZURE_CSP_RECOMMENDATIONS),
      awsRecommendations: structuredClone(MOCK_AWS_CSP_RECOMMENDATIONS),
      btpCosts,
    };
  }
  // A new organisation: only the providers it has connected carry spend and findings.
  const spend: Record<WorkspaceProvider, number> = { azure: 0, aws: 0, btp: 0, gcp: 0 };
  for (const row of sampleSpend()) spend[row.provider] = row.total;
  return {
    spend,
    azureRecommendations: spend.azure > 0 ? structuredClone(MOCK_AZURE_CSP_RECOMMENDATIONS) : [],
    awsRecommendations: spend.aws > 0 ? structuredClone(MOCK_AWS_CSP_RECOMMENDATIONS) : [],
    btpCosts,
  };
}

export const cloudSamplesRepository = { azure, aws, gcp, btp, sampleSpend, recommendationInputs };
