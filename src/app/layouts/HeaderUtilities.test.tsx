import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './AppShell';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';
import type { AuthContextValue } from '../../features/auth';

const useAuthMock = vi.fn<() => AuthContextValue>();

vi.mock('../../features/auth/model/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../features/auth/model/AuthContext')>();
  return { ...actual, useAuth: () => useAuthMock() };
});

vi.mock('./ProfileMenu', () => ({ ProfileMenu: () => <div>Profile menu stub</div> }));

function auth(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: { id: '1', email: 'a@b.com', role: 'admin' },
    loading: false,
    isAuthenticated: true,
    invoiceOnly: false,
    cloudAccess: ['azure'],
    features: { budgets: true, smartAlerts: true, syncLogs: true, recommendations: true, cloudManagement: true, invoices: true },
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

function Where() {
  return <div data-testid="where">{useLocation().pathname}</div>;
}

function renderShell(path = '/') {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="*" element={<Where />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('header notifications', () => {
  it('shows the unread count with an accessible label, and hides it once everything is read', async () => {
    useAuthMock.mockReturnValue(auth());
    const user = userEvent.setup();
    renderShell();

    const bell = screen.getByRole('button', { name: 'Notifications, 2 unread' });
    expect(within(bell).getByText('2')).toBeInTheDocument();

    await user.click(bell);
    const drawer = screen.getByRole('dialog', { name: 'Notifications' });
    await user.click(within(drawer).getByRole('button', { name: 'Mark all as read' }));
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Notifications' })).not.toHaveTextContent(/\d/);
  });

  it("never shows notifications from a module the org isn't subscribed to", async () => {
    useAuthMock.mockReturnValue(auth({ modules: { cloudCost: true, sapMonitoring: false } }));
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole('button', { name: 'Notifications, 1 unread' }));
    expect(screen.queryByText(/HANA-PRD/)).not.toBeInTheDocument();
  });

  it('opens a notification destination, marks it read and closes the drawer', async () => {
    useAuthMock.mockReturnValue(auth());
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole('button', { name: /^Notifications/ }));
    await user.click(screen.getByRole('button', { name: /^Unread: Azure cost threshold exceeded/ }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('/budgets');
  });
});

describe('page search', () => {
  it('opens with Ctrl+K and goes to the highlighted page on Enter', async () => {
    useAuthMock.mockReturnValue(auth());
    const user = userEvent.setup();
    renderShell();

    await user.keyboard('{Control>}k{/Control}');
    const dialog = screen.getByRole('dialog', { name: 'Search or run a command' });
    await user.type(within(dialog).getByRole('combobox'), 'budgets');
    expect(within(dialog).getByRole('option', { name: /Budgets & Alerts/ })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Enter}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('/budgets');
  });

  it('explains when nothing matches', async () => {
    useAuthMock.mockReturnValue(auth());
    const user = userEvent.setup();
    renderShell();

    await user.keyboard('{Control>}k{/Control}');
    await user.type(screen.getByRole('combobox'), 'zzzz');
    expect(screen.getByText('Nothing matches “zzzz”.')).toBeInTheDocument();
  });
});

describe('module menus', () => {
  it('shows section headings and highlights the module for a page beneath one of its destinations', async () => {
    useAuthMock.mockReturnValue(auth());
    const user = userEvent.setup();
    renderShell('/azure/sub-123');

    const cloud = screen.getByRole('button', { name: /^Cloud Cost/ });
    expect(cloud).toHaveClass('is-active');
    await user.click(cloud);
    const menu = screen.getByRole('menu', { name: 'Cloud Cost Monitoring' });
    expect(within(menu).getByRole('group', { name: 'Cloud providers' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Azure Subscriptions' })).toHaveAttribute('aria-current', 'page');
  });

  it('closes the menu when a destination is chosen', async () => {
    useAuthMock.mockReturnValue(auth());
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole('button', { name: /^Cloud Cost/ }));
    await user.click(screen.getByRole('menuitem', { name: 'Budgets & Alerts' }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('/budgets');
  });
});
