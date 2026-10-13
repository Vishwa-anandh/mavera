/** PROTOTYPE MOCK DATA — SAP Security Notes tracking (SAP's own CVE/patch
 * advisories), independent of the org-wide Recommendations feature. */
export type SecurityNoteStatus =
  | 'Completely Implemented'
  | 'Can Be Implemented'
  | 'Cannot Be Implemented'
  | 'Incompletely Implemented'
  | 'Obsolete'
  | 'Unknown';

export type SecurityNotePriority = 'Hot News' | 'High Priority' | 'Correction';

export interface SecurityNote {
  noteNumber: string;
  title: string;
  priority: SecurityNotePriority;
  component: string;
  cvss: number;
  releasedOn: string;
  downloadStatus: 'Already Downloaded' | 'Not Downloaded' | 'Success';
  /** Result of the last live check against the connected SAP system —
   * independent of `status`, which is the note's implementation category. */
  checkStatus: 'Call Failed' | 'Success';
  status: SecurityNoteStatus;
}

export const MOCK_SECURITY_NOTES: SecurityNote[] = [
  { noteNumber: '3727078', title: '[CVE-2026-40128] Directory Traversal vulnerability in SAP NetWeaver', priority: 'Hot News', component: 'BC-JAS-WEB', cvss: 9.0, releasedOn: '14 Jul 2026, 16:30', downloadStatus: 'Already Downloaded', checkStatus: 'Call Failed', status: 'Cannot Be Implemented' },
  { noteNumber: '3515598', title: '[CVE-2026-44771] Missing Authorization check in SAP S/4HANA', priority: 'Correction', component: 'FIN-FSCM-CLM-COP', cvss: 4.3, releasedOn: '14 Jul 2026, 05:31', downloadStatus: 'Already Downloaded', checkStatus: 'Call Failed', status: 'Cannot Be Implemented' },
  { noteNumber: '3763800', title: '[Multiple CVEs] Multiple vulnerabilities in Apache Tomcat', priority: 'High Priority', component: 'CEC-SCC-PLA-PL', cvss: 8.1, releasedOn: '14 Jul 2026, 05:31', downloadStatus: 'Already Downloaded', checkStatus: 'Call Failed', status: 'Cannot Be Implemented' },
  { noteNumber: '3773304', title: '[CVE-2026-58233] Remote Code Execution vulnerability in SAP CommonCryptoLib', priority: 'High Priority', component: 'BC-CTS-TMS-PLS', cvss: 7.6, releasedOn: '14 Jul 2026, 05:31', downloadStatus: 'Already Downloaded', checkStatus: 'Call Failed', status: 'Cannot Be Implemented' },
  { noteNumber: '3746678', title: '[CVE-2026-44759] Cross Site Scripting (XSS) vulnerability in SAP', priority: 'Correction', component: 'EP-PIN-AI-SRA', cvss: 6.1, releasedOn: '14 Jul 2026, 05:31', downloadStatus: 'Already Downloaded', checkStatus: 'Call Failed', status: 'Cannot Be Implemented' },
  { noteNumber: '3754659', title: '[CVE-2026-44760] Cross-Site Scripting (XSS) vulnerability in SAP', priority: 'Correction', component: 'BC-BSP', cvss: 4.7, releasedOn: '14 Jul 2026, 05:31', downloadStatus: 'Already Downloaded', checkStatus: 'Call Failed', status: 'Cannot Be Implemented' },
  { noteNumber: '3713902', title: '[CVE-2026-44770] Missing Authorization check in SAP S/4HANA', priority: 'Correction', component: 'FI-FIO-AP-PAY', cvss: 4.3, releasedOn: '14 Jul 2026, 05:31', downloadStatus: 'Already Downloaded', checkStatus: 'Call Failed', status: 'Cannot Be Implemented' },
  { noteNumber: '3155685', title: 'Security misconfiguration in SAP', priority: 'Correction', component: 'CA-WUI-UI', cvss: 4.1, releasedOn: '14 Jul 2026, 05:31', downloadStatus: 'Already Downloaded', checkStatus: 'Call Failed', status: 'Cannot Be Implemented' },
  { noteNumber: '3537373', title: '[CVE-2026-44769] SQL Injection vulnerability in SAP', priority: 'Correction', component: 'PPM-PRO', cvss: 5.5, releasedOn: '14 Jul 2026, 05:30', downloadStatus: 'Already Downloaded', checkStatus: 'Call Failed', status: 'Cannot Be Implemented' },
  { noteNumber: '3741519', title: '[CVE-2026-44745] Open Redirect vulnerability in SAP', priority: 'High Priority', component: 'BC-CP-APR', cvss: 8.1, releasedOn: '14 Jul 2026, 05:30', downloadStatus: 'Success', checkStatus: 'Success', status: 'Can Be Implemented' },
  { noteNumber: '3682699', title: '[CVE-2026-24315] Path Traversal Vulnerability in SAP', priority: 'Correction', component: 'CA-FLP-FE-COR', cvss: 4.2, releasedOn: '14 Jul 2026, 05:30', downloadStatus: 'Already Downloaded', checkStatus: 'Call Failed', status: 'Cannot Be Implemented' },
  { noteNumber: '3732522', title: '[CVE-2026-44753] Information Disclosure vulnerability in SAP', priority: 'Correction', component: 'HAN-AS-XS', cvss: 3.7, releasedOn: '14 Jul 2026, 05:30', downloadStatus: 'Already Downloaded', checkStatus: 'Call Failed', status: 'Cannot Be Implemented' },
  { noteNumber: '3726899', title: '[CVE-2025-68161] Potential vulnerability in Apache', priority: 'Correction', component: 'BC-JAS-SEC-UME', cvss: 3.3, releasedOn: '14 Jul 2026, 05:30', downloadStatus: 'Already Downloaded', checkStatus: 'Call Failed', status: 'Cannot Be Implemented' },
];

export interface NoteUploadHistoryEntry {
  fileName: string;
  uploadedAt: string;
  total: number;
  inserted: number;
  updated: number;
  errors: number;
}

export const MOCK_NOTE_UPLOAD_HISTORY: NoteUploadHistoryEntry[] = [
  { fileName: 'Security-Notes.xlsx', uploadedAt: '17/07/2026, 18:14:56', total: 47, inserted: 0, updated: 47, errors: 0 },
  { fileName: 'Security-Notes.xlsx', uploadedAt: '17/07/2026, 17:35:51', total: 82, inserted: 58, updated: 24, errors: 0 },
  { fileName: 'security-notes-result-20260630.xlsx', uploadedAt: '09/07/2026, 17:34:09', total: 26, inserted: 1, updated: 25, errors: 0 },
  { fileName: 'security-notes-result-20260630.xlsx', uploadedAt: '09/07/2026, 17:29:53', total: 25, inserted: 25, updated: 0, errors: 0 },
];

export function securityNoteCounts(notes: SecurityNote[]): Record<SecurityNoteStatus, number> {
  return notes.reduce(
    (acc, note) => {
      acc[note.status] += 1;
      return acc;
    },
    {
      'Completely Implemented': 0,
      'Can Be Implemented': 0,
      'Cannot Be Implemented': 0,
      'Incompletely Implemented': 0,
      Obsolete: 0,
      Unknown: 0,
    } as Record<SecurityNoteStatus, number>,
  );
}
