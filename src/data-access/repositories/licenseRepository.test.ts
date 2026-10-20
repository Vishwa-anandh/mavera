import { beforeEach, describe, expect, it } from 'vitest';
import { LICENSE_TOKEN_PATTERN, licenseRepository } from './licenseRepository';
import { organizationRepository } from './organizationRepository';
import { SAMPLE_LICENSE_TOKENS } from '../../demo/licenses/mockLicenses';

const PREMIUM = SAMPLE_LICENSE_TOKENS.premium;
const BASIC = SAMPLE_LICENSE_TOKENS.basic;

const details = (overrides: Partial<Parameters<typeof licenseRepository.startSignup>[0]> = {}) => ({
  token: PREMIUM,
  companyName: 'Contoso Industries',
  adminName: 'Priya Raman',
  email: 'priya@contoso.com',
  country: 'India',
  ...overrides,
});

async function register(email = 'priya@contoso.com', password = 'Str0ng!Passw0rd', token = PREMIUM) {
  expect(await licenseRepository.startSignup(details({ email, token }))).toEqual({ ok: true });
  await licenseRepository.sendVerificationCode(email);
  await licenseRepository.verifyVerificationCode(email, licenseRepository.peekVerificationCode(email)!);
  return licenseRepository.completeSignup(email, password);
}

describe('licenseRepository.validateToken', () => {
  beforeEach(() => {
    licenseRepository.setLatency(0);
    licenseRepository.reset();
  });

  it('accepts the Premium sample and returns what it grants', async () => {
    const result = await licenseRepository.validateToken(PREMIUM);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.license).toMatchObject({ organizationName: 'Contoso Industries', plan: 'premium', seats: 25, modules: { cloudCost: true, sapMonitoring: true } });
    // Expires 12 months out.
    const months = (new Date(result.license.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30);
    expect(months).toBeGreaterThan(11);
    expect(months).toBeLessThan(13);
  });

  it('accepts the cloud-only Basic sample', async () => {
    const result = await licenseRepository.validateToken(BASIC);
    expect(result.ok && result.license).toMatchObject({ plan: 'basic', seats: 5, modules: { cloudCost: true, sapMonitoring: false } });
  });

  it('ignores surrounding spaces and letter case', async () => {
    expect((await licenseRepository.validateToken(`  ${PREMIUM.toUpperCase()}  `)).ok).toBe(true);
  });

  it.each([
    ['', 'invalid-format'],
    ['not-a-token', 'invalid-format'],
    [PREMIUM.slice(0, 63), 'invalid-format'],
    [`${PREMIUM.slice(0, 63)}g`, 'invalid-format'],
  ])('rejects %j as a bad format', async (value, reason) => {
    const result = await licenseRepository.validateToken(value);
    expect(result).toMatchObject({ ok: false, reason });
    expect(!result.ok && result.message).toMatch(/^Not a valid token/);
  });

  it('says when no license has that token', async () => {
    const result = await licenseRepository.validateToken('a'.repeat(64));
    expect(result).toMatchObject({ ok: false, reason: 'not-found' });
    expect(!result.ok && result.message).toMatch(/^Token not found/);
  });

  it('says when the license is already in use', async () => {
    const result = await licenseRepository.validateToken(SAMPLE_LICENSE_TOKENS.used);
    expect(result).toMatchObject({ ok: false, reason: 'already-used' });
    expect(!result.ok && result.message).toMatch(/^Token already used/);
  });

  it('says when the license has expired, and when', async () => {
    const result = await licenseRepository.validateToken(SAMPLE_LICENSE_TOKENS.expired);
    expect(result).toMatchObject({ ok: false, reason: 'expired' });
    expect(!result.ok && result.message).toBe('License expired on Jan 15, 2025. Ask Maitsys to renew it or issue a new token.');
  });

  it('lists only the usable sample licenses', () => {
    const tokens = licenseRepository.listSampleTokens().map((sample) => sample.token);
    expect(tokens).toEqual([PREMIUM, BASIC]);
    expect(tokens.every((token) => LICENSE_TOKEN_PATTERN.test(token))).toBe(true);
  });

  it('generates unique 64-character hex tokens', () => {
    const a = licenseRepository.generateToken();
    const b = licenseRepository.generateToken();
    expect(a).toMatch(LICENSE_TOKEN_PATTERN);
    expect(a).not.toBe(b);
  });
});

describe('licenseRepository company registration', () => {
  beforeEach(() => {
    licenseRepository.setLatency(0);
    licenseRepository.reset();
  });

  it('creates an Active organization with the license plan, seats and modules, and marks the token used', async () => {
    const before = organizationRepository.list().length;
    const company = await register();

    expect(company).toMatchObject({ organizationName: 'Contoso Industries', plan: 'premium', seats: 25, adminEmail: 'priya@contoso.com' });
    const org = organizationRepository.get(company.organizationId)!;
    expect(organizationRepository.list()).toHaveLength(before + 1);
    expect(org).toMatchObject({ name: 'Contoso Industries', plan: 'premium', maxUsers: 25, memberCount: 1, modules: { cloudCost: true, sapMonitoring: true } });
    expect(org.expiresAt! > new Date().toISOString().slice(0, 10)).toBe(true);
    expect(licenseRepository.getTokenForOrganization(org.id)).toBe(PREMIUM);
    expect(await licenseRepository.validateToken(PREMIUM)).toMatchObject({ ok: false, reason: 'already-used' });
    expect(licenseRepository.listSampleTokens().map((sample) => sample.token)).toEqual([BASIC]);
  });

  it('registers a Basic company without the SAP module', async () => {
    const company = await register('sam@fabrikam.com', 'Str0ng!Passw0rd', BASIC);
    expect(organizationRepository.get(company.organizationId)).toMatchObject({ plan: 'basic', maxUsers: 5, modules: { cloudCost: true, sapMonitoring: false } });
  });

  it('lets the new administrator sign in, and only with the right password', async () => {
    await register('priya@contoso.com', 'Str0ng!Passw0rd');
    expect(licenseRepository.authenticate('PRIYA@contoso.com', 'wrong')).toEqual({ ok: false });
    expect(licenseRepository.authenticate('nobody@contoso.com', 'Str0ng!Passw0rd')).toBeNull();
    const login = licenseRepository.authenticate('priya@contoso.com', 'Str0ng!Passw0rd');
    expect(login?.ok && login.session).toMatchObject({
      email: 'priya@contoso.com', name: 'Priya Raman', organizationName: 'Contoso Industries', seats: 25, plan: 'premium',
      modules: { cloudCost: true, sapMonitoring: true },
    });
  });

  it('sign-in reflects later changes a super admin makes to the organization', async () => {
    const company = await register();
    const org = organizationRepository.get(company.organizationId)!;
    organizationRepository.save({ ...org, modules: { cloudCost: true, sapMonitoring: false }, maxUsers: 40 });
    const login = licenseRepository.authenticate('priya@contoso.com', 'Str0ng!Passw0rd');
    expect(login?.ok && login.session).toMatchObject({ seats: 40, modules: { cloudCost: true, sapMonitoring: false } });
  });

  it('rejects a sign-up whose token is no longer usable', async () => {
    await register();
    expect(await licenseRepository.startSignup(details({ email: 'second@contoso.com' }))).toMatchObject({ ok: false, field: 'token', message: expect.stringMatching(/^Token already used/) });
  });

  it('rejects an email that is already registered, including the demo account', async () => {
    await register();
    expect(await licenseRepository.startSignup(details({ token: BASIC, email: 'Priya@Contoso.com' }))).toMatchObject({ ok: false, field: 'email' });
    expect(await licenseRepository.startSignup(details({ token: BASIC, email: 'demo@mavera.local' }))).toMatchObject({ ok: false, field: 'email' });
  });

  it('validates the company details', async () => {
    expect(await licenseRepository.startSignup(details({ companyName: '  ' }))).toMatchObject({ ok: false, field: 'companyName' });
    expect(await licenseRepository.startSignup(details({ adminName: '' }))).toMatchObject({ ok: false, field: 'adminName' });
    expect(await licenseRepository.startSignup(details({ email: 'not-an-email' }))).toMatchObject({ ok: false, field: 'email' });
    expect(await licenseRepository.startSignup(details({ country: '' }))).toMatchObject({ ok: false, field: 'country' });
  });

  it('checks the verification code: wrong, then right', async () => {
    await licenseRepository.startSignup(details());
    expect(licenseRepository.hasPendingSignup('priya@contoso.com')).toBe(true);
    await licenseRepository.sendVerificationCode('priya@contoso.com');
    const code = licenseRepository.peekVerificationCode('priya@contoso.com')!;
    expect(code).toMatch(/^\d{6}$/);
    const wrong = code === '000000' ? '111111' : '000000';
    await expect(licenseRepository.verifyVerificationCode('priya@contoso.com', wrong)).rejects.toMatchObject({ response: { data: { error: expect.stringMatching(/not correct/) } } });
    await expect(licenseRepository.verifyVerificationCode('priya@contoso.com', code)).resolves.toBeUndefined();
  });

  it('locks a code after too many wrong attempts', async () => {
    await licenseRepository.startSignup(details());
    await licenseRepository.sendVerificationCode('priya@contoso.com');
    const code = licenseRepository.peekVerificationCode('priya@contoso.com')!;
    const wrong = code === '000000' ? '111111' : '000000';
    for (let attempt = 0; attempt < 5; attempt += 1) await licenseRepository.verifyVerificationCode('priya@contoso.com', wrong).catch(() => undefined);
    await expect(licenseRepository.verifyVerificationCode('priya@contoso.com', code)).rejects.toMatchObject({ response: { data: { error: expect.stringMatching(/Too many/) } } });
  });

  it('refuses to finish before the email is verified, or with a short password', async () => {
    await licenseRepository.startSignup(details());
    await expect(licenseRepository.completeSignup('priya@contoso.com', 'Str0ng!Passw0rd')).rejects.toMatchObject({ response: { data: { error: expect.stringMatching(/Verify your email/) } } });
    await licenseRepository.sendVerificationCode('priya@contoso.com');
    await licenseRepository.verifyVerificationCode('priya@contoso.com', licenseRepository.peekVerificationCode('priya@contoso.com')!);
    await expect(licenseRepository.completeSignup('priya@contoso.com', 'short')).rejects.toMatchObject({ response: { data: { error: expect.stringMatching(/at least 8/) } } });
    expect(organizationRepository.list().some((org) => org.name === 'Contoso Industries')).toBe(false);
  });

  it('lets a second tab not reuse a token that finished in the first', async () => {
    await licenseRepository.startSignup(details({ email: 'a@contoso.com' }));
    await licenseRepository.sendVerificationCode('a@contoso.com');
    await licenseRepository.verifyVerificationCode('a@contoso.com', licenseRepository.peekVerificationCode('a@contoso.com')!);
    await licenseRepository.completeSignup('a@contoso.com', 'Str0ng!Passw0rd');
    await expect(licenseRepository.completeSignup('a@contoso.com', 'Str0ng!Passw0rd')).rejects.toBeDefined();
  });

  it('changes a registered administrator password', async () => {
    await register();
    expect(() => licenseRepository.changePassword('priya@contoso.com', 'nope', 'N3w!Passw0rd')).toThrow();
    licenseRepository.changePassword('priya@contoso.com', 'Str0ng!Passw0rd', 'N3w!Passw0rd');
    expect(licenseRepository.authenticate('priya@contoso.com', 'N3w!Passw0rd')?.ok).toBe(true);
  });

  it('records a generated token against an organization a super admin created', () => {
    const org = organizationRepository.create({
      name: 'Stark Industries', modules: { cloudCost: true, sapMonitoring: false }, maxUsers: 10, aiEnabled: false, cloudAccess: [],
      invoiceOnly: false, startsAt: '2026-10-01', expiresAt: '2027-10-01',
    });
    const token = licenseRepository.generateToken();
    licenseRepository.assignToOrganization(token, org.id);
    expect(licenseRepository.getTokenForOrganization(org.id)).toBe(token);
  });

  it('gives every seeded organization a token to look up', () => {
    for (const org of organizationRepository.list()) expect(licenseRepository.getTokenForOrganization(org.id)).toMatch(LICENSE_TOKEN_PATTERN);
  });
});
