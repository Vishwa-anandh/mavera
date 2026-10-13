export type SapCondition = 'healthy' | 'warning' | 'critical';

export interface SapSystem {
  id: string;
  name: string;
  environment: string;
  condition: SapCondition;
  cpuPercent: number;
  memoryPercent: number;
  lastCollection: string;
}

/**
 * SAP Monitoring has no backend contract yet (MAVERA_DESIGN_SYSTEM.md §18.3
 * — actual monitoring cadence/thresholds must come from the real
 * integration owner). This static data exists only so the module's layout
 * is genuinely demonstrable in this prototype; none of it is live telemetry.
 */
export const MOCK_SAP_SYSTEMS: SapSystem[] = [
  { id: 'S4H-PROD', name: 'S4H-PROD', environment: 'Production', condition: 'healthy', cpuPercent: 32, memoryPercent: 28, lastCollection: '2 minutes ago' },
  { id: 'S4H-QA', name: 'S4H-QA', environment: 'QA', condition: 'healthy', cpuPercent: 18, memoryPercent: 22, lastCollection: '2 minutes ago' },
  { id: 'ECC-PROD', name: 'ECC-PROD', environment: 'Production', condition: 'warning', cpuPercent: 72, memoryPercent: 68, lastCollection: '3 minutes ago' },
  { id: 'HANA-PRD', name: 'HANA-PRD', environment: 'Production', condition: 'critical', cpuPercent: 92, memoryPercent: 88, lastCollection: '1 minute ago' },
  { id: 'S4H-DEV', name: 'S4H-DEV', environment: 'Development', condition: 'healthy', cpuPercent: 26, memoryPercent: 30, lastCollection: '5 minutes ago' },
];

export function sapConditionCounts(systems: SapSystem[]): Record<SapCondition, number> {
  return systems.reduce(
    (acc, system) => {
      acc[system.condition] += 1;
      return acc;
    },
    { healthy: 0, warning: 0, critical: 0 } as Record<SapCondition, number>,
  );
}
