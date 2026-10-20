/**
 * PROTOTYPE MOCK DATA. Modeled on a real single-HANA-system deep-dive view
 * (host vitals, service list, 24h timeline) — distinct from mockSapData.ts's
 * fleet-wide systems list. No backend contract exists yet; none of this is
 * live telemetry.
 */
export interface HanaService {
  name: string;
  status: 'running' | 'stopped';
  /** Heap in use. */
  memoryMb: number;
  allocatedMb: number;
  sharedMb: number;
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
  sessions: { active: 3, uniqueUsers: 1, byUser: [{ user: 'SYSTEM', sessions: 3 }] },
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
  { name: 'hdbindexserver', status: 'running', memoryMb: 28_400, allocatedMb: 38_912, sharedMb: 1843 },
  { name: 'hdbnameserver', status: 'running', memoryMb: 4_200, allocatedMb: 6_144, sharedMb: 614 },
  { name: 'hdbcompileserver', status: 'running', memoryMb: 1_100, allocatedMb: 1_536, sharedMb: 102 },
  { name: 'hdbpreprocessor', status: 'running', memoryMb: 480, allocatedMb: 768, sharedMb: 82 },
  { name: 'hdbwebdispatcher', status: 'running', memoryMb: 620, allocatedMb: 1_024, sharedMb: 102 },
  { name: 'hdbxsengine', status: 'running', memoryMb: 3_900, allocatedMb: 5_632, sharedMb: 819 },
  { name: 'hdbdiserver', status: 'stopped', memoryMb: 0, allocatedMb: 0, sharedMb: 0 },
  { name: 'hdbdocstore', status: 'running', memoryMb: 210, allocatedMb: 512, sharedMb: 61 },
  { name: 'hdbesserver', status: 'running', memoryMb: 340, allocatedMb: 768, sharedMb: 62 },
];

export interface HanaDiskPartition {
  usage: 'DATA' | 'DATA_BACKUP' | 'LOG' | 'LOG_BACKUP+CATALOG_BACKUP' | 'TRACE';
  usedGb: number;
  freeGb: number;
  totalGb: number;
  host: string;
  path: string;
  mount: string;
  device: string;
}

/** Sizes follow the host's mounts on the ABAP Performance page (/hana/data, /hana/log, /hana/shared). The
 * backup, log-backup and trace directories sit on the same /hana/shared volume (/dev/sdd). */
export const HANA_DISK_PARTITIONS: HanaDiskPartition[] = [
  { usage: 'DATA', usedGb: 162.19, freeGb: 87.69, totalGb: 249.88, host: 'sapgrc', path: '/hana/data/GRH/', mount: '/hana/data', device: '/dev/sdf' },
  { usage: 'DATA_BACKUP', usedGb: 191.89, freeGb: 107.97, totalGb: 299.85, host: 'sapgrc', path: '/usr/sap/GRH/HDB10/backup/data/', mount: '/hana/shared', device: '/dev/sdd' },
  { usage: 'LOG', usedGb: 21.47, freeGb: 28.47, totalGb: 49.94, host: 'sapgrc', path: '/hana/log/GRH/', mount: '/hana/log', device: '/dev/sde' },
  { usage: 'LOG_BACKUP+CATALOG_BACKUP', usedGb: 191.89, freeGb: 107.97, totalGb: 299.85, host: 'sapgrc', path: '/usr/sap/GRH/HDB10/backup/log/', mount: '/hana/shared', device: '/dev/sdd' },
  { usage: 'TRACE', usedGb: 191.89, freeGb: 107.97, totalGb: 299.85, host: 'sapgrc', path: '/usr/sap/GRH/HDB10/sapgrc/', mount: '/hana/shared', device: '/dev/sdd' },
];

export interface HanaBackupEntry {
  id: string;
  kind: 'Data backup' | 'Log backup' | 'Catalog backup';
  status: 'success' | 'warning' | 'failed';
  startedAt: string;
  durationSec: number;
  sizeGb: number;
  message?: string;
}

/** Fourteen days ending on the sample's "now" (the page's Last fetched is 15:50 on 16 Oct 2026, a Friday). */
const BACKUP_DAYS = 14;
const BACKUP_END = Date.UTC(2026, 9, 16);
const pad = (n: number) => String(n).padStart(2, '0');
const stamp = (dayIndex: number, hour: number, minute: number, second: number) => {
  const d = new Date(BACKUP_END - (BACKUP_DAYS - 1 - dayIndex) * 86_400_000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(hour)}:${pad(minute)}:${pad(second)}`;
};
/** Small repeatable jitter so the series is not a flat line; the sample is fixed, not random per load. */
const jitter = (i: number, span: number) => ((i * 37 + 11) % 100) / 100 * span;

function buildBackups(): HanaBackupEntry[] {
  const out: HanaBackupEntry[] = [];
  for (let day = 0; day < BACKUP_DAYS; day += 1) {
    const isToday = day === BACKUP_DAYS - 1;
    const dataStart = stamp(day, 1, 30, Math.floor(jitter(day, 50)));
    const slow = day === 11;
    const dataSec = slow ? 1140 : Math.round(420 + jitter(day, 120));
    out.push({
      id: `data-${day}`, kind: 'Data backup', status: slow ? 'warning' : 'success', startedAt: dataStart, durationSec: dataSec,
      sizeGb: Math.round((158.4 + day * 0.27) * 100) / 100,
      ...(slow ? { message: 'Completed, but took 19 min against a 14-day average of about 8 min (the backup volume was busy with a restore test).' } : {}),
    });
    const catalogMinute = 30 + Math.ceil(dataSec / 60) + 1;
    out.push({ id: `catalog-${day}`, kind: 'Catalog backup', status: 'success', startedAt: stamp(day, 1, catalogMinute, 12), durationSec: Math.round(3 + jitter(day + 3, 4)), sizeGb: 0.02 });
    const logSlots: Array<[number, number]> = [0, 1, 7, 8].includes(day) ? [[9, 12], [19, 41]] : [[7, 12], [13, 41], [20, 5]];
    logSlots.forEach(([hour, minute], slot) => {
      if (isToday && hour > 14) return;
      const failed = day === 6 && hour === 13;
      out.push({
        id: `log-${day}-${slot}`, kind: 'Log backup', status: failed ? 'failed' : 'success', startedAt: stamp(day, hour, minute, Math.floor(jitter(day * 3 + slot, 55))),
        durationSec: failed ? 60 : Math.round(3 + jitter(day * 3 + slot + 5, 6)), sizeGb: failed ? 0 : Math.round((0.4 + jitter(day * 3 + slot + 9, 1.6)) * 100) / 100,
        ...(failed ? { message: 'Backup to /usr/sap/GRH/HDB10/backup/log/ failed: file system I/O timeout. The next log backup succeeded and covered the gap.' } : {}),
      });
    });
  }
  return out;
}

export const HANA_BACKUPS: HanaBackupEntry[] = buildBackups();
