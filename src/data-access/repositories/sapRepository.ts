import type {
  HanaService, HanaSystem, HanaVitalPoint, SapAlertRecord, SapDiskMount, SapDump, SapJob, SapPerformanceSnapshot,
  SapSecurityNoteSummary, SapSystem,
} from '../contracts/sap';
import type {
  HanaBackupEntry, HanaDiskPartition, SapDbCallStatistics, SapPerformanceTrends, SapQueues, SapServerNode, SapWorkProcess,
} from '../contracts/sap';
import { MOCK_SAP_SYSTEMS } from '../../demo/sap/mockSapData';
import { HANA_BACKUPS, HANA_DISK_PARTITIONS, HANA_SERVICES, HANA_SYSTEM, HANA_VITALS_TIMELINE } from '../../demo/sap/mockHanaData';
import {
  SAP_ABAP_RUNTIME_ERRORS, SAP_BACKGROUND_JOBS, SAP_DB_CALL_STATISTICS, SAP_DISK_USAGE, SAP_PERFORMANCE, SAP_PERFORMANCE_TRENDS,
  SAP_SERVER_TOPOLOGY, SAP_WORK_PROCESSES,
} from '../../demo/sap/mockSapPerformance';
import { sapAdminRepository } from './sapAdminRepository';

/**
 * SAP Monitoring data (fleet, HANA, jobs, dumps, alerts, security notes).
 * PROTOTYPE: backed by the seeded samples in src/demo; swap each body for the matching REST call
 * through ./rest when the SAP monitoring endpoints exist. Returns copies.
 */
export const sapRepository = {
  listSystems(): SapSystem[] {
    return structuredClone(MOCK_SAP_SYSTEMS);
  },
  getHana(): { system: HanaSystem; timeline: HanaVitalPoint[]; services: HanaService[] } {
    return structuredClone({ system: HANA_SYSTEM as HanaSystem, timeline: HANA_VITALS_TIMELINE, services: HANA_SERVICES });
  },
  getPerformance(): SapPerformanceSnapshot {
    return structuredClone(SAP_PERFORMANCE);
  },
  listDiskMounts(): SapDiskMount[] {
    return structuredClone(SAP_DISK_USAGE);
  },
  listJobs(): SapJob[] {
    return structuredClone(SAP_BACKGROUND_JOBS);
  },
  listDumps(): SapDump[] {
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
    return structuredClone(HANA_DISK_PARTITIONS);
  },
  /** Recent data, log and catalog backups, oldest first. */
  listHanaBackups(): HanaBackupEntry[] {
    return structuredClone(HANA_BACKUPS);
  },

  // ---- SAP Performance deep dive ----
  listServerTopology(): SapServerNode[] {
    return structuredClone(SAP_SERVER_TOPOLOGY);
  },
  listWorkProcesses(): SapWorkProcess[] {
    return structuredClone(SAP_WORK_PROCESSES);
  },
  getDbCallStatistics(): SapDbCallStatistics {
    return structuredClone(SAP_DB_CALL_STATISTICS);
  },
  getPerformanceTrends(): SapPerformanceTrends {
    return structuredClone(SAP_PERFORMANCE_TRENDS);
  },
  getQueueIndicators(): SapQueues {
    const busy = (type: SapWorkProcess['type']) => SAP_WORK_PROCESSES.filter((w) => w.type === type && w.status === 'Running').length;
    const workers = (type: SapWorkProcess['type']) => SAP_WORK_PROCESSES.filter((w) => w.type === type).length;
    return { upd: { workers: workers('UPD'), busy: busy('UPD'), queued: 0 }, enq: { workers: workers('ENQ'), busy: busy('ENQ'), queued: 0 } };
  },
};
