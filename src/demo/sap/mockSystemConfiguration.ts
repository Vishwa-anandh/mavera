/** PROTOTYPE MOCK DATA — SAP destination/connection endpoints, distinct
 * from the org-wide cloud-account connections elsewhere in Mavera. */
export interface SapDestination {
  id: string;
  name: string;
  shortLabel: string;
  status: 'Connected' | 'Ready To Connect';
  connectionType: 'BTP_API' | 'ODATA';
  url: string;
  systems: string[];
  hanaConfigured: boolean;
}

export const MOCK_SAP_DESTINATIONS: SapDestination[] = [
  { id: 'dest-1', name: 'Maitsys-Trial', shortLabel: 'EMP', status: 'Ready To Connect', connectionType: 'BTP_API', url: 'https://mio-btp-gateway.cfapps.us10-001.hana.ondemand.com', systems: ['GRC', 'GRQ', 'MSQ', 'EMP'], hanaConfigured: false },
  { id: 'dest-2', name: 'EMP_BTP1', shortLabel: 'EMP', status: 'Ready To Connect', connectionType: 'BTP_API', url: 'https://mio-btp-gateway.cfapps.us10-001.hana.ondemand.com', systems: ['EMP'], hanaConfigured: false },
  { id: 'dest-3', name: 'TEST EMP', shortLabel: 'EMP', status: 'Ready To Connect', connectionType: 'BTP_API', url: 'https://mio-btp-gateway.cfapps.us10-001.hana.ondemand.com', systems: ['EMP'], hanaConfigured: false },
  { id: 'dest-4', name: 'BTP Users', shortLabel: '', status: 'Ready To Connect', connectionType: 'BTP_API', url: 'https://mio-btp-gateway.cfapps.us10-001.hana.ondemand.com', systems: ['MSQ', 'GRC'], hanaConfigured: false },
  { id: 'dest-5', name: 'Maitsys-Testing', shortLabel: 'MSQ', status: 'Connected', connectionType: 'BTP_API', url: 'https://mio-btp-gateway.cfapps.us10-001.hana.ondemand.com', systems: ['GRC', 'MSQ', 'GRQ', 'EMP'], hanaConfigured: false },
  { id: 'dest-6', name: 'MSQ', shortLabel: '', status: 'Ready To Connect', connectionType: 'ODATA', url: 'https://dev.maitsys.com', systems: ['MIO_MONITOR'], hanaConfigured: false },
];
