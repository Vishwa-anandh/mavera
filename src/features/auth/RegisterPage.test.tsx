import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { RegisterPage } from './RegisterPage';
import type { AuthContextValue } from '../../context/AuthContext';

const useAuthMock = vi.fn<() => AuthContextValue>();
const navigateMock = vi.fn();

vi.mock('../../context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../context/AuthContext')>();
  return { ...actual, useAuth: () => useAuthMock() };
});

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

function auth(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: null,
    loading: false,
    isAuthenticated: false,
    invoiceOnly: false,
    cloudAccess: [],
    features: {
      budgets: true,
      smartAlerts: true,
      syncLogs: true,
      recommendations: true,
      cloudManagement: true,
      invoices: true,
    },
    accountLimits: { azure: 3, aws: 3, btp: 3 },
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    unlockAccount: vi.fn(),
    sendOtp: vi.fn(),
    verifyOtp: vi.fn(),
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  );
}

type TestUser = ReturnType<typeof userEvent.setup>;

async function throughOtp(user: TestUser, email = 'jamie@acme.com') {
  await user.type(screen.getByLabelText('Work email'), email);
  await user.click(screen.getByRole('button', { name: 'Get verification code' }));
  await user.type(await screen.findByLabelText('Verification code'), '123456');
  await user.click(screen.getByRole('button', { name: 'Verify code' }));
  await screen.findByRole('button', { name: /^(Next|Finish registration)$/ });
}

async function fillNewOrgDetails(user: TestUser, inviteToken: string | null = 'INV-42') {
  await user.type(screen.getByLabelText('Full name'), 'Jamie Rivera');
  if (inviteToken) await user.type(screen.getByLabelText('Invitation token'), inviteToken);
  await user.type(screen.getByLabelText('Company name'), 'Acme Corp');
  await user.type(screen.getByLabelText('Password'), 'Sup3r$ecret');
  await user.type(screen.getByLabelText('Confirm password'), 'Sup3r$ecret');
  await user.click(screen.getByRole('button', { name: 'Next' }));
}

// The flow mirrors the reference app's pages/RegisterPage.jsx: email ->
// send-otp (orgExists?) -> verify-otp -> details (+ invite token for a new
// org) -> cloud selection (new org only) -> register.
//
// AntD's click "Wave" ripple effect schedules real setTimeout-based state
// updates on every button/checkbox click; these multi-step flows accumulate
// enough of them to exceed vitest's default 5000ms under parallel workers,
// so each flow test raises its own timeout.
describe('RegisterPage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  it(
    'new org: send OTP -> verify OTP -> details + invite token -> cloud selection -> register',
    { timeout: 30000 },
    async () => {
      const sendOtp = vi.fn().mockResolvedValue({ orgExists: false });
      const verifyOtp = vi.fn().mockResolvedValue(undefined);
      const register = vi.fn().mockResolvedValue(undefined);
      useAuthMock.mockReturnValue(auth({ sendOtp, verifyOtp, register }));
      const user = userEvent.setup({ delay: null });
      renderPage();

      await throughOtp(user);
      expect(sendOtp).toHaveBeenCalledWith('jamie@acme.com');
      expect(verifyOtp).toHaveBeenCalledWith('jamie@acme.com', '123456');

      await fillNewOrgDetails(user);

      // Nothing selected yet: the create button is disabled.
      expect(screen.getByRole('button', { name: 'Select at least one option' })).toBeDisabled();
      await user.click(screen.getByLabelText('Azure'));
      await user.click(screen.getByLabelText('AWS'));
      await user.click(screen.getByRole('button', { name: 'Create account' }));

      expect(register).toHaveBeenCalledWith({
        email: 'jamie@acme.com',
        password: 'Sup3r$ecret',
        fullName: 'Jamie Rivera',
        orgName: 'Acme Corp',
        role: 'admin',
        otp: '123456',
        inviteToken: 'INV-42',
        cloudPreference: 'azure,aws',
        invoiceOnly: false,
      });
      expect(await screen.findByText('Signup successful')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Proceed to sign in' }));
      expect(navigateMock).toHaveBeenCalledWith('/login');
    },
  );

  it(
    'existing org: joins as a member straight from the details step, with no invite token or cloud step',
    { timeout: 30000 },
    async () => {
      const sendOtp = vi.fn().mockResolvedValue({ orgExists: true, orgName: 'Acme Corp' });
      const verifyOtp = vi.fn().mockResolvedValue(undefined);
      const register = vi.fn().mockResolvedValue(undefined);
      useAuthMock.mockReturnValue(auth({ sendOtp, verifyOtp, register }));
      const user = userEvent.setup({ delay: null });
      renderPage();

      await throughOtp(user);
      expect(screen.getByText('You are joining Acme Corp')).toBeInTheDocument();
      expect(screen.queryByLabelText('Invitation token')).not.toBeInTheDocument();

      await user.type(screen.getByLabelText('Full name'), 'Sam Lee');
      await user.type(screen.getByLabelText('Password'), 'Sup3r$ecret');
      await user.type(screen.getByLabelText('Confirm password'), 'Sup3r$ecret');
      await user.click(screen.getByRole('button', { name: 'Finish registration' }));

      expect(register).toHaveBeenCalledWith({
        email: 'jamie@acme.com',
        password: 'Sup3r$ecret',
        fullName: 'Sam Lee',
        orgName: 'Acme Corp',
        role: 'member',
        otp: '123456',
        inviteToken: '',
        cloudPreference: '',
        invoiceOnly: false,
      });
      expect(await screen.findByText('Signup successful')).toBeInTheDocument();
    },
  );

  it('requires a valid email before sending the OTP', async () => {
    const sendOtp = vi.fn();
    useAuthMock.mockReturnValue(auth({ sendOtp }));
    const user = userEvent.setup({ delay: null });
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Get verification code' }));
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
    expect(sendOtp).not.toHaveBeenCalled();
  });

  it('shows the backend error and stays on the OTP step when verification fails', { timeout: 30000 }, async () => {
    const sendOtp = vi.fn().mockResolvedValue({ orgExists: false });
    const verifyOtp = vi
      .fn()
      .mockRejectedValue({ response: { status: 400, data: { error: 'Invalid or expired OTP' } } });
    useAuthMock.mockReturnValue(auth({ sendOtp, verifyOtp }));
    const user = userEvent.setup({ delay: null });
    renderPage();

    await user.type(screen.getByLabelText('Work email'), 'jamie@acme.com');
    await user.click(screen.getByRole('button', { name: 'Get verification code' }));
    await user.type(await screen.findByLabelText('Verification code'), '000000');
    await user.click(screen.getByRole('button', { name: 'Verify code' }));

    expect(await screen.findByText('Invalid or expired OTP')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Verify code' })).toBeVisible();
  });

  it('requires an invitation token for a new org before advancing', { timeout: 30000 }, async () => {
    useAuthMock.mockReturnValue(
      auth({
        sendOtp: vi.fn().mockResolvedValue({ orgExists: false }),
        verifyOtp: vi.fn().mockResolvedValue(undefined),
      }),
    );
    const user = userEvent.setup({ delay: null });
    renderPage();

    await throughOtp(user);
    await fillNewOrgDetails(user, null);

    expect(
      await screen.findByText('Invitation token is required to register a new organization.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeVisible();
  });

  it('rejects mismatched passwords on the details step', { timeout: 30000 }, async () => {
    const register = vi.fn();
    useAuthMock.mockReturnValue(
      auth({
        sendOtp: vi.fn().mockResolvedValue({ orgExists: true, orgName: 'Acme' }),
        verifyOtp: vi.fn().mockResolvedValue(undefined),
        register,
      }),
    );
    const user = userEvent.setup({ delay: null });
    renderPage();

    await throughOtp(user);
    await user.type(screen.getByLabelText('Full name'), 'Sam Lee');
    await user.type(screen.getByLabelText('Password'), 'Sup3r$ecret');
    await user.type(screen.getByLabelText('Confirm password'), 'different');
    await user.click(screen.getByRole('button', { name: 'Finish registration' }));

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it('routes an invalid-invitation-token registration error back to the token field', { timeout: 30000 }, async () => {
    const register = vi
      .fn()
      .mockRejectedValue({ response: { status: 400, data: { error: 'Invalid or already used invitation token' } } });
    useAuthMock.mockReturnValue(
      auth({
        sendOtp: vi.fn().mockResolvedValue({ orgExists: false }),
        verifyOtp: vi.fn().mockResolvedValue(undefined),
        register,
      }),
    );
    const user = userEvent.setup({ delay: null });
    renderPage();

    await throughOtp(user);
    await fillNewOrgDetails(user, 'USED-TOKEN');
    await user.click(screen.getByLabelText('Invoice upload (PDF / CSV)'));
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(register).toHaveBeenCalledWith(expect.objectContaining({ cloudPreference: '', invoiceOnly: true }));
    expect(
      await screen.findByText(
        'This invitation token is invalid or has already been used. Please request a new one from your Maitsys administrator.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Invitation token')).toBeVisible();
  });
});
