import type { CloudProviderId, CloudResource, CostAnalyticsDataset, OptimizationOpportunity, Reservation, SavingsRealisationPoint } from '../contracts/cloud';
import { MOCK_CLOUD_RESOURCES, MOCK_COST_ANALYTICS, MOCK_OPTIMIZATION_OPPORTUNITIES, MOCK_RESERVATIONS, MOCK_SAVINGS_REALISATION } from '../../demo/cloud/mockCloudInsights';
import { MOCK_AZURE_ACCOUNTS } from '../../demo/azure/mockAzureData';
import { MOCK_AWS_ACCOUNTS } from '../../demo/aws/mockAwsData';
import { MOCK_GCP_ACCOUNTS } from '../../demo/gcp/mockGcpData';
import { MOCK_BTP_ACCOUNTS } from '../../demo/btp/mockBtpData';
import { isEmptyWorkspace } from './workspaceProfile';
import { workspaceStore } from './workspaceStore';
import { cloudSamplesRepository } from './cloudSamplesRepository';

/**
 * Cross-provider Cloud Cost data (analytics, inventory, reservations, optimization).
 * PROTOTYPE: backed by the seeded provider samples in src/demo; swap each body for the
 * matching REST call through ./rest when the aggregate endpoints exist. Returns copies.
 *
 * A populated organisation sees the whole sample. A new organisation sees only the providers it has
 * connected, with the account names replaced by its own, so analytics, inventory, reservations and
 * savings all agree with the provider pages.
 */
const FIRST_SAMPLE_ACCOUNT: Record<CloudProviderId, string> = {
  azure: MOCK_AZURE_ACCOUNTS[0].name,
  aws: MOCK_AWS_ACCOUNTS[0].name,
  gcp: MOCK_GCP_ACCOUNTS[0].name,
  btp: MOCK_BTP_ACCOUNTS[0].name,
};

const scoped = () => isEmptyWorkspace();
const connected = (): Set<CloudProviderId> => new Set(workspaceStore.connectedProviders());
const firstAccountName = (provider: CloudProviderId): string | undefined => workspaceStore.list(provider)[0]?.name;
const rename = (text: string, provider: CloudProviderId): string => {
  const name = firstAccountName(provider);
  return name ? text.split(FIRST_SAMPLE_ACCOUNT[provider]).join(name) : text;
};

export const cloudInsightsRepository = {
  getCostAnalytics(): CostAnalyticsDataset {
    const dataset = structuredClone(MOCK_COST_ANALYTICS);
    if (!scoped()) return dataset;
    const providers = connected();
    const accountRows = (['azure', 'aws', 'gcp', 'btp'] as const).filter((p) => providers.has(p)).flatMap((provider) => {
      const summaries = provider === 'azure' ? cloudSamplesRepository.azure.summaries(workspaceStore.list('azure'))
        : provider === 'aws' ? cloudSamplesRepository.aws.summaries(workspaceStore.list('aws'))
        : provider === 'gcp' ? cloudSamplesRepository.gcp.summaries(workspaceStore.list('gcp'))
        : cloudSamplesRepository.btp.summaries(workspaceStore.list('btp'));
      const accounts = workspaceStore.list(provider);
      const currency = provider === 'btp' ? 'EUR' : 'USD';
      return summaries.map((s, i) => ({ provider, name: accounts[i].name, cost: Math.round(s.totalCost * 100) / 100, previousCost: null, currency }));
    });
    return {
      ...dataset,
      monthly: dataset.monthly.filter((m) => providers.has(m.provider)),
      services: dataset.services.filter((r) => providers.has(r.provider)),
      regions: dataset.regions.filter((r) => providers.has(r.provider)),
      accounts: accountRows,
      providersWithoutHistory: dataset.providersWithoutHistory.filter((p) => providers.has(p)),
    };
  },
  listResources(): CloudResource[] {
    const all = structuredClone(MOCK_CLOUD_RESOURCES);
    if (!scoped()) return all;
    const providers = connected();
    return all.filter((r) => providers.has(r.provider)).map((r) => ({ ...r, account: rename(r.account, r.provider), group: r.provider === 'aws' ? rename(r.group, 'aws') : r.group }));
  },
  listReservations(): Reservation[] {
    const all = structuredClone(MOCK_RESERVATIONS);
    if (!scoped()) return all;
    const providers = connected();
    return all.filter((r) => providers.has(r.provider)).map((r) => ({ ...r, scope: rename(r.scope, r.provider) }));
  },
  listOptimizationOpportunities(): OptimizationOpportunity[] {
    const all = structuredClone(MOCK_OPTIMIZATION_OPPORTUNITIES);
    if (!scoped()) return all;
    const providers = connected();
    return all.filter((o) => providers.has(o.provider)).map((o) => ({ ...o, resource: rename(o.resource, o.provider) }));
  },
  /** Month by month, the share of identified optimisation savings that had been applied. */
  getSavingsRealisation(): SavingsRealisationPoint[] {
    // A new organisation has applied nothing yet: no history to chart.
    return scoped() ? [] : structuredClone(MOCK_SAVINGS_REALISATION);
  },
};
