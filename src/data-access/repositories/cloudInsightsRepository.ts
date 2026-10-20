import type { CloudResource, CostAnalyticsDataset, OptimizationOpportunity, Reservation, SavingsRealisationPoint } from '../contracts/cloud';
import { MOCK_CLOUD_RESOURCES, MOCK_COST_ANALYTICS, MOCK_OPTIMIZATION_OPPORTUNITIES, MOCK_RESERVATIONS, MOCK_SAVINGS_REALISATION } from '../../demo/cloud/mockCloudInsights';

/**
 * Cross-provider Cloud Cost data (analytics, inventory, reservations, optimization).
 * PROTOTYPE: backed by the seeded provider samples in src/demo; swap each body for the
 * matching REST call through ./rest when the aggregate endpoints exist. Returns copies.
 */
export const cloudInsightsRepository = {
  getCostAnalytics(): CostAnalyticsDataset {
    return structuredClone(MOCK_COST_ANALYTICS);
  },
  listResources(): CloudResource[] {
    return structuredClone(MOCK_CLOUD_RESOURCES);
  },
  listReservations(): Reservation[] {
    return structuredClone(MOCK_RESERVATIONS);
  },
  listOptimizationOpportunities(): OptimizationOpportunity[] {
    return structuredClone(MOCK_OPTIMIZATION_OPPORTUNITIES);
  },
  /** Month by month, the share of identified optimisation savings that had been applied. */
  getSavingsRealisation(): SavingsRealisationPoint[] {
    return structuredClone(MOCK_SAVINGS_REALISATION);
  },
};
