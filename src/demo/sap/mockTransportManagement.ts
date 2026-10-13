/** PROTOTYPE MOCK DATA — SAP transport requests (STMS), independent of any
 * cloud deployment concept elsewhere in Mavera. */
export type TransportStatus = 'Open' | 'Released' | 'Imported' | 'Failed';

export interface Transport {
  trNumber: string;
  description: string;
  type: 'Workbench' | 'Customizing';
  priority: 'High' | 'Normal';
  owner: string;
  status: TransportStatus;
  route: string | null;
  date: string;
}

/** Empty on purpose — MIO's own view showed "No transports found" for this
 * destination; a real integration reads this from STMS. */
export const MOCK_TRANSPORTS: Transport[] = [];

export const TRANSPORT_SUMMARY = {
  stmsConnected: true,
  lastSync: null as string | null,
  pendingImports: 0,
  successfullyImported: 0,
  failedErrors: 0,
  successfullyReleased: 0,
};
