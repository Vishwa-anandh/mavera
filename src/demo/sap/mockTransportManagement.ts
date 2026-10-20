import type { SapTransport, TransportActivity, TransportState } from '../../data-access';

/**
 * PROTOTYPE MOCK DATA — SAP transport requests (STMS) for the DEV → QAS landscape, plus the activity
 * log those requests would leave behind. The request numbers, owners and descriptions are sample
 * values; a real integration reads them from STMS.
 */
interface SeedTransport extends SapTransport {
  releasedAt: string | null;
  importedAt: string | null;
}

const SEED: SeedTransport[] = [
  { trNumber: 'DEVK900418', description: 'Fix pricing procedure for intercompany orders', type: 'Workbench', priority: 'High', owner: 'K.ANAND', status: 'Failed', route: 'DEV → QAS', date: '2026-09-14T11:20:00', releasedAt: '2026-09-14T11:20:00', importedAt: '2026-09-14T13:05:00' },
  { trNumber: 'DEVK900415', description: 'New authorization role for GRC access control', type: 'Customizing', priority: 'Normal', owner: 'S.MEERA', status: 'Released', route: 'DEV → QAS', date: '2026-09-12T15:42:00', releasedAt: '2026-09-12T15:42:00', importedAt: null },
  { trNumber: 'DEVK900414', description: 'Update ABAP report ZFI_OPEN_ITEMS selection screen', type: 'Workbench', priority: 'Normal', owner: 'K.ANAND', status: 'Released', route: 'DEV → QAS', date: '2026-09-12T10:08:00', releasedAt: '2026-09-12T10:08:00', importedAt: null },
  { trNumber: 'DEVK900412', description: 'Vendor master enhancement: add payment block reason', type: 'Workbench', priority: 'High', owner: 'R.VIKRAM', status: 'Released', route: 'DEV → QAS', date: '2026-09-11T16:30:00', releasedAt: '2026-09-11T16:30:00', importedAt: null },
  { trNumber: 'DEVK900409', description: 'Customizing: tax codes for new plant 1030', type: 'Customizing', priority: 'Normal', owner: 'S.MEERA', status: 'Open', route: null, date: '2026-09-10T09:15:00', releasedAt: null, importedAt: null },
  { trNumber: 'DEVK900407', description: 'Fiori launchpad catalogue for treasury users', type: 'Customizing', priority: 'Normal', owner: 'P.LAKSHMI', status: 'Open', route: null, date: '2026-09-09T14:50:00', releasedAt: null, importedAt: null },
  { trNumber: 'DEVK900405', description: 'Number range intervals for sales documents', type: 'Customizing', priority: 'Normal', owner: 'R.VIKRAM', status: 'Open', route: null, date: '2026-09-08T12:02:00', releasedAt: null, importedAt: null },
  { trNumber: 'DEVK900402', description: 'Interface IDoc ORDERS05 mapping correction', type: 'Workbench', priority: 'High', owner: 'K.ANAND', status: 'Imported', route: 'DEV → QAS', date: '2026-09-07T17:25:00', releasedAt: '2026-09-07T17:25:00', importedAt: '2026-09-08T08:40:00' },
  { trNumber: 'DEVK900399', description: 'Smart forms: invoice layout for EU entities', type: 'Workbench', priority: 'Normal', owner: 'P.LAKSHMI', status: 'Imported', route: 'DEV → QAS', date: '2026-09-04T13:11:00', releasedAt: '2026-09-04T13:11:00', importedAt: '2026-09-05T08:35:00' },
  { trNumber: 'DEVK900396', description: 'Output determination for delivery notes', type: 'Customizing', priority: 'Normal', owner: 'S.MEERA', status: 'Imported', route: 'DEV → QAS', date: '2026-09-03T10:47:00', releasedAt: '2026-09-03T10:47:00', importedAt: '2026-09-04T08:30:00' },
  { trNumber: 'DEVK900392', description: 'BAdI implementation for goods receipt validation', type: 'Workbench', priority: 'High', owner: 'R.VIKRAM', status: 'Imported', route: 'DEV → QAS', date: '2026-09-02T16:05:00', releasedAt: '2026-09-02T16:05:00', importedAt: '2026-09-03T08:32:00' },
  { trNumber: 'DEVK900388', description: 'Material type configuration for spare parts', type: 'Customizing', priority: 'Normal', owner: 'P.LAKSHMI', status: 'Imported', route: 'DEV → QAS', date: '2026-09-01T11:30:00', releasedAt: '2026-09-01T11:30:00', importedAt: '2026-09-02T08:28:00' },
];

const pad = (n: number) => String(n).padStart(2, '0');

function buildActivity(transports: SeedTransport[]): TransportActivity[] {
  const events: Array<Omit<TransportActivity, 'id'>> = [];
  for (let day = 1; day <= 15; day += 1) {
    events.push({ at: `2026-09-${pad(day)}T06:00:00`, level: 'Info', type: 'Sync', message: 'STMS queue synchronised with the transport domain controller.', actor: 'System' });
  }
  for (const t of transports) {
    if (t.releasedAt) events.push({ at: t.releasedAt, level: 'Success', type: 'Release', message: `${t.trNumber} released: ${t.description}.`, actor: t.owner });
    if (t.importedAt && t.status === 'Imported') events.push({ at: t.importedAt, level: 'Success', type: 'Import', message: `${t.trNumber} imported into QAS.`, actor: 'System' });
    if (t.importedAt && t.status === 'Failed') events.push({ at: t.importedAt, level: 'Error', type: 'Import', message: `${t.trNumber} import into QAS failed with return code 8 (object locked in another request).`, actor: 'System' });
  }
  events.push(
    { at: '2026-09-05T08:20:00', level: 'Warning', type: 'Sync', message: 'STMS responded slowly (over 8 seconds); the queue was read from cache.', actor: 'System' },
    { at: '2026-09-01T09:00:00', level: 'Info', type: 'Route', message: 'Import route set to DEV → QAS.', actor: 'SAP admin' },
    { at: '2026-09-09T17:10:00', level: 'Info', type: 'Export', message: 'Transport list exported (12 requests).', actor: 'SAP admin' },
  );
  return events
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
    .map((event, index, all) => ({ ...event, id: `act-${all.length - index}` }));
}

export function seedTransportState(): TransportState {
  return {
    stmsConnected: true,
    lastSync: '2026-09-15T06:00:00',
    route: { source: 'DEV', target: 'QAS' },
    transports: SEED.map(({ releasedAt: _r, importedAt: _i, ...t }) => t),
    activity: buildActivity(SEED),
  };
}
