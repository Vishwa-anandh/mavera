import type {
  CompanyLogin, CompanySession, CompanySignupDetails, LicenseGrant, LicenseModules, LicensePlan, LicenseRecord, LicenseValidation,
  RegisteredCompany, SampleLicenseToken, SignupResult,
} from '../contracts/licenses';
import { ORGANIZATION_LICENSE_TOKENS, buildSampleLicenses } from '../../demo/licenses/mockLicenses';
import { organizationRepository } from './organizationRepository';

/**
 * License tokens and company registration. PROTOTYPE: there is no backend, so licenses, the
 * pending sign-ups, verification codes and the registered administrators live in memory for the
 * session. Each method is shaped like the call that will replace it (validate a token, start a
 * sign-up, verify the emailed code, complete it).
 */

/** A license token: 64 hexadecimal characters. */
export const LICENSE_TOKEN_PATTERN = /^[0-9a-f]{64}$/i;
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
/** The built-in demo account (AuthContext.DEMO_EMAIL); a company cannot register with it. */
const RESERVED_EMAILS = new Set(['demo@mavera.local', 'cloud@mavera.local']);
const CODE_LIFETIME_MS = 10 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;
const MIN_PASSWORD_LENGTH = 8;

let latencyMs = 450;
const pause = () => (latencyMs > 0 ? new Promise<void>((resolve) => setTimeout(resolve, latencyMs)) : Promise.resolve());

const today = () => new Date().toISOString().slice(0, 10);

function formatDate(isoDay: string): string {
  return new Date(isoDay).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function apiError(message: string): never {
  throw { response: { data: { error: message } } };
}

function randomHex(length: number): string {
  const bytes = new Uint8Array(length / 2);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

interface Pending {
  details: CompanySignupDetails;
  code?: string;
  codeIssuedAt?: number;
  attempts: number;
  verified: boolean;
}

interface CompanyAccount {
  email: string;
  password: string;
  name: string;
  organizationId: string;
}

let licenses = new Map<string, LicenseRecord>();
let pending = new Map<string, Pending>(); // keyed by lowercase email
let accounts = new Map<string, CompanyAccount>(); // keyed by lowercase email

function seed() {
  licenses = new Map(buildSampleLicenses().map((license) => [license.token, license]));
  for (const org of organizationRepository.list()) {
    const token = ORGANIZATION_LICENSE_TOKENS[org.id];
    if (!token) continue;
    licenses.set(token, {
      token,
      organizationName: org.name,
      plan: org.modules.cloudCost && org.modules.sapMonitoring ? 'premium' : 'basic',
      seats: org.maxUsers,
      modules: { ...org.modules },
      cloudAccess: [...org.cloudAccess],
      aiEnabled: org.aiEnabled,
      startsAt: org.startsAt,
      expiresAt: org.expiresAt ?? '9999-12-31',
      status: 'used',
      organizationId: org.id,
      usedAt: org.startsAt,
    });
  }
  pending = new Map();
  accounts = new Map();
}
seed();

const normalise = (token: string) => token.trim().toLowerCase();
const emailKey = (email: string) => email.trim().toLowerCase();

function toGrant(license: LicenseRecord): LicenseGrant & { token: string } {
  const { token, organizationName, plan, seats, modules, cloudAccess, aiEnabled, startsAt, expiresAt } = license;
  return structuredClone({ token, organizationName, plan, seats, modules, cloudAccess, aiEnabled, startsAt, expiresAt });
}

function check(rawToken: string): LicenseValidation {
  const token = normalise(rawToken);
  if (!LICENSE_TOKEN_PATTERN.test(token)) {
    return { ok: false, reason: 'invalid-format', message: 'Not a valid token. A license token is 64 characters long and uses only the digits 0-9 and the letters a-f.' };
  }
  const license = licenses.get(token);
  if (!license) {
    return { ok: false, reason: 'not-found', message: 'Token not found. Check it for typos, or ask your Maitsys contact to confirm the license.' };
  }
  if (license.status === 'used') {
    return { ok: false, reason: 'already-used', message: 'Token already used. This license has already set up an organization, so sign in instead or ask Maitsys for a new token.' };
  }
  if (license.expiresAt < today()) {
    return { ok: false, reason: 'expired', message: `License expired on ${formatDate(license.expiresAt)}. Ask Maitsys to renew it or issue a new token.` };
  }
  return { ok: true, license: toGrant(license) };
}

function sessionFor(account: CompanyAccount): CompanySession | undefined {
  const org = organizationRepository.get(account.organizationId);
  if (!org) return undefined;
  return {
    userId: `company-${org.id}`,
    email: account.email,
    name: account.name,
    organizationId: org.id,
    organizationName: org.name,
    plan: org.plan,
    seats: org.maxUsers,
    modules: { ...org.modules },
    cloudAccess: [...org.cloudAccess],
    invoiceOnly: org.invoiceOnly,
    aiEnabled: org.aiEnabled,
    startsAt: org.startsAt,
    expiresAt: org.expiresAt,
  };
}

export const licenseRepository = {
  /** Checks a token the way the activation server would: format, existence, use, expiry. */
  async validateToken(rawToken: string): Promise<LicenseValidation> {
    await pause();
    return check(rawToken);
  },

  /** The unused, unexpired sample licenses, so the prototype can be tried without a backend. */
  listSampleTokens(): SampleLicenseToken[] {
    return [...licenses.values()]
      .filter((license) => license.status === 'unused' && license.expiresAt >= today())
      .map((license) => ({
        token: license.token,
        label: `${license.plan === 'premium' ? 'Premium' : 'Basic'}, ${license.seats} seats`,
        plan: license.plan,
        seats: license.seats,
      }));
  },

  /** Step 2: records the company details against the token and reserves it for this sign-up. */
  async startSignup(details: CompanySignupDetails): Promise<SignupResult> {
    await pause();
    const verdict = check(details.token);
    if (!verdict.ok) return { ok: false, field: 'token', message: verdict.message };
    const email = emailKey(details.email);
    if (!details.companyName.trim()) return { ok: false, field: 'companyName', message: 'Enter your company name.' };
    if (!details.adminName.trim()) return { ok: false, field: 'adminName', message: 'Enter your full name.' };
    if (!EMAIL_PATTERN.test(email)) return { ok: false, field: 'email', message: 'Enter a valid work email address.' };
    if (!details.country.trim()) return { ok: false, field: 'country', message: 'Choose your country.' };
    if (RESERVED_EMAILS.has(email) || accounts.has(email)) {
      return { ok: false, field: 'email', message: 'That email address is already registered. Sign in instead, or use a different work email.' };
    }
    const token = normalise(details.token);
    // One open sign-up per token: starting again (for instance after going back to fix a typo) replaces it.
    for (const [key, entry] of pending) if (normalise(entry.details.token) === token) pending.delete(key);
    pending.set(email, { details: { ...details, token, email: details.email.trim() }, attempts: 0, verified: false });
    return { ok: true };
  },

  hasPendingSignup(email: string): boolean {
    return pending.has(emailKey(email));
  },

  /** Step 3: "emails" a 6-digit code. Resolves to the same shape as the real send-otp call. */
  async sendVerificationCode(email: string): Promise<{ orgExists: false }> {
    await pause();
    const entry = pending.get(emailKey(email));
    if (!entry) apiError('Start by activating a license, then enter your company details.');
    entry.code = String(Math.floor(100000 + Math.random() * 900000));
    entry.codeIssuedAt = Date.now();
    entry.attempts = 0;
    entry.verified = false;
    return { orgExists: false };
  },

  /** PROTOTYPE ONLY: nothing is emailed, so the page can show the code it "sent". */
  peekVerificationCode(email: string): string | undefined {
    return pending.get(emailKey(email))?.code;
  },

  async verifyVerificationCode(email: string, code: string): Promise<void> {
    await pause();
    const entry = pending.get(emailKey(email));
    if (!entry?.code || entry.codeIssuedAt === undefined) apiError('Request a verification code first.');
    if (Date.now() - entry.codeIssuedAt > CODE_LIFETIME_MS) apiError('That code has expired. Request a new one.');
    if (entry.attempts >= MAX_CODE_ATTEMPTS) apiError('Too many incorrect attempts. Request a new code.');
    if (code.trim() !== entry.code) {
      entry.attempts += 1;
      apiError('That code is not correct. Check the 6 digits in your email and try again.');
    }
    entry.verified = true;
  },

  /** Step 4: creates the organization and its administrator, and marks the token used. */
  async completeSignup(email: string, password: string): Promise<RegisteredCompany> {
    await pause();
    const key = emailKey(email);
    const entry = pending.get(key);
    if (!entry?.verified) apiError('Verify your email address before choosing a password.');
    if (password.length < MIN_PASSWORD_LENGTH) apiError(`Your password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    const verdict = check(entry.details.token);
    if (!verdict.ok) apiError(verdict.message);
    const license = licenses.get(normalise(entry.details.token))!;
    const org = organizationRepository.create({
      name: entry.details.companyName.trim(),
      memberCount: 1,
      modules: { ...license.modules },
      maxUsers: license.seats,
      aiEnabled: license.aiEnabled,
      cloudAccess: [...license.cloudAccess],
      invoiceOnly: false,
      startsAt: today(),
      expiresAt: license.expiresAt,
      plan: license.plan,
      notes: `Registered with a license token on ${formatDate(today())}.`,
    });
    licenses.set(license.token, { ...license, status: 'used', organizationId: org.id, usedAt: today() });
    accounts.set(key, { email: entry.details.email, password, name: entry.details.adminName.trim(), organizationId: org.id });
    pending.delete(key);
    return {
      organizationId: org.id,
      organizationName: org.name,
      adminEmail: entry.details.email,
      adminName: entry.details.adminName.trim(),
      plan: license.plan,
      seats: license.seats,
      modules: { ...license.modules },
      expiresAt: license.expiresAt,
    };
  },

  /** Sign-in for a registered company's administrator; null for an email that never registered, `ok: false` for a wrong password. */
  authenticate(email: string, password: string): CompanyLogin | null {
    const account = accounts.get(emailKey(email));
    if (!account) return null;
    if (account.password !== password) return { ok: false };
    const session = sessionFor(account);
    return session ? { ok: true, session } : { ok: false };
  },

  /** Changes a registered administrator's password; throws the API-shaped error when the current one is wrong. */
  changePassword(email: string, currentPassword: string, newPassword: string): void {
    const account = accounts.get(emailKey(email));
    if (!account || account.password !== currentPassword) apiError('Your current password is incorrect.');
    if (newPassword.length < MIN_PASSWORD_LENGTH) apiError(`Your password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    account.password = newPassword;
  },

  /** A fresh, unique 64-character license token (what a super admin issues). */
  generateToken(): string {
    let token = randomHex(64);
    while (licenses.has(token)) token = randomHex(64);
    return token;
  },

  /** Records `token` as the license of an organization a super admin created directly. */
  assignToOrganization(token: string, orgId: string, plan?: LicensePlan): void {
    const org = organizationRepository.get(orgId);
    if (!org || !LICENSE_TOKEN_PATTERN.test(token)) return;
    const modules: LicenseModules = { ...org.modules };
    licenses.set(normalise(token), {
      token: normalise(token),
      organizationName: org.name,
      plan: plan ?? (modules.cloudCost && modules.sapMonitoring ? 'premium' : 'basic'),
      seats: org.maxUsers,
      modules,
      cloudAccess: [...org.cloudAccess],
      aiEnabled: org.aiEnabled,
      startsAt: org.startsAt,
      expiresAt: org.expiresAt ?? '9999-12-31',
      status: 'used',
      organizationId: org.id,
      usedAt: today(),
    });
  },

  /** The license token an organization holds, if any. */
  getTokenForOrganization(orgId: string): string | undefined {
    for (const license of licenses.values()) if (license.organizationId === orgId) return license.token;
    return undefined;
  },

  /** Test helper: shortens or removes the simulated network delay. */
  setLatency(milliseconds: number): void {
    latencyMs = milliseconds;
  },

  /** Test helper: restores the seeded licenses and clears pending sign-ups and registered companies. */
  reset(): void {
    organizationRepository.reset();
    seed();
  },
};
