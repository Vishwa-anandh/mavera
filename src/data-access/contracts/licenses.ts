import type { CloudProvider } from '../../shared/types/auth';

/** The modules a license (and the organization registered with it) is subscribed to. */
export interface LicenseModules {
  cloudCost: boolean;
  sapMonitoring: boolean;
}

export type LicensePlan = 'basic' | 'premium';

/** What a license entitles the organization that activates it to. */
export interface LicenseGrant {
  organizationName: string;
  plan: LicensePlan;
  /** Seats (users) the organization may invite. 0 means unlimited. */
  seats: number;
  modules: LicenseModules;
  cloudAccess: CloudProvider[];
  aiEnabled: boolean;
  startsAt: string;
  /** yyyy-mm-dd. */
  expiresAt: string;
}

/** A license as the license store holds it: a 64-character hex token plus its grant and state. */
export interface LicenseRecord extends LicenseGrant {
  token: string;
  status: 'unused' | 'used';
  /** Organization the token was used for, once used. */
  organizationId?: string;
  usedAt?: string;
}

export type LicenseFailureReason = 'invalid-format' | 'not-found' | 'already-used' | 'expired';

export type LicenseValidation =
  | { ok: true; license: LicenseGrant & { token: string } }
  | { ok: false; reason: LicenseFailureReason; message: string };

/** A sample token the prototype shows so the flow can be tried without a backend. */
export interface SampleLicenseToken {
  token: string;
  label: string;
  plan: LicensePlan;
  seats: number;
}

/** Company details collected on step 2 of "Register company". */
export interface CompanySignupDetails {
  token: string;
  companyName: string;
  adminName: string;
  email: string;
  phone?: string;
  country: string;
  companySize?: string;
}

export type SignupResult = { ok: true } | { ok: false; field?: 'token' | 'email' | 'companyName' | 'adminName' | 'country'; message: string };

/** What registering a company produced. */
export interface RegisteredCompany {
  organizationId: string;
  organizationName: string;
  adminEmail: string;
  adminName: string;
  plan: LicensePlan;
  seats: number;
  modules: LicenseModules;
  expiresAt: string;
}

/** What the sign-in needs to build a session for a registered company's administrator. */
export interface CompanySession {
  userId: string;
  email: string;
  name: string;
  organizationId: string;
  organizationName: string;
  plan: LicensePlan | undefined;
  seats: number;
  modules: LicenseModules;
  cloudAccess: CloudProvider[];
  invoiceOnly: boolean;
  aiEnabled: boolean;
  startsAt: string;
  expiresAt: string | null;
}

export type CompanyLogin = { ok: true; session: CompanySession } | { ok: false };

/** An organization as the Super Admin portal lists it. */
export interface OrganizationRecord {
  id: string;
  name: string;
  memberCount: number;
  modules: LicenseModules;
  /** Seat limit; 0 means unlimited. */
  maxUsers: number;
  aiEnabled: boolean;
  cloudAccess: CloudProvider[];
  invoiceOnly: boolean;
  startsAt: string;
  /** null means the subscription never expires. */
  expiresAt: string | null;
  /** Optional note the organization sees on its (read-only) Subscription page. */
  notes?: string;
  /** Plan the organization's license granted; absent for organizations onboarded without one. */
  plan?: LicensePlan;
}
