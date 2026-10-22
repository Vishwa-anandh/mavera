import type {
  HanaService, HanaSystem, HanaVitalPoint, SapAlertRecord, SapDiskMount, SapDump, SapJob, SapPerformanceSnapshot,
  SapSecurityNoteSummary, SapSystem,
} from '../contracts/sap';
import type {
  HanaBackupEntry, HanaDiskPartition, SapDbCallStatistics, SapLock, SapMemoryPoint, SapMemoryPool, SapPerformanceTrends, SapQueues, SapServerNode, SapWorkProcess,
} from '../contracts/sap';
import { MOCK_SAP_SYSTEMS } from '../../demo/sap/mockSapData';
import { HANA_BACKUPS, HANA_DISK_PARTITIONS, HANA_SERVICES, HANA_SYSTEM, HANA_VITALS_TIMELINE } from '../../demo/sap/mockHanaData';
import {
  SAP_ABAP_RUNTIME_ERRORS, SAP_BACKGROUND_JOBS, SAP_DB_CALL_STATISTICS, SAP_DISK_USAGE, SAP_PERFORMANCE, SAP_PERFORMANCE_TRENDS,
  SAP_MEMORY_POOLS, SAP_MEMORY_SERIES, SAP_SERVER_TOPOLOGY, SAP_SYSTEM_LOCKS, SAP_WORK_PROCESSES,
} from '../../demo/sap/mockSapPerformance';
import { sapAdminRepository } from './sapAdminRepository';
import { isEmptyWorkspace } from './workspaceProfile';

/**
 * A populated organisation always has the sample landscape. A new one has none until it connects its first
 * SAP system (a destination in System Configuration), after which the sample landscape appears.
 */
const hasLandscape = (): boolean => !isEmptyWorkspace() || sapAdminRepository.destinations.count() > 0;

/**
 * SAP Monitoring data (fleet, HANA, jobs, dumps, alerts, security notes).
 * PROTOTYPE: backed by the seeded samples in src/demo; swap each body for the matching REST call
 * through ./rest when the SAP monitoring endpoints exist. Returns copies.
 */
export const sapRepository = {
  /** Whether any SAP system is connected; the monitoring pages show a "connect a system" state when not. */
  isConnected(): boolean {
    return hasLandscape();
  },
  listSystems(): SapSystem[] {
    if (!hasLandscape()) return [];
    return structuredClone(MOCK_SAP_SYSTEMS);
  },
  getHana(): { system: HanaSystem; timeline: HanaVitalPoint[]; services: HanaService[] } {
    return structuredClone({ system: HANA_SYSTEM as HanaSystem, timeline: HANA_VITALS_TIMELINE, services: HANA_SERVICES });
  },
  getPerformance(): SapPerformanceSnapshot {
    return structuredClone(SAP_PERFORMANCE);
  },
  listDiskMounts(): SapDiskMount[] {
    if (!hasLandscape()) return [];
    return structuredClone(SAP_DISK_USAGE);
  },
  listJobs(): SapJob[] {
    if (!hasLandscape()) return [];
    return structuredClone(SAP_BACKGROUND_JOBS);
  },
  listDumps(): SapDump[] {
    if (!hasLandscape()) return [];
    return structuredClone(SAP_ABAP_RUNTIME_ERRORS);
  },
  listAlerts(): SapAlertRecord[] {
    // The alerts page owns the state: resolved and ignored alerts are no longer outstanding.
    return sapAdminRepository.alerts.list()
      .filter((a) => a.state === 'active')
      .map((a) => ({ id: a.id, type: a.type, severity: a.severity, system: a.system, message: a.message, read: a.read, detectedAt: new Date(a.detectedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) }));
  },
  getSecurityNoteSummary(): SapSecurityNoteSummary {
    const notes = sapAdminRepository.securityNotes.list();
    return {
      total: notes.length,
      actionable: notes.filter((n) => n.status === 'Can Be Implemented').length,
      hotNews: notes.filter((n) => n.priority === 'Hot News' && n.status !== 'Completely Implemented').length,
    };
  },

  // ---- HANA Monitoring deep dive ----
  listHanaDiskPartitions(): HanaDiskPartition[] {
    if (!hasLandscape()) return [];
    return structuredClone(HANA_DISK_PARTITIONS);
  },
  /** Recent data, log and catalog backups, oldest first. */
  listHanaBackups(): HanaBackupEntry[] {
    if (!hasLandscape()) return [];
    return structuredClone(HANA_BACKUPS);
  },

  // ---- SAP Performance deep dive ----
  listServerTopology(): SapServerNode[] {
    if (!hasLandscape()) return [];
    return structuredClone(SAP_SERVER_TOPOLOGY);
  },
  listWorkProcesses(): SapWorkProcess[] {
    if (!hasLandscape()) return [];
    return structuredClone(SAP_WORK_PROCESSES);
  },
  getDbCallStatistics(): SapDbCallStatistics {
    return structuredClone(SAP_DB_CALL_STATISTICS);
  },
  getPerformanceTrends(): SapPerformanceTrends {
    return structuredClone(SAP_PERFORMANCE_TRENDS);
  },
  /** ST02 memory pools of the application server. */
  listMemoryPools(): SapMemoryPool[] {
    if (!hasLandscape()) return [];
    return structuredClone(SAP_MEMORY_POOLS);
  },
  /** Application-server memory, hourly over the last 24 hours (used against allocated). */
  getMemorySeries(): SapMemoryPoint[] {
    if (!hasLandscape()) return [];
    return structuredClone(SAP_MEMORY_SERIES);
  },
  /** SM12 lock entries held right now; the Performance KPI strip counts the same list. */
  listSystemLocks(): SapLock[] {
    if (!hasLandscape()) return [];
    return structuredClone(SAP_SYSTEM_LOCKS);
  },
  getQueueIndicators(): SapQueues {
    const busy = (type: SapWorkProcess['type']) => SAP_WORK_PROCESSES.filter((w) => w.type === type && w.status === 'Running').length;
    const workers = (type: SapWorkProcess['type']) => SAP_WORK_PROCESSES.filter((w) => w.type === type).length;
    return { upd: { workers: workers('UPD'), busy: busy('UPD'), queued: 0 }, enq: { workers: workers('ENQ'), busy: busy('ENQ'), queued: 0 } };
  },
};
