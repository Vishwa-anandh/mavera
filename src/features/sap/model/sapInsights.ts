import type {
  HanaService, HanaSystem, HanaVitalPoint, SapAlertRecord, SapDiskMount, SapDump, SapJob, SapSecurityNoteSummary, SapSystem,
} from '../../../data-access';

export type InsightTone = 'danger' | 'warning' | 'info' | 'success';

export interface Insight {
  id: string;
  tone: InsightTone;
  title: string;
  detail?: string;
  /** Where "open" goes; relative app path. */
  to?: string;
}

/** CPU and memory above this are called out; the Resource load chart draws the same line. */
export const LOAD_THRESHOLD_PERCENT = 80;
const DISK_THRESHOLD_PERCENT = 85;

/** Cuts at a word boundary and adds an ellipsis, so a long message never ends mid-word. */
function shorten(text: string, max: number): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 1))}…`;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export interface FleetInput {
  systems: SapSystem[];
  alerts: SapAlertRecord[];
  jobs: SapJob[];
  dumps: SapDump[];
  disks: SapDiskMount[];
  notes: SapSecurityNoteSummary;
}

/** What across the SAP landscape needs a person's attention, most urgent first. */
export function fleetInsights({ systems, alerts, jobs, dumps, disks, notes }: FleetInput): Insight[] {
  const out: Insight[] = [];

  for (const system of systems) {
    if (system.condition === 'critical') {
      out.push({
        id: `sys-${system.id}`,
        tone: 'danger',
        title: `${system.name} is critical`,
        detail: `CPU ${system.cpuPercent}% · memory ${system.memoryPercent}% · last collected ${system.lastCollection}.`,
        to: '/sap/systems',
      });
    } else if (system.condition === 'warning') {
      out.push({
        id: `sys-${system.id}`,
        tone: 'warning',
        title: `${system.name} needs a look`,
        detail: `CPU ${system.cpuPercent}% · memory ${system.memoryPercent}%.`,
        to: '/sap/systems',
      });
    }
  }

  const highLoad = systems.filter((s) => s.condition === 'healthy' && (s.cpuPercent >= LOAD_THRESHOLD_PERCENT || s.memoryPercent >= LOAD_THRESHOLD_PERCENT));
  if (highLoad.length > 0) {
    out.push({
      id: 'load',
      tone: 'warning',
      title: `${plural(highLoad.length, 'healthy system')} running above ${LOAD_THRESHOLD_PERCENT}% load`,
      detail: highLoad.map((s) => s.name).join(', '),
      to: '/sap/systems',
    });
  }

  const unreadCritical = alerts.filter((a) => !a.read && (a.severity === 'Critical' || a.severity === 'High'));
  if (unreadCritical.length > 0) {
    out.push({
      id: 'alerts',
      tone: 'danger',
      title: `${plural(unreadCritical.length, 'unread critical or high alert')}`,
      detail: shorten(unreadCritical[0].message, 110),
      to: '/sap/alerts',
    });
  }

  const cancelled = jobs.filter((j) => j.status === 'Cancelled');
  if (cancelled.length > 0) {
    out.push({ id: 'jobs-cancelled', tone: 'danger', title: `${plural(cancelled.length, 'background job')} cancelled`, detail: cancelled.map((j) => j.name).join(', '), to: '/sap/jobs' });
  }
  const running = jobs.filter((j) => j.status === 'Running');
  if (running.length > 0) {
    out.push({ id: 'jobs-running', tone: 'info', title: `${plural(running.length, 'job')} running now`, detail: running.map((j) => j.name).join(', '), to: '/sap/jobs' });
  }

  if (dumps.length > 0) {
    out.push({ id: 'dumps', tone: 'warning', title: `${plural(dumps.length, 'short dump')} to review`, detail: dumps[0].program, to: '/sap/jobs#dumps' });
  }

  const fullDisks = disks.filter((d) => d.percent >= DISK_THRESHOLD_PERCENT);
  for (const disk of fullDisks) {
    out.push({
      id: `disk-${disk.path}`,
      tone: 'warning',
      title: `${disk.path} is ${disk.percent}% full`,
      detail: `${disk.freeGb.toLocaleString()} GB free of ${disk.totalGb.toLocaleString()} GB.`,
      to: '/sap/performance',
    });
  }

  if (notes.hotNews > 0) {
    out.push({ id: 'notes-hot', tone: 'danger', title: `${plural(notes.hotNews, 'Hot News security note')} not implemented`, to: '/sap/security-notes' });
  }
  if (notes.actionable > 0) {
    out.push({ id: 'notes', tone: 'info', title: `${plural(notes.actionable, 'security note')} can be applied now`, to: '/sap/security-notes' });
  }

  const order: Record<InsightTone, number> = { danger: 0, warning: 1, info: 2, success: 3 };
  return out.sort((a, b) => order[a.tone] - order[b.tone]);
}

export interface HanaFacts {
  peakCpu: { percent: number; time: string };
  memoryMin: number;
  memoryMax: number;
  /** Change between the first and last point of the window, in percentage points. */
  memoryDelta: number;
  headroomGb: number;
  stoppedServices: string[];
}

/** Plain facts about the last 24 hours of a HANA host; each is shown with its own chip or line. */
export function hanaFacts(system: HanaSystem, timeline: HanaVitalPoint[], services: HanaService[]): HanaFacts {
  const points = timeline.length > 0 ? timeline : [{ time: '—', cpuPercent: 0, memoryPercent: 0 }];
  const peak = points.reduce((best, p) => (p.cpuPercent > best.cpuPercent ? p : best), points[0]);
  const memory = points.map((p) => p.memoryPercent);
  return {
    peakCpu: { percent: peak.cpuPercent, time: peak.time },
    memoryMin: Math.min(...memory),
    memoryMax: Math.max(...memory),
    memoryDelta: memory[memory.length - 1] - memory[0],
    headroomGb: system.memory.freeGb,
    stoppedServices: services.filter((s) => s.status === 'stopped').map((s) => s.name),
  };
}

/** The 24h HANA story as insight rows. */
export function hanaInsights(system: HanaSystem, timeline: HanaVitalPoint[], services: HanaService[]): Insight[] {
  const facts = hanaFacts(system, timeline, services);
  const out: Insight[] = [];
  if (facts.stoppedServices.length > 0) {
    out.push({ id: 'stopped', tone: 'warning', title: `${plural(facts.stoppedServices.length, 'service')} stopped`, detail: facts.stoppedServices.join(', ') });
  }
  if (system.alerts.active > 0) {
    out.push({
      id: 'alerts',
      tone: system.alerts.critical > 0 ? 'danger' : 'warning',
      title: `${plural(system.alerts.active, 'active HANA alert')}`,
      detail: `${system.alerts.critical} critical · ${system.alerts.high} high · ${system.alerts.medium} medium · ${system.alerts.low} low`,
      to: '/sap/alerts',
    });
  }
  out.push({
    id: 'cpu',
    tone: facts.peakCpu.percent >= LOAD_THRESHOLD_PERCENT ? 'warning' : 'success',
    title: `CPU peaked at ${facts.peakCpu.percent}% around ${facts.peakCpu.time}`,
    detail: `Current load ${system.cpu.loadPercent}%.`,
  });
  out.push({
    id: 'memory',
    tone: facts.memoryMax >= LOAD_THRESHOLD_PERCENT ? 'warning' : 'success',
    title: `Memory stayed between ${facts.memoryMin}% and ${facts.memoryMax}%`,
    detail: `${facts.headroomGb} GB headroom; ${facts.memoryDelta === 0 ? 'unchanged' : `${facts.memoryDelta > 0 ? 'up' : 'down'} ${Math.abs(facts.memoryDelta)} points`} over the window.`,
  });
  return out;
}
