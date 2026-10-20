import { describe, it, expect } from 'vitest';
import { fleetInsights, hanaFacts, hanaInsights, type FleetInput } from './sapInsights';
import type { HanaSystem, SapSystem } from '../../../data-access';

const system = (over: Partial<SapSystem>): SapSystem => ({
  id: 'S1', name: 'S1', environment: 'Production', condition: 'healthy', cpuPercent: 30, memoryPercent: 30, lastCollection: '1 minute ago', ...over,
});

const base: FleetInput = {
  systems: [system({})],
  alerts: [],
  jobs: [],
  dumps: [],
  disks: [],
  notes: { total: 0, actionable: 0, hotNews: 0 },
};

describe('fleetInsights', () => {
  it('is empty for a quiet landscape', () => {
    expect(fleetInsights(base)).toEqual([]);
  });

  it('calls out critical and warning systems, most urgent first', () => {
    const out = fleetInsights({ ...base, systems: [system({ id: 'W', name: 'W', condition: 'warning' }), system({ id: 'C', name: 'C', condition: 'critical', cpuPercent: 92 })] });
    expect(out.map((i) => i.tone)).toEqual(['danger', 'warning']);
    expect(out[0].title).toBe('C is critical');
    expect(out[0].detail).toContain('CPU 92%');
  });

  it('flags healthy systems that still run above the load threshold', () => {
    const out = fleetInsights({ ...base, systems: [system({ name: 'X', cpuPercent: 85 })] });
    expect(out).toHaveLength(1);
    expect(out[0].title).toMatch(/above 80% load/);
  });

  it('counts only unread critical or high alerts', () => {
    const alert = (id: string, severity: 'Critical' | 'Low', read: boolean) => ({ id, type: 'CPU', severity, system: 'X', message: 'm', detectedAt: 't', read });
    const out = fleetInsights({ ...base, alerts: [alert('1', 'Critical', false), alert('2', 'Critical', true), alert('3', 'Low', false)] });
    expect(out.find((i) => i.id === 'alerts')?.title).toBe('1 unread critical or high alert');
  });

  it('reports cancelled and running jobs, dumps, full disks and notes', () => {
    const job = (name: string, status: 'Cancelled' | 'Running') => ({ name, status, startedAt: '', finishedAt: null, durationSec: null, user: 'U', client: '000' });
    const out = fleetInsights({
      ...base,
      jobs: [job('A', 'Cancelled'), job('B', 'Running')],
      dumps: [{ id: 'd', program: 'ZPROG', errorType: 'X', occurredAt: '', user: 'U' }],
      disks: [{ path: '/backup', usedGb: 94, freeGb: 6, totalGb: 100, percent: 94 }],
      notes: { total: 3, actionable: 1, hotNews: 1 },
    });
    const ids = out.map((i) => i.id);
    expect(ids).toEqual(expect.arrayContaining(['jobs-cancelled', 'jobs-running', 'dumps', 'disk-/backup', 'notes-hot', 'notes']));
    expect(out[0].tone).toBe('danger');
    expect(out.find((i) => i.id === 'dumps')?.to).toBe('/sap/jobs#dumps');
  });
});

const hana = (over: Partial<HanaSystem> = {}): HanaSystem => ({
  name: 'GRH', type: 'HANA', host: 'h', version: 'v', lastFetched: '', nextSyncMinutes: 1,
  memory: { usedGb: 55, totalGb: 106, freeGb: 51, percent: 52, condition: 'healthy' },
  cpu: { loadPercent: 0.3, swapUsedGb: 0, services: 9, peak24h: 1.1, condition: 'stable' },
  alerts: { active: 0, highPriority: 0, critical: 0, high: 0, medium: 0, low: 0 },
  sessions: { active: 1, uniqueUsers: 1, byUser: [{ user: 'SYSTEM', sessions: 1 }] },
  ...over,
});

describe('hanaFacts / hanaInsights', () => {
  const timeline = [
    { time: '10:00', cpuPercent: 0.4, memoryPercent: 28 },
    { time: '11:00', cpuPercent: 1.1, memoryPercent: 30 },
    { time: '12:00', cpuPercent: 0.3, memoryPercent: 29 },
  ];
  const services = [
    { name: 'idx', status: 'running' as const, memoryMb: 100, allocatedMb: 150, sharedMb: 10 },
    { name: 'di', status: 'stopped' as const, memoryMb: 0, allocatedMb: 0, sharedMb: 0 },
  ];

  it('finds the CPU peak, the memory range and the stopped services', () => {
    const facts = hanaFacts(hana(), timeline, services);
    expect(facts.peakCpu).toEqual({ percent: 1.1, time: '11:00' });
    expect([facts.memoryMin, facts.memoryMax, facts.memoryDelta]).toEqual([28, 30, 1]);
    expect(facts.headroomGb).toBe(51);
    expect(facts.stoppedServices).toEqual(['di']);
  });

  it('puts stopped services and active alerts first', () => {
    const out = hanaInsights(hana({ alerts: { active: 1, highPriority: 1, critical: 1, high: 0, medium: 0, low: 0 } }), timeline, services);
    expect(out.map((i) => i.id)).toEqual(['stopped', 'alerts', 'cpu', 'memory']);
    expect(out[1].tone).toBe('danger');
  });

  it('survives an empty timeline', () => {
    expect(() => hanaInsights(hana(), [], [])).not.toThrow();
  });
});
