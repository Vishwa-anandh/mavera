import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, DEMO_EMAIL, DEMO_PASSWORD, useAuth } from './AuthContext';
import { licenseRepository } from '../../../data-access';
import { SAMPLE_LICENSE_TOKENS } from '../../../demo/licenses/mockLicenses';

const postMock = vi.fn();

vi.mock('../../../data-access/rest/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../data-access/rest/client')>();
  return { ...actual, api: { get: vi.fn(), post: (...args: unknown[]) => postMock(...args) } };
});

let auth: ReturnType<typeof useAuth> | null = null;
function Probe() {
  auth = useAuth();
  const { user, modules, maxUsers, planType } = auth;
  return (
    <div>
      <span data-testid="who">{user ? `${user.email}|${user.role}|${user.orgName}` : 'none'}</span>
      <span data-testid="entitlement">{`${modules.cloudCost}|${modules.sapMonitoring}|${maxUsers}|${planType}`}</span>
    </div>
  );
}

async function registerCompany(token: string, email: string, password: string) {
  await licenseRepository.startSignup({ token, companyName: 'Contoso Industries', adminName: 'Priya Raman', email, country: 'India' });
  await licenseRepository.sendVerificationCode(email);
  await licenseRepository.verifyVerificationCode(email, licenseRepository.peekVerificationCode(email)!);
  await licenseRepository.completeSignup(email, password);
}

describe('AuthContext with a registered company', () => {
  beforeEach(() => {
    localStorage.clear();
    postMock.mockReset();
    auth = null;
    licenseRepository.setLatency(0);
    licenseRepository.reset();
  });

  it('signs the new administrator in as an Admin with the license modules and seat limit', async () => {
    await registerCompany(SAMPLE_LICENSE_TOKENS.basic, 'sam@fabrikam.com', 'Str0ng!Passw0rd');
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(auth).not.toBeNull());

    await auth!.login('Sam@Fabrikam.com', 'Str0ng!Passw0rd');
    await waitFor(() => expect(screen.getByTestId('who')).toHaveTextContent('sam@fabrikam.com|admin|Contoso Industries'));
    expect(screen.getByTestId('entitlement')).toHaveTextContent('true|false|5|basic');
    expect(auth!.cloudAccess).toEqual(['azure', 'aws']);
    expect(postMock).not.toHaveBeenCalled();
  });

  it('rejects a wrong password for a registered company without calling the API', async () => {
    await registerCompany(SAMPLE_LICENSE_TOKENS.premium, 'priya@contoso.com', 'Str0ng!Passw0rd');
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(auth).not.toBeNull());

    await expect(auth!.login('priya@contoso.com', 'wrong')).rejects.toMatchObject({ response: { data: { error: 'Incorrect email or password.' } } });
    expect(postMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('who')).toHaveTextContent('none');
  });

  it('leaves the original demo account exactly as it was', async () => {
    await registerCompany(SAMPLE_LICENSE_TOKENS.premium, 'priya@contoso.com', 'Str0ng!Passw0rd');
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(auth).not.toBeNull());

    await auth!.login(DEMO_EMAIL, DEMO_PASSWORD);
    await waitFor(() => expect(screen.getByTestId('who')).toHaveTextContent('demo@mavera.local|admin|Maitsys Demo Org'));
    expect(screen.getByTestId('entitlement')).toHaveTextContent('true|true|undefined|enterprise');
  });

  it('still sends other emails to the API', async () => {
    postMock.mockRejectedValue({ response: { data: { error: 'Invalid credentials' } } });
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(auth).not.toBeNull());
    await expect(auth!.login('someone@else.com', 'x')).rejects.toBeDefined();
    expect(postMock).toHaveBeenCalledWith('/auth/login', { email: 'someone@else.com', password: 'x' });
  });

  it('uses the in-memory code for a company sign-up in progress and the API otherwise', async () => {
    await licenseRepository.startSignup({ token: SAMPLE_LICENSE_TOKENS.premium, companyName: 'Contoso', adminName: 'Priya', email: 'priya@contoso.com', country: 'India' });
    postMock.mockResolvedValue({ data: { orgExists: true, orgName: 'Acme' } });
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(auth).not.toBeNull());

    await expect(auth!.sendOtp('priya@contoso.com')).resolves.toEqual({ orgExists: false });
    await expect(auth!.verifyOtp('priya@contoso.com', '000000')).rejects.toBeDefined();
    await auth!.verifyOtp('priya@contoso.com', licenseRepository.peekVerificationCode('priya@contoso.com')!);
    expect(postMock).not.toHaveBeenCalled();

    await expect(auth!.sendOtp('jamie@acme.com')).resolves.toEqual({ orgExists: true, orgName: 'Acme' });
    expect(postMock).toHaveBeenCalledWith('/auth/send-otp', { email: 'jamie@acme.com' });
  });

  it('lets the registered administrator change their password', async () => {
    await registerCompany(SAMPLE_LICENSE_TOKENS.premium, 'priya@contoso.com', 'Str0ng!Passw0rd');
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(auth).not.toBeNull());
    await auth!.login('priya@contoso.com', 'Str0ng!Passw0rd');
    await waitFor(() => expect(screen.getByTestId('who')).not.toHaveTextContent('none'));

    await expect(auth!.changePassword('wrong', 'N3w!Passw0rd')).rejects.toBeDefined();
    await auth!.changePassword('Str0ng!Passw0rd', 'N3w!Passw0rd');
    expect(licenseRepository.authenticate('priya@contoso.com', 'N3w!Passw0rd')?.ok).toBe(true);
    expect(postMock).not.toHaveBeenCalled();
  });
});
