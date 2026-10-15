import type {
  HanaService, HanaSystem, HanaVitalPoint, SapAlertRecord, SapDiskMount, SapDump, SapJob, SapPerformanceSnapshot,
  SapSecurityNoteSummary, SapSystem,
} from '../contracts/sap';
import { MOCK_SAP_SYSTEMS } from '../../demo/sap/mockSapData';
import { HANA_SERVICES, HANA_SYSTEM, HANA_VITALS_TIMELINE } from '../../demo/sap/mockHanaData';
import { SAP_ABAP_RUNTIME_ERRORS, SAP_BACKGROUND_JOBS, SAP_DISK_USAGE, SAP_PERFORMANCE } from '../../demo/sap/mockSapPerformance';
import { MOCK_SAP_ALERTS } from '../../demo/sap/mockSapAlerts';
import { MOCK_SECURITY_NOTES } from '../../demo/sap/mockSecurityNotes';

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
    return structuredClone(MOCK_SAP_ALERTS);
  },
  getSecurityNoteSummary(): SapSecurityNoteSummary {
    return {
      total: MOCK_SECURITY_NOTES.length,
      actionable: MOCK_SECURITY_NOTES.filter((n) => n.status === 'Can Be Implemented').length,
      hotNews: MOCK_SECURITY_NOTES.filter((n) => n.priority === 'Hot News' && n.status !== 'Completely Implemented').length,
    };
  },
};
