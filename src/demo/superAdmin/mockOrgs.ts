import type { MspRate, Organization } from '../../features/superAdmin';

/**
 * PROTOTYPE MOCK DATA. Field names/shapes match the real super-admin API
 * contract (see superAdminTypes.ts) so this slots into a real backend later
 * without a reshape — only the values here are invented, for a prototype
 * with no backend to call.
 */
export const MOCK_ORGANIZATIONS: Organization[] = [
  {
    id: 'org-acme',
    name: 'Acme Industrial Group',
    memberCount: 42,
    modules: { cloudCost: true, sapMonitoring: true },
    maxUsers: 0,
    aiEnabled: true,
    cloudAccess: ['azure', 'aws'],
    invoiceOnly: false,
    startsAt: '2025-01-15',
    expiresAt: '2027-01-15',
  },
  {
    id: 'org-northwind',
    name: 'Northwind Logistics',
    memberCount: 18,
    modules: { cloudCost: true, sapMonitoring: false },
    maxUsers: 25,
    aiEnabled: true,
    cloudAccess: ['azure'],
    invoiceOnly: false,
    startsAt: '2025-06-01',
    expiresAt: '2026-10-05',
  },
  {
    id: 'org-globex',
    name: 'Globex Manufacturing',
    memberCount: 9,
    modules: { cloudCost: false, sapMonitoring: true },
    maxUsers: 10,
    aiEnabled: false,
    cloudAccess: [],
    invoiceOnly: false,
    startsAt: '2026-02-10',
    expiresAt: '2026-10-12',
  },
  {
    id: 'org-initech',
    name: 'Initech Solutions',
    memberCount: 6,
    modules: { cloudCost: true, sapMonitoring: false },
    maxUsers: 5,
    aiEnabled: false,
    cloudAccess: ['aws'],
    invoiceOnly: true,
    startsAt: '2026-08-01',
    expiresAt: '2026-09-20',
  },
  {
    id: 'org-umbrella',
    name: 'Umbrella Biotech',
    memberCount: 63,
    modules: { cloudCost: true, sapMonitoring: true },
    maxUsers: 250,
    aiEnabled: true,
    cloudAccess: ['azure', 'aws', 'btp', 'gcp'],
    invoiceOnly: false,
    startsAt: '2024-11-01',
    expiresAt: null,
  },
  {
    id: 'org-hooli',
    name: 'Hooli Cloud Services',
    memberCount: 14,
    modules: { cloudCost: true, sapMonitoring: false },
    maxUsers: 10,
    aiEnabled: false,
    cloudAccess: ['gcp'],
    invoiceOnly: false,
    startsAt: '2026-03-18',
    expiresAt: '2026-12-31',
  },
];

export const MOCK_MSP_RATES: MspRate[] = [
  { provider: 'azure', rate: 0.07, label: 'Microsoft Azure', updatedAt: '2026-08-01', updatedBy: 'ops@maitsys.com' },
  { provider: 'aws', rate: 0.06, label: 'Amazon Web Services', updatedAt: '2026-08-01', updatedBy: 'ops@maitsys.com' },
  { provider: 'btp', rate: 0.05, label: 'SAP BTP', updatedAt: '2026-06-14', updatedBy: 'ops@maitsys.com' },
  { provider: 'gcp', rate: 0.05, label: 'Google Cloud', updatedAt: '2026-06-14', updatedBy: 'ops@maitsys.com' },
];
