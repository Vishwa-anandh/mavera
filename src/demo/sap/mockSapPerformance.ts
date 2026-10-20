/** PROTOTYPE MOCK DATA — a single ABAP system's performance deep dive.
 * A metric the source system doesn't report is `null` (the GRC sample returned 0 for its
 * buffer hit ratio and memory, which means "not collected", not a real 0%). */
export const SAP_PERFORMANCE: {
  system: string; status: 'Connected'; lastFetched: string; nextSyncMinutes: number; responseTimeMs: number; activeUsers: number;
  dbHitRatioPercent: number | null; workProcessesUsed: number; workProcessesTotal: number; abapDumps: number; abortedJobs: number;
  memoryUsagePercent: number | null; systemLocks: number;
} = {
  system: 'ABAP',
  status: 'Connected',
  lastFetched: '15:37:05',
  nextSyncMinutes: 4,
  responseTimeMs: 53,
  activeUsers: 11,
  dbHitRatioPercent: null,
  workProcessesUsed: 2,
  workProcessesTotal: 20,
  abapDumps: 0,
  abortedJobs: 0,
  memoryUsagePercent: null,
  systemLocks: 0,
};

export interface ServerTopologyNode {
  id: string;
  host: string;
  loadPercent: number;
  status: 'Active' | 'Inactive';
  responseMs: number;
  users: number;
  quality: number;
  steps: number;
}

export const SAP_SERVER_TOPOLOGY: ServerTopologyNode[] = [
  { id: 'sapgrc_GRC_00', host: 'sapgrc:tick-port', loadPercent: 3, status: 'Active', responseMs: 53, users: 11, quality: 6, steps: 43 },
];

export interface DiskMount {
  path: string;
  usedGb: number;
  freeGb: number;
  totalGb: number;
  percent: number;
}

/** The /hana/* mounts match the partitions on the HANA page (same host, same sizes). */
export const SAP_DISK_USAGE: DiskMount[] = [
  { path: '/', usedGb: 29.4, freeGb: 30.6, totalGb: 60.0, percent: 49 },
  { path: '/home', usedGb: 29.4, freeGb: 30.6, totalGb: 60.0, percent: 49 },
  { path: '/usr/sap', usedGb: 11.8, freeGb: 18.1, totalGb: 29.9, percent: 39 },
  { path: '/sapmnt', usedGb: 1.6, freeGb: 23.3, totalGb: 24.9, percent: 7 },
  { path: '/hana/data', usedGb: 162.2, freeGb: 87.7, totalGb: 249.9, percent: 65 },
  { path: '/hana/log', usedGb: 21.5, freeGb: 28.5, totalGb: 49.9, percent: 43 },
  { path: '/hana/shared', usedGb: 191.9, freeGb: 108.0, totalGb: 299.9, percent: 64 },
  { path: '/backup', usedGb: 467.9, freeGb: 31.9, totalGb: 499.8, percent: 94 },
];

export interface BackgroundJob {
  name: string;
  status: 'Scheduled' | 'Running' | 'Finished' | 'Cancelled';
  startedAt: string;
  finishedAt: string | null;
  durationSec: number | null;
  user: string;
  client: string;
}

const finished = (name: string, time: string, durationSec: number, user: string, client: string): BackgroundJob => {
  const [h, m, s] = time.split(':').map(Number);
  const end = h * 3600 + m * 60 + s + durationSec;
  const clock = `${String(Math.floor(end / 3600)).padStart(2, '0')}:${String(Math.floor((end % 3600) / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
  return { name, status: 'Finished', startedAt: `2026-10-16 ${time}`, finishedAt: `2026-10-16 ${clock}`, durationSec, user, client };
};

/** Twenty runs from today: the CALM and workflow jobs the GRC sample ran every few minutes, the collectors, one job
 * still running and one scheduled for 16:00. None aborted, which matches `abortedJobs: 0` above. */
export const SAP_BACKGROUND_JOBS: BackgroundJob[] = [
  finished('SAP_COLLECTOR_FOR_PERFMONITOR', '14:00:04', 37, 'DDIC', '000'),
  finished('RSCOLL00', '14:00:00', 22, 'DDIC', '000'),
  finished('BTCTRNS1', '14:15:10', 2, 'SAPSYS', '000'),
  finished('CALM HEARTBEAT GRC_CALM', '15:02:48', 4, 'PRASHANTH', '000'),
  finished('CALM SCHEDULER GRC_CALM', '14:58:48', 4, 'PRASHANTH', '000'),
  finished('CALM SCHEDULER GRC_CALM', '15:01:48', 4, 'PRASHANTH', '100'),
  finished('CRBPA:DC_CONTROLLER(GRC_CALM)', '14:58:48', 4, 'PRASHANTH', '100'),
  finished('/SDF/CALM_CDM_TR_PROC_CL_DEP-000', '15:03:48', 4, 'PRASHANTH', '000'),
  finished('SAP_WORKFLOW_SYSTEM', '09:45:27', 8, 'DDIC', '200'),
  finished('SAP_WORKFLOW_SYSTEM', '15:01:48', 4, 'DDIC', '200'),
  finished('SAP_WORKFLOW_SYSTEM', '15:03:48', 4, 'DDIC', '200'),
  finished('SAP_WORKFLOW_SYSTEM', '15:05:48', 4, 'DDIC', '200'),
  finished('SAP_MDC_TRIGGER_PROCESS_QUEUE', '15:01:48', 4, 'DDIC', '200'),
  finished('SAP_MDC_TRIGGER_PROCESS_QUEUE', '15:04:48', 4, 'DDIC', '200'),
  finished('SAP_MDC_TRIGGER_PROCESS_QUEUE', '15:05:48', 4, 'DDIC', '200'),
  finished('SAP_PA_PURPOSE_DETERMINATION', '15:05:48', 4, 'BOOMI', '100'),
  finished('SAP_FIN_VIA_JOB', '15:07:48', 4, 'DDIC', '200'),
  finished('RDDIMPDP', '15:10:00', 6, 'DDIC', '000'),
  { name: 'ZBTCH_MONTHLY_CLOSE', status: 'Running', startedAt: '2026-10-16 15:30:00', finishedAt: null, durationSec: null, user: 'ANBARASU', client: '100' },
  { name: 'RDDIMPDP', status: 'Scheduled', startedAt: '2026-10-16 16:00:00', finishedAt: null, durationSec: null, user: 'DDIC', client: '000' },
];

export interface AbapRuntimeError {
  id: string;
  program: string;
  errorType: string;
  occurredAt: string;
  user: string;
}

/** Empty on purpose — MIO's own ST22 panel showed "No Runtime Errors" for
 * this system; a real integration would populate this from ST22. */
export const SAP_ABAP_RUNTIME_ERRORS: AbapRuntimeError[] = [];

export interface WorkProcess {
  no: number;
  type: 'DIA' | 'BTC' | 'UPD' | 'ENQ' | 'SPO';
  pid: number;
  status: 'Running' | 'Waiting' | 'Stopped';
  restart: boolean;
  report: string | null;
  user: string | null;
}

const WP_LAYOUT: Array<WorkProcess['type']> = [
  'DIA', 'DIA', 'DIA', 'DIA', 'DIA', 'DIA', 'DIA', 'DIA', 'DIA', 'DIA', 'DIA', 'BTC', 'BTC', 'BTC', 'BTC', 'UPD', 'UPD', 'ENQ', 'SPO', 'SPO',
];

/** Twenty work processes (SM50). Two are busy, matching `workProcessesUsed`: a dialog step and the monthly-close batch job. */
export const SAP_WORK_PROCESSES: WorkProcess[] = WP_LAYOUT.map((type, no) => {
  const base: WorkProcess = { no, type, pid: 1247 + no, status: 'Waiting', restart: true, report: null, user: null };
  if (no === 0) return { ...base, status: 'Running', report: 'SAPLTHFB', user: 'GRC_BTP_USER' };
  if (no === 11) return { ...base, status: 'Running', report: 'ZBTCH_MONTHLY_CLOSE', user: 'ANBARASU' };
  return base;
});

export interface BufferStat {
  buffer: string;
  hitRatioPercent: number;
  calls: number;
  swaps: number;
}

/** ST02 SAP buffers. This is the SAP application-server buffer hit ratio, a different measure from the database
 * cache hit ratio (`dbHitRatioPercent`), which this system does not report. */
export const SAP_DB_CALL_STATISTICS: {
  bufferHitRatioPercent: number; totalCalls: number; avgCallMs: number; buffers: BufferStat[];
} = {
  bufferHitRatioPercent: 98.6,
  totalCalls: 639_900,
  avgCallMs: 1.8,
  // Calls and the weighted hit ratio are over the last 24 hours, the same window as the DB Calls and Buffer Hit trends.
  buffers: [
    { buffer: 'Nametab (NTAB)', hitRatioPercent: 99.3, calls: 268_720, swaps: 0 },
    { buffer: 'Program (PXA)', hitRatioPercent: 98.9, calls: 118_940, swaps: 0 },
    { buffer: 'Generic key (TABL)', hitRatioPercent: 98.1, calls: 96_220, swaps: 12 },
    { buffer: 'Single record (TABLP)', hitRatioPercent: 96.6, calls: 74_310, swaps: 31 },
    { buffer: 'CUA', hitRatioPercent: 99.2, calls: 52_480, swaps: 0 },
    { buffer: 'Screen', hitRatioPercent: 98.5, calls: 29_230, swaps: 2 },
  ],
};

const hourLabel = (offsetFromNow: number) => `${String((15 + offsetFromNow + 24) % 24).padStart(2, '0')}:00`;
const hourly = (values: number[]) => values.map((value, i) => ({ time: hourLabel(i - (values.length - 1)), value }));

/** 24 hourly points ending at the 15:00 bucket. */
export const SAP_PERFORMANCE_TRENDS = {
  bufferHit: hourly([98.2, 98.4, 98.9, 99.1, 99.2, 99.3, 99.3, 99.2, 99.0, 98.8, 98.6, 98.1, 97.6, 97.9, 98.3, 98.5, 98.7, 98.4, 98.2, 98.0, 98.3, 98.5, 98.6, 98.6]),
  dbCalls: hourly([14_200, 11_800, 9_400, 8_100, 7_600, 7_900, 9_800, 18_400, 31_200, 44_700, 48_200, 46_100, 39_800, 42_300, 47_900, 45_600, 41_200, 36_800, 29_400, 24_100, 21_300, 19_800, 17_900, 16_400]),
  dumps: [
    { time: '10 Oct', value: 0 }, { time: '11 Oct', value: 0 }, { time: '12 Oct', value: 2 }, { time: '13 Oct', value: 0 },
    { time: '14 Oct', value: 0 }, { time: '15 Oct', value: 1 }, { time: '16 Oct', value: 0 },
  ],
};
