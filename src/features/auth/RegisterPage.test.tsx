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

describe('RegisterPage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  // AntD's click "Wave" ripple effect (@rc-component/util's useDelayState)
  // schedules real setTimeout-based state updates on every button/checkbox
  // click. This test drives many real clicks across 5 steps, and those
  // accumulated real-timer delays push past vitest's default 5000ms
  // per-test timeout even though nothing is actually hanging — bump it
  // locally rather than touching the shared vitest.config.ts. 15000ms was
  // enough in isolation but still flaked under full-suite parallel worker
  // contention, so this is bumped further to give consistent headroom.
  it('walks through all 5 steps and submits with the collected values', { timeout: 30000 }, async () => {
    const register = vi.fn().mockResolvedValue(undefined);
    useAuthMock.mockReturnValue(auth({ register }));
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('Organization name'), 'Acme Corp');
    await user.click(screen.getByRole('button', { name: 'Next' }));

    await user.type(screen.getByLabelText('Full name'), 'Jamie Rivera');
    await user.type(screen.getByLabelText('Email'), 'jamie@acme.com');
    await user.click(screen.getByRole('button', { name: 'Next' }));

    await user.type(screen.getByLabelText('Password'), 'Sup3r$ecret');
    await user.type(screen.getByLabelText('Confirm password'), 'Sup3r$ecret');
    await user.click(screen.getByRole('button', { name: 'Next' }));

    await user.click(screen.getByLabelText('Azure'));
    await user.click(screen.getByRole('button', { name: 'Next' }));

    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(register).toHaveBeenCalledWith({
      organizationName: 'Acme Corp',
      fullName: 'Jamie Rivera',
      email: 'jamie@acme.com',
      password: 'Sup3r$ecret',
      cloudAccess: ['azure'],
      invoiceOnly: false,
    });
    expect(navigateMock).toHaveBeenCalledWith('/login');
  });

  it('blocks advancing past step 1 when the organization name is empty', async () => {
    useAuthMock.mockReturnValue(auth());
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('Organization name is required.')).toBeInTheDocument();
  });

  // Same real-timer accumulation as above (fewer clicks, but still enough
  // to occasionally exceed the default 5000ms).
  it('rejects mismatched passwords before advancing to the cloud-provider step', { timeout: 15000 }, async () => {
    useAuthMock.mockReturnValue(auth());
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('Organization name'), 'Acme Corp');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.type(screen.getByLabelText('Full name'), 'Jamie Rivera');
    await user.type(screen.getByLabelText('Email'), 'jamie@acme.com');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.type(screen.getByLabelText('Password'), 'Sup3r$ecret');
    await user.type(screen.getByLabelText('Confirm password'), 'different');
    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
  });
});
