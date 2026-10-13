/** PROTOTYPE MOCK DATA — SAP BTP user/role assessment for the connected GRC
 * destination. */
export interface BtpUser {
  fullName: string;
  usernameEmail: string;
  groups: string[];
  status: 'Active' | 'Inactive';
  verified: boolean;
  lastLogin: string | null;
  createdAt: string;
}

/** Empty on purpose, matching MIO's own "0 Of 0 Users" state for this
 * destination. */
export const MOCK_BTP_USERS: BtpUser[] = [];
export const MOCK_BTP_ROLE_COLLECTIONS: Array<{ name: string; roles: number; assignedUsers: number }> = [];
export const MOCK_BTP_ROLES: Array<{ name: string; description: string; scope: string }> = [];
