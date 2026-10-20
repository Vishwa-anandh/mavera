import type { NoteHistoryEntry, NoteDownloadStatus, SecurityNote, SecurityNotePriority, SecurityNoteStatus } from '../../data-access';

/**
 * PROTOTYPE MOCK DATA — SAP Security Notes tracking (SAP's own CVE/patch advisories),
 * independent of the org-wide Recommendations feature. The notes and CVE ids are sample values.
 */
export const SEED_SECURITY_NOTES: SecurityNote[] = [
  { noteNumber: '3727078', title: '[CVE-2026-40128] Directory Traversal vulnerability in SAP NetWeaver', priority: 'Hot News', component: 'BC-JAS-WEB', cvss: 9.0, releasedOn: '2026-07-14T16:30:00', downloadStatus: 'Already Downloaded', status: 'Cannot Be Implemented' },
  { noteNumber: '3515598', title: '[CVE-2026-44771] Missing Authorization check in SAP S/4HANA', priority: 'Correction', component: 'FIN-FSCM-CLM-COP', cvss: 4.3, releasedOn: '2026-07-14T05:31:00', downloadStatus: 'Already Downloaded', status: 'Cannot Be Implemented' },
  { noteNumber: '3763800', title: '[Multiple CVEs] Multiple vulnerabilities in Apache Tomcat', priority: 'High Priority', component: 'CEC-SCC-PLA-PL', cvss: 8.1, releasedOn: '2026-07-14T05:31:00', downloadStatus: 'Already Downloaded', status: 'Cannot Be Implemented' },
  { noteNumber: '3773304', title: '[CVE-2026-58233] Remote Code Execution vulnerability in SAP CommonCryptoLib', priority: 'High Priority', component: 'BC-CTS-TMS-PLS', cvss: 7.6, releasedOn: '2026-07-14T05:31:00', downloadStatus: 'Already Downloaded', status: 'Cannot Be Implemented' },
  { noteNumber: '3746678', title: '[CVE-2026-44759] Cross Site Scripting (XSS) vulnerability in SAP', priority: 'Correction', component: 'EP-PIN-AI-SRA', cvss: 6.1, releasedOn: '2026-07-14T05:31:00', downloadStatus: 'Already Downloaded', status: 'Cannot Be Implemented' },
  { noteNumber: '3754659', title: '[CVE-2026-44760] Cross-Site Scripting (XSS) vulnerability in SAP', priority: 'Correction', component: 'BC-BSP', cvss: 4.7, releasedOn: '2026-07-14T05:31:00', downloadStatus: 'Download failed', status: 'Unknown' },
  { noteNumber: '3713902', title: '[CVE-2026-44770] Missing Authorization check in SAP S/4HANA', priority: 'Correction', component: 'FI-FIO-AP-PAY', cvss: 4.3, releasedOn: '2026-07-14T05:31:00', downloadStatus: 'Already Downloaded', status: 'Cannot Be Implemented' },
  { noteNumber: '3155685', title: 'Security misconfiguration in SAP', priority: 'Correction', component: 'CA-WUI-UI', cvss: 4.1, releasedOn: '2026-07-14T05:31:00', downloadStatus: 'Already Downloaded', status: 'Cannot Be Implemented' },
  { noteNumber: '3537373', title: '[CVE-2026-44769] SQL Injection vulnerability in SAP', priority: 'Correction', component: 'PPM-PRO', cvss: 5.5, releasedOn: '2026-07-14T05:30:00', downloadStatus: 'Already Downloaded', status: 'Cannot Be Implemented' },
  { noteNumber: '3741519', title: '[CVE-2026-44745] Open Redirect vulnerability in SAP', priority: 'High Priority', component: 'BC-CP-APR', cvss: 8.1, releasedOn: '2026-07-14T05:30:00', downloadStatus: 'Downloaded', status: 'Can Be Implemented' },
  { noteNumber: '3682699', title: '[CVE-2026-24315] Path Traversal Vulnerability in SAP', priority: 'Correction', component: 'CA-FLP-FE-COR', cvss: 4.2, releasedOn: '2026-07-14T05:30:00', downloadStatus: 'Already Downloaded', status: 'Cannot Be Implemented' },
  { noteNumber: '3732522', title: '[CVE-2026-44753] Information Disclosure vulnerability in SAP', priority: 'Correction', component: 'HAN-AS-XS', cvss: 3.7, releasedOn: '2026-07-14T05:30:00', downloadStatus: 'Already Downloaded', status: 'Cannot Be Implemented' },
  { noteNumber: '3726899', title: '[CVE-2025-68161] Potential vulnerability in Apache', priority: 'Correction', component: 'BC-JAS-SEC-UME', cvss: 3.3, releasedOn: '2026-07-14T05:30:00', downloadStatus: 'Already Downloaded', status: 'Cannot Be Implemented' },
  { noteNumber: '3790112', title: '[CVE-2026-44782] Information Disclosure vulnerability in SAP BusinessObjects Business Intelligence Platform', priority: 'Optional', component: 'BI-BIP-ADM', cvss: 3.1, releasedOn: '2026-07-14T05:29:00', downloadStatus: 'Not downloaded', status: 'Can Be Implemented' },
];

/** Past uploads, newest first; later actions are added by the repository as they happen. */
export const SEED_NOTE_HISTORY: NoteHistoryEntry[] = [
  { id: 'hist-4', kind: 'upload', at: '2026-07-17T18:14:56', actor: 'SAP admin', summary: 'Uploaded Security-Notes.xlsx', counts: [{ label: 'Total', value: 47 }, { label: 'Inserted', value: 0 }, { label: 'Updated', value: 47 }, { label: 'Errors', value: 0 }] },
  { id: 'hist-3', kind: 'upload', at: '2026-07-17T17:35:51', actor: 'SAP admin', summary: 'Uploaded Security-Notes.xlsx', counts: [{ label: 'Total', value: 82 }, { label: 'Inserted', value: 58 }, { label: 'Updated', value: 24 }, { label: 'Errors', value: 0 }] },
  { id: 'hist-2', kind: 'upload', at: '2026-07-09T17:34:09', actor: 'SAP admin', summary: 'Uploaded security-notes-result-20260630.xlsx', counts: [{ label: 'Total', value: 26 }, { label: 'Inserted', value: 1 }, { label: 'Updated', value: 25 }, { label: 'Errors', value: 0 }] },
  { id: 'hist-1', kind: 'upload', at: '2026-07-09T17:29:53', actor: 'SAP admin', summary: 'Uploaded security-notes-result-20260630.xlsx', counts: [{ label: 'Total', value: 25 }, { label: 'Inserted', value: 25 }, { label: 'Updated', value: 0 }, { label: 'Errors', value: 0 }] },
];

export interface SimulatedNoteCheck {
  status: SecurityNoteStatus;
  downloadStatus: NoteDownloadStatus;
  /** Null when the SAP download failed, so nothing is known about the note yet. */
  details: { title: string; priority: SecurityNotePriority; component: string; cvss: number; releasedOn: string } | null;
}

const SIMULATED_COMPONENTS = ['BC-SEC-AUT', 'BC-CST-WDP', 'BC-JAS-WEB', 'FIN-FSCM-CLM', 'BC-DWB-TOO', 'CA-GTF-FIO'];
const SIMULATED_PRIORITIES: SecurityNotePriority[] = ['Correction', 'High Priority', 'Hot News', 'Optional'];

/**
 * Stands in for asking SAP about a note number: a stable outcome derived from the digits, so the same
 * number always gets the same answer. About one note in ten fails to download and stays Unknown.
 */
export function simulateNoteCheck(noteNumber: string): SimulatedNoteCheck {
  const seed = [...noteNumber].reduce((acc, ch) => (acc * 31 + Number(ch)) >>> 0, 7);
  const bucket = seed % 10;
  if (bucket === 0) return { status: 'Unknown', downloadStatus: 'Download failed', details: null };
  const status: SecurityNoteStatus = bucket <= 4 ? 'Can Be Implemented' : bucket <= 7 ? 'Cannot Be Implemented' : bucket === 8 ? 'Completely Implemented' : 'Obsolete';
  return {
    status,
    downloadStatus: 'Downloaded',
    details: {
      title: `SAP Security Note ${noteNumber}`,
      priority: SIMULATED_PRIORITIES[seed % SIMULATED_PRIORITIES.length],
      component: SIMULATED_COMPONENTS[seed % SIMULATED_COMPONENTS.length],
      cvss: Math.round(((seed % 70) + 20)) / 10,
      releasedOn: '2026-07-14T05:30:00',
    },
  };
}
