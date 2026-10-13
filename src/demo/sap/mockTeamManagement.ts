/** PROTOTYPE MOCK DATA — fictional team members (not the real destination's
 * user list) for the SAP Monitoring module's own access management. */
export type SapAccess = 'Full Access' | 'Read & Write' | 'Read Only';
export type SapRole = 'ADMIN' | 'MEMBER';

export interface SapTeamMember {
  id: string;
  name: string;
  email: string;
  role: SapRole;
  access: SapAccess;
  priorityAlerts: boolean;
  status: 'Active' | 'Inactive';
}

export const MOCK_SAP_TEAM: SapTeamMember[] = [
  { id: 'mem-1', name: 'Dev Preview', email: 'demo@mavera.local', role: 'ADMIN', access: 'Full Access', priorityAlerts: true, status: 'Active' },
  { id: 'mem-2', name: 'Priya Raman', email: 'priya.raman@mavera.local', role: 'MEMBER', access: 'Read & Write', priorityAlerts: true, status: 'Active' },
  { id: 'mem-3', name: 'Karthik Iyer', email: 'karthik.iyer@mavera.local', role: 'MEMBER', access: 'Read Only', priorityAlerts: false, status: 'Active' },
  { id: 'mem-4', name: 'Meera Nair', email: 'meera.nair@mavera.local', role: 'MEMBER', access: 'Read Only', priorityAlerts: false, status: 'Active' },
  { id: 'mem-5', name: 'Arjun Menon', email: 'arjun.menon@mavera.local', role: 'MEMBER', access: 'Read Only', priorityAlerts: false, status: 'Active' },
  { id: 'mem-6', name: 'Divya Shankar', email: 'divya.shankar@mavera.local', role: 'MEMBER', access: 'Read & Write', priorityAlerts: true, status: 'Active' },
  { id: 'mem-7', name: 'Rahul Verma', email: 'rahul.verma@mavera.local', role: 'MEMBER', access: 'Read Only', priorityAlerts: false, status: 'Inactive' },
  { id: 'mem-8', name: 'Sneha Pillai', email: 'sneha.pillai@mavera.local', role: 'MEMBER', access: 'Read Only', priorityAlerts: false, status: 'Active' },
  { id: 'mem-9', name: 'Vikram Rao', email: 'vikram.rao@mavera.local', role: 'MEMBER', access: 'Read Only', priorityAlerts: false, status: 'Active' },
  { id: 'mem-10', name: 'Ananya Krishnan', email: 'ananya.krishnan@mavera.local', role: 'MEMBER', access: 'Read Only', priorityAlerts: false, status: 'Active' },
  { id: 'mem-11', name: 'Suresh Babu', email: 'suresh.babu@mavera.local', role: 'MEMBER', access: 'Read Only', priorityAlerts: false, status: 'Inactive' },
  { id: 'mem-12', name: 'Lakshmi Narayanan', email: 'lakshmi.narayanan@mavera.local', role: 'MEMBER', access: 'Read & Write', priorityAlerts: true, status: 'Active' },
  { id: 'mem-13', name: 'Farhan Ahmed', email: 'farhan.ahmed@mavera.local', role: 'MEMBER', access: 'Read Only', priorityAlerts: false, status: 'Active' },
  { id: 'mem-14', name: 'Ritu Choudhary', email: 'ritu.choudhary@mavera.local', role: 'MEMBER', access: 'Read Only', priorityAlerts: false, status: 'Active' },
];
