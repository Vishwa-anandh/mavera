/**
 * PROTOTYPE MOCK DATA. Modeled on a real single-HANA-system deep-dive view
 * (host vitals, service list, 24h timeline) — distinct from mockSapData.ts's
 * fleet-wide systems list. No backend contract exists yet; none of this is
 * live telemetry.
 */
export interface HanaService {
  name: string;
  status: 'running' | 'stopped';
  memoryMb: number;
}

export interface HanaVitalPoint {
  time: string;
  cpuPercent: number;
  memoryPercent: number;
}

export const HANA_SYSTEM = {
  name: 'GRH',
  type: 'HANA',
  host: 'sapgrc',
  version: '2.00.089.02.1774343488',
  lastFetched: '15:50:33',
  nextSyncMinutes: 29,
  memory: { usedGb: 55, totalGb: 106, freeGb: 51, percent: 52, condition: 'healthy' as const },
  cpu: { loadPercent: 0.3, swapUsedGb: 0, services: 9, peak24h: 1.1, condition: 'stable' as const },
  alerts: { active: 1, highPriority: 1, critical: 1, high: 0, medium: 0, low: 1 },
  sessions: { active: 3, uniqueUsers: 1 },
};

export const HANA_VITALS_TIMELINE: HanaVitalPoint[] = [
  { time: '12:00', cpuPercent: 0.4, memoryPercent: 28 },
  { time: '13:00', cpuPercent: 0.3, memoryPercent: 28 },
  { time: '14:00', cpuPercent: 0.3, memoryPercent: 28 },
  { time: '15:00', cpuPercent: 0.5, memoryPercent: 29 },
  { time: '16:00', cpuPercent: 0.4, memoryPercent: 29 },
  { time: '17:00', cpuPercent: 0.6, memoryPercent: 29 },
  { time: '18:00', cpuPercent: 1.1, memoryPercent: 30 },
  { time: '19:00', cpuPercent: 0.8, memoryPercent: 29 },
  { time: '20:00', cpuPercent: 0.5, memoryPercent: 29 },
  { time: '21:00', cpuPercent: 0.26, memoryPercent: 29 },
  { time: '22:00', cpuPercent: 0.3, memoryPercent: 28 },
  { time: '23:00', cpuPercent: 0.2, memoryPercent: 27 },
  { time: '00:00', cpuPercent: 0.2, memoryPercent: 27 },
  { time: '01:00', cpuPercent: 0.2, memoryPercent: 27 },
  { time: '02:00', cpuPercent: 0.3, memoryPercent: 28 },
  { time: '03:00', cpuPercent: 0.3, memoryPercent: 28 },
  { time: '04:00', cpuPercent: 0.4, memoryPercent: 29 },
  { time: '05:00', cpuPercent: 0.9, memoryPercent: 30 },
  { time: '06:00', cpuPercent: 1.0, memoryPercent: 30 },
  { time: '07:00', cpuPercent: 0.7, memoryPercent: 29 },
  { time: '08:00', cpuPercent: 0.5, memoryPercent: 29 },
  { time: '09:00', cpuPercent: 0.4, memoryPercent: 28 },
  { time: '10:00', cpuPercent: 0.3, memoryPercent: 28 },
  { time: '11:00', cpuPercent: 0.3, memoryPercent: 28 },
];

export const HANA_SERVICES: HanaService[] = [
  { name: 'hdbindexserver', status: 'running', memoryMb: 28_400 },
  { name: 'hdbnameserver', status: 'running', memoryMb: 4_200 },
  { name: 'hdbcompileserver', status: 'running', memoryMb: 1_100 },
  { name: 'hdbpreprocessor', status: 'running', memoryMb: 480 },
  { name: 'hdbwebdispatcher', status: 'running', memoryMb: 620 },
  { name: 'hdbxsengine', status: 'running', memoryMb: 3_900 },
  { name: 'hdbdiserver', status: 'stopped', memoryMb: 0 },
  { name: 'hdbdocstore', status: 'running', memoryMb: 210 },
  { name: 'hdbesserver', status: 'running', memoryMb: 340 },
];
