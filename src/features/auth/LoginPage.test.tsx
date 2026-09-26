import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LoginPage } from './LoginPage';
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

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  it('logs in and navigates to / on success', async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    useAuthMock.mockReturnValue(auth({ login }));
    const user = userEvent.setup();

    renderAt('/login');
    await user.type(screen.getByLabelText('Email'), 'person@maitsys.com');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(login).toHaveBeenCalledWith('person@maitsys.com', 'secret123');
    expect(navigateMock).toHaveBeenCalledWith('/');
  });

  it('shows an inline error message on invalid credentials', async () => {
    const login = vi.fn().mockRejectedValue({ response: { data: { message: 'Incorrect email or password.' } } });
    useAuthMock.mockReturnValue(auth({ login }));
    const user = userEvent.setup();

    renderAt('/login');
    await user.type(screen.getByLabelText('Email'), 'person@maitsys.com');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Incorrect email or password.')).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('switches to the unlock-account sub-flow when the login response says the account is locked', async () => {
    const login = vi.fn().mockRejectedValue({ response: { data: { locked: true } } });
    const unlockAccount = vi.fn().mockResolvedValue(undefined);
    useAuthMock.mockReturnValue(auth({ login, unlockAccount }));
    const user = userEvent.setup();

    renderAt('/login');
    await user.type(screen.getByLabelText('Email'), 'person@maitsys.com');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByText('Your account is locked. Enter the unlock code we sent you.'),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText('Unlock code'), 'ABC123');
    await user.click(screen.getByRole('button', { name: 'Unlock account' }));

    expect(unlockAccount).toHaveBeenCalledWith('ABC123');
    expect(await screen.findByText('Your account has been unlocked. You can now log in.')).toBeInTheDocument();
  });

  it('shows a session-expired notice when the query string says so', () => {
    useAuthMock.mockReturnValue(auth());
    renderAt('/login?error=session_expired');
    expect(screen.getByText('Your session expired. Please sign in again.')).toBeInTheDocument();
  });

  it('renders the full uncropped Mavera brand lockup (spec §3 — "sign-in/about pages" per the design doc)', () => {
    useAuthMock.mockReturnValue(auth());
    renderAt('/login');
    const logo = screen.getByRole('img', { name: 'Mavera' });
    expect(logo).toHaveAttribute('width', '240');
  });
});
