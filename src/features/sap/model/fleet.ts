import { useMemo } from 'react';
import { sapRepository, type SapCondition } from '../../../data-access';
import { fleetInsights, type Insight } from './sapInsights';

export interface SapFleetSnapshot {
  insights: Insight[];
  counts: Record<SapCondition, number>;
  systemCount: number;
  hanaMemoryPercent: number;
  unreadAlerts: number;
}

/** Landscape facts the dashboard consolidates (health mix, HANA memory, unread alerts, findings). Pass a changing `version` to re-read after an alert changed, and an `environment` to see only that landscape role. */
export function useSapFleetSnapshot(version = 0, environment = 'all'): SapFleetSnapshot {
  return useMemo(() => {
    // `environment` ("production", "qa", "development" or "all") narrows the systems, and with them the health mix and the per-system findings.
    const systems = sapRepository.listSystems().filter((s) => environment === 'all' || s.environment.trim().toLowerCase() === environment);
    const alerts = sapRepository.listAlerts();
    const counts: Record<SapCondition, number> = { healthy: 0, warning: 0, critical: 0 };
    for (const s of systems) counts[s.condition] += 1;
    return {
      insights: fleetInsights({
        systems,
        alerts,
        jobs: sapRepository.listJobs(),
        dumps: sapRepository.listDumps(),
        disks: sapRepository.listDiskMounts(),
        notes: sapRepository.getSecurityNoteSummary(),
      }),
      counts,
      systemCount: systems.length,
      hanaMemoryPercent: sapRepository.isConnected() ? sapRepository.getHana().system.memory.percent : 0,
      unreadAlerts: alerts.filter((a) => !a.read).length,
    };
    // `version` only makes this read the stores again (an alert was resolved or ignored elsewhere).
  }, [version, environment]);
}
