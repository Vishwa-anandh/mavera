import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LoginPage } from './LoginPage';
import type { AuthContextValue } from '../model/AuthContext';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../model/AuthContext';
import { SuperAdminAuthProvider, DEMO_USERNAME as SA_DEMO_USERNAME, DEMO_PASSWORD as SA_DEMO_PASSWORD } from '../../superAdmin';
import { ThemeProvider } from '../../../shared/theme/ThemeProvider';

const useAuthMock = vi.fn<() => AuthContextValue>();
const navigateMock = vi.fn();

vi.mock('../model/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../model/AuthContext')>();
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
    modules: { cloudCost: true, sapMonitoring: true },
    maxUsers: undefined,
    planType: 'enterprise',
    subscriptionStartsAt: undefined,
    subscriptionExpiresAt: undefined,
    subscriptionActive: true,
    subscriptionNotes: undefined,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    unlockAccount: vi.fn(),
    sendOtp: vi.fn(),
    verifyOtp: vi.fn(),
    changePassword: vi.fn(),
    ...overrides,
  };
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider>
        <SuperAdminAuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </SuperAdminAuthProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear();
    navigateMock.mockReset();
  });

  it('logs in and navigates to / on success', async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    useAuthMock.mockReturnValue(auth({ login }));
    const user = userEvent.setup();

    renderAt('/login');
    await user.type(screen.getByLabelText('Email'), 'person@maitsys.com');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(login).toHaveBeenCalledWith('person@maitsys.com', 'secret123');
    expect(navigateMock).toHaveBeenCalledWith('/');
  });

  it('shows an inline error message on invalid credentials', async () => {
    const login = vi.fn().mockRejectedValue({ response: { status: 401, data: { error: 'Invalid credentials' } } });
    useAuthMock.mockReturnValue(auth({ login }));
    const user = userEvent.setup();

    renderAt('/login');
    await user.type(screen.getByLabelText('Email'), 'person@maitsys.com');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    // Shows the backend's `error` text, not a `message` field.
    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('switches to the unlock-account sub-flow when the login response says the account is locked', async () => {
    const login = vi.fn().mockRejectedValue({
      response: { status: 403, data: { isLocked: true, error: 'Account locked' } },
    });
    const unlockAccount = vi.fn().mockResolvedValue(undefined);
    useAuthMock.mockReturnValue(auth({ login, unlockAccount }));
    const user = userEvent.setup();

    renderAt('/login');
    await user.type(screen.getByLabelText('Email'), 'person@maitsys.com');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByText('Your account is locked. Enter the unlock code we sent you.'),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText('Unlock code'), 'ABC123');
    await user.click(screen.getByRole('button', { name: 'Unlock account' }));

    expect(unlockAccount).toHaveBeenCalledWith('person@maitsys.com', 'ABC123');
    expect(await screen.findByText('Your account has been unlocked. You can now log in.')).toBeInTheDocument();
  });

  it('falls back to a generic message when the error response has no `error` text', async () => {
    const login = vi.fn().mockRejectedValue({ response: { status: 401, data: {} } });
    useAuthMock.mockReturnValue(auth({ login }));
    const user = userEvent.setup();

    renderAt('/login');
    await user.type(screen.getByLabelText('Email'), 'person@maitsys.com');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Incorrect email or password.')).toBeInTheDocument();
  });

  it('asks for the email first and only shows the password step once the email is valid', async () => {
    const login = vi.fn();
    useAuthMock.mockReturnValue(auth({ login }));
    const user = userEvent.setup();

    renderAt('/login');
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Enter a valid work email address.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('shows the confirmed email on the password step and lets the user change it', async () => {
    useAuthMock.mockReturnValue(auth());
    const user = userEvent.setup();

    renderAt('/login');
    await user.type(screen.getByLabelText('Email'), 'person@maitsys.com');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByText('Enter your password')).toBeInTheDocument();
    expect(screen.getByText('person@maitsys.com')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Change' }));
    expect(screen.getByLabelText('Email')).toHaveValue('person@maitsys.com');
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
  });

  it('fills the demo credentials and signs in with them in one click', async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    useAuthMock.mockReturnValue(auth({ login }));
    const user = userEvent.setup();

    renderAt('/login');
    expect(screen.getByText(DEMO_EMAIL)).toBeInTheDocument();
    expect(screen.getByText(DEMO_PASSWORD)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Use demo credentials' }));
    expect(screen.getByText('Enter your password')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toHaveValue(DEMO_PASSWORD);

    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(login).toHaveBeenCalledWith(DEMO_EMAIL, DEMO_PASSWORD);
    expect(navigateMock).toHaveBeenCalledWith('/');
  });

  it('routes the Super Admin credentials through the same form into the Super Admin dashboard', async () => {
    useAuthMock.mockReturnValue(auth());
    const user = userEvent.setup();

    renderAt('/login');
    expect(screen.getByText(SA_DEMO_USERNAME)).toBeInTheDocument();
    expect(screen.getByText(SA_DEMO_PASSWORD)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Use Super Admin credentials' }));
    expect(screen.getByText('Enter your password')).toBeInTheDocument();
    expect(screen.getByText(SA_DEMO_USERNAME)).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toHaveValue(SA_DEMO_PASSWORD);

    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/admin/dashboard'));
  });

  it('rejects the Super Admin username paired with the wrong password', async () => {
    useAuthMock.mockReturnValue(auth());
    const user = userEvent.setup();

    renderAt('/login');
    await user.type(screen.getByLabelText('Email'), SA_DEMO_USERNAME);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Invalid username or password.')).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalledWith('/admin/dashboard');
  });

  it('redirects an already-authenticated user straight to /', () => {
    useAuthMock.mockReturnValue(auth({ isAuthenticated: true, user: { id: '1', email: 'a@b.com', role: 'member' } }));
    renderAt('/login');
    expect(navigateMock).toHaveBeenCalledWith('/', { replace: true });
  });

  it('shows a session-expired notice when the query string says so', () => {
    useAuthMock.mockReturnValue(auth());
    renderAt('/login?error=session_expired');
    expect(screen.getByText('Your session expired. Please sign in again.')).toBeInTheDocument();
  });

  it('renders the full uncropped Mavera brand lockup inside the card (spec §3 — "sign-in/about pages" per the design doc)', () => {
    useAuthMock.mockReturnValue(auth());
    renderAt('/login');
    const logo = screen.getByRole('img', { name: 'Mavera' });
    // 300px sits inside the doc's 240–320px range for the current artwork.
    expect(logo).toHaveAttribute('width', '300');
  });
});
