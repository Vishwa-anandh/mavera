import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './AppShell';
import type { AuthContextValue } from '../../features/auth';

const useAuthMock = vi.fn<() => AuthContextValue>();

vi.mock('../../features/auth/model/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../features/auth/model/AuthContext')>();
  return { ...actual, useAuth: () => useAuthMock() };
});

vi.mock('./ProfileMenu', () => ({
  ProfileMenu: () => <div>Profile menu stub</div>,
}));

function baseAuth(overrides: Partial<AuthContextValue>): AuthContextValue {
  return {
    user: { id: '1', email: 'a@b.com', role: 'member' },
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
    modules: { cloudCost: true, idocMonitoring: true, sapMonitoring: true },
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

function renderShell(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route element={<AppShell />}>
          <Route path="/" element={<div>Home content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('AppShell', () => {
  it('shows a loading indicator while auth is resolving', () => {
    useAuthMock.mockReturnValue(baseAuth({ loading: true, isAuthenticated: false }));
    renderShell();
    expect(screen.getByLabelText('Loading application')).toBeInTheDocument();
  });

  it('redirects to /login when not authenticated', () => {
    useAuthMock.mockReturnValue(baseAuth({ loading: false, isAuthenticated: false, user: null }));
    renderShell();
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('renders the brand, navigation, profile menu and routed content once authenticated, with no page footer', () => {
    useAuthMock.mockReturnValue(baseAuth({}));
    renderShell();
    expect(screen.getByRole('img', { name: 'Mavera' })).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Home content')).toBeInTheDocument();
    expect(screen.getByText('Profile menu stub')).toBeInTheDocument();
    // The in-app page footer was removed at the product owner's request; attribution lives in
    // the profile menu and on the sign-in page.
    expect(screen.queryByText('Powered by Maitsys')).not.toBeInTheDocument();
  });
});
