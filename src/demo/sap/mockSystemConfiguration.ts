import type { SapDestination } from '../../data-access';

/** PROTOTYPE MOCK DATA — SAP destination/connection endpoints, distinct from the org-wide
 * cloud-account connections elsewhere in Mavera. Hosts and names are sample values. */
const base = { timezone: 'UTC — UTC+0', client: '', language: '', username: '', hanaConfigured: false } as const;

export const SEED_SAP_DESTINATIONS: SapDestination[] = [
  { ...base, id: 'dest-1', name: 'Maitsys-Trial', shortLabel: 'EMP', status: 'Ready To Connect', connectionType: 'BTP_API', url: 'https://mio-btp-gateway.cfapps.us10-001.hana.ondemand.com', systems: ['GRC', 'GRQ', 'MSQ', 'EMP'] },
  { ...base, id: 'dest-2', name: 'EMP_BTP1', shortLabel: 'EMP', status: 'Ready To Connect', connectionType: 'BTP_API', url: 'https://mio-btp-gateway.cfapps.us10-001.hana.ondemand.com', systems: ['EMP'] },
  { ...base, id: 'dest-3', name: 'TEST EMP', shortLabel: 'EMP', status: 'Ready To Connect', connectionType: 'BTP_API', url: 'https://mio-btp-gateway.cfapps.us10-001.hana.ondemand.com', systems: ['EMP'] },
  { ...base, id: 'dest-4', name: 'BTP Users', shortLabel: '', status: 'Ready To Connect', connectionType: 'BTP_API', url: 'https://mio-btp-gateway.cfapps.us10-001.hana.ondemand.com', systems: ['MSQ', 'GRC'] },
  { ...base, id: 'dest-5', name: 'Maitsys-Testing', shortLabel: 'MSQ', status: 'Connected', connectionType: 'BTP_API', url: 'https://mio-btp-gateway.cfapps.us10-001.hana.ondemand.com', systems: ['GRC', 'MSQ', 'GRQ', 'EMP'] },
  { ...base, id: 'dest-6', name: 'MSQ', shortLabel: '', status: 'Ready To Connect', connectionType: 'ODATA', url: 'https://dev.maitsys.com', systems: ['MIO_MONITOR'] },
];
