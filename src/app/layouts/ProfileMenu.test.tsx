import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ProfileMenu } from './ProfileMenu';
import type { AuthContextValue } from '../../features/auth';
import { workspaceRepository } from '../../data-access';
import { START_PAGE_TOUR_EVENT } from '../../shared/lib/assistantEvents';

const useAuthMock = vi.fn<() => AuthContextValue>();
const useMaveraThemeMock = vi.fn();
const useConfirmMock = vi.fn();
const navigateMock = vi.fn();

vi.mock('../../features/auth/model/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../features/auth/model/AuthContext')>();
  return { ...actual, useAuth: () => useAuthMock() };
});

vi.mock('../../shared/theme/ThemeProvider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../shared/theme/ThemeProvider')>();
  return { ...actual, useMaveraTheme: () => useMaveraThemeMock() };
});

vi.mock('../../shared/ui/ConfirmProvider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../shared/ui/ConfirmProvider')>();
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

describe('ProfileMenu', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    useMaveraThemeMock.mockReturnValue({
      mode: 'light',
      toggleMode: vi.fn(),
      setMode: vi.fn(),
    });
  });

  it('shows the user email and toggles appearance when clicked', async () => {
    const toggleMode = vi.fn();
    useAuthMock.mockReturnValue(auth());
    useMaveraThemeMock.mockReturnValue({
      mode: 'light',
      toggleMode,
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
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Dark appearance' }));
    expect(toggleMode).toHaveBeenCalledTimes(1);
  });

  it('links to the Setup guide for an owner or administrator', async () => {
    useAuthMock.mockReturnValue(auth());
    const user = userEvent.setup();
    render(<MemoryRouter><ProfileMenu /></MemoryRouter>);
    await user.click(screen.getByLabelText('Profile menu'));
    expect(screen.getByRole('menuitem', { name: /Setup guide/ })).toHaveAttribute('href', '/setup');
  });

  it('shows the organization name beside the user in the header and in the menu', async () => {
    useAuthMock.mockReturnValue(auth({ user: { id: '1', email: 'person@maitsys.com', name: 'Priya Shah', orgName: 'Acme Industrial Group', role: 'member' } }));
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ProfileMenu />
      </MemoryRouter>,
    );
    const trigger = screen.getByRole('button', { name: 'Profile menu' });
    expect(trigger).toHaveAccessibleDescription('Priya Shah Acme Industrial Group');
    await user.click(trigger);
    expect(screen.getByRole('menu', { name: 'Profile' })).toHaveTextContent('Acme Industrial Group');
  });

  it('shows only the user when the session has no organization name', () => {
    useAuthMock.mockReturnValue(auth());
    render(
      <MemoryRouter>
        <ProfileMenu />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: 'Profile menu' })).toHaveAccessibleDescription('person');
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

  it('offers "Request a plan", a link that opens the plan request on the Subscription page, and closes the menu', async () => {
    useAuthMock.mockReturnValue(auth());
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ProfileMenu />
      </MemoryRouter>,
    );
    await user.click(screen.getByLabelText('Profile menu'));
    const link = screen.getByRole('menuitem', { name: /Request a plan/ });
    expect(link).toHaveAttribute('href', '/subscription?open=request-plan');
    expect(screen.getByRole('menuitem', { name: 'Subscription' })).toHaveAttribute('href', '/subscription');
    await user.click(link);
    expect(screen.queryByRole('menu', { name: 'Profile' })).toBeNull();
  });

  it('offers "Getting started" with its progress to a new organisation, and brings a hidden checklist back on the dashboard', async () => {
    workspaceRepository.setProfile('empty');
    workspaceRepository.dismissOnboarding();
    useAuthMock.mockReturnValue(auth());
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ProfileMenu />
      </MemoryRouter>,
    );
    await user.click(screen.getByLabelText('Profile menu'));
    const item = screen.getByRole('menuitem', { name: /Getting started/ });
    expect(item).toHaveTextContent('0 of 6 done');
    await user.click(item);

    expect(workspaceRepository.onboarding().dismissed).toBe(false);
    expect(navigateMock).toHaveBeenCalledWith('/');
    expect(screen.queryByRole('menu', { name: 'Profile' })).toBeNull();
    workspaceRepository.setProfile('populated');
  });

  it('has no "Getting started" for an organisation that is already set up', async () => {
    workspaceRepository.setProfile('populated');
    useAuthMock.mockReturnValue(auth());
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ProfileMenu />
      </MemoryRouter>,
    );
    await user.click(screen.getByLabelText('Profile menu'));
    expect(screen.queryByRole('menuitem', { name: /Getting started/ })).toBeNull();
  });

  it('offers a tour of the page being viewed when that page has one, and starts it', async () => {
    useAuthMock.mockReturnValue(auth());
    const started = vi.fn();
    window.addEventListener(START_PAGE_TOUR_EVENT, started);
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={['/budgets']}><ProfileMenu /></MemoryRouter>);
    await user.click(screen.getByLabelText('Profile menu'));
    await user.click(screen.getByRole('menuitem', { name: /Tour of this page/ }));
    expect(started).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
    window.removeEventListener(START_PAGE_TOUR_EVENT, started);
  });

  it('leaves the tour item out on a page without a tour', async () => {
    useAuthMock.mockReturnValue(auth());
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={['/no-such-page']}><ProfileMenu /></MemoryRouter>);
    await user.click(screen.getByLabelText('Profile menu'));
    expect(screen.queryByRole('menuitem', { name: /Tour of this page/ })).toBeNull();
  });
});
