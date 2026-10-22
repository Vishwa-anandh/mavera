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

/** Landscape facts the dashboard consolidates (health mix, HANA memory, unread alerts, findings). */
export function useSapFleetSnapshot(): SapFleetSnapshot {
  return useMemo(() => {
    const systems = sapRepository.listSystems();
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
  }, []);
}
