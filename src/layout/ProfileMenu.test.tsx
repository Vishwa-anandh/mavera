import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ProfileMenu } from './ProfileMenu';
import type { AuthContextValue } from '../context/AuthContext';

const useAuthMock = vi.fn<() => AuthContextValue>();
const useMaveraThemeMock = vi.fn();
const useConfirmMock = vi.fn();
const navigateMock = vi.fn();

vi.mock('../context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../context/AuthContext')>();
  return { ...actual, useAuth: () => useAuthMock() };
});

vi.mock('../theme/ThemeProvider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../theme/ThemeProvider')>();
  return { ...actual, useMaveraTheme: () => useMaveraThemeMock() };
});

vi.mock('../components/ConfirmProvider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../components/ConfirmProvider')>();
  return { ...actual, useConfirm: () => useConfirmMock() };
});

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

function auth(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: { id: '1', email: 'person@maitsys.com', role: 'member' },
    loading: false,
    isAuthenticated: true,
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

describe('ProfileMenu', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    useMaveraThemeMock.mockReturnValue({
      mode: 'light',
      density: 'comfortable',
      toggleMode: vi.fn(),
      setDensity: vi.fn(),
      setMode: vi.fn(),
    });
  });

  it('shows the user email and toggles appearance when clicked', async () => {
    const toggleMode = vi.fn();
    useAuthMock.mockReturnValue(auth());
    useMaveraThemeMock.mockReturnValue({
      mode: 'light',
      density: 'comfortable',
      toggleMode,
      setDensity: vi.fn(),
      setMode: vi.fn(),
    });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ProfileMenu />
      </MemoryRouter>,
    );
    await user.click(screen.getByLabelText('Profile menu'));

    expect(screen.getByText('person@maitsys.com')).toBeInTheDocument();
    await user.click(screen.getByText('Switch to dark appearance'));
    expect(toggleMode).toHaveBeenCalledTimes(1);
  });

  it('logs out and navigates to /login only when the confirm dialog is accepted', async () => {
    const logout = vi.fn();
    useAuthMock.mockReturnValue(auth({ logout }));
    useConfirmMock.mockReturnValue(vi.fn().mockResolvedValue(true));
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ProfileMenu />
      </MemoryRouter>,
    );
    await user.click(screen.getByLabelText('Profile menu'));
    await user.click(screen.getByText('Log out'));

    expect(logout).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith('/login');
  });

  it('does not log out when the confirm dialog is cancelled', async () => {
    const logout = vi.fn();
    useAuthMock.mockReturnValue(auth({ logout }));
    useConfirmMock.mockReturnValue(vi.fn().mockResolvedValue(false));
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ProfileMenu />
      </MemoryRouter>,
    );
    await user.click(screen.getByLabelText('Profile menu'));
    await user.click(screen.getByText('Log out'));

    expect(logout).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
