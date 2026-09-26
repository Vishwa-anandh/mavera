import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './AppShell';
import type { AuthContextValue } from '../context/AuthContext';

const useAuthMock = vi.fn<() => AuthContextValue>();

vi.mock('../context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../context/AuthContext')>();
  return { ...actual, useAuth: () => useAuthMock() };
});

vi.mock('./ProfileMenu', () => ({
  ProfileMenu: () => <div>Profile menu stub</div>,
}));

// @rc-component/overflow (used internally by AntD's Menu in horizontal mode,
// which AppShell renders via ModuleNavigation) measures item widths on
// mount/unmount and batches those state updates through a real MessageChannel
// postMessage that resolves on a later tick, entirely outside React's own
// scheduler and therefore outside the synchronous act() scope
// @testing-library/react's render() wraps around the commit. This logs a
// "not wrapped in act(...)" warning even though no application code triggers
// it and no assertion here depends on it — a documented, benign interaction
// between @rc-component/overflow and jsdom test environments, not a bug in
// AppShell/ModuleNavigation. Scoped to only this file's tests (rather than
// shared src/test/setup.ts) so a genuine act violation in any other test
// file's component is never silently swallowed.
const RC_OVERFLOW_ACT_WARNING = 'An update to %s inside a test was not wrapped in act';
let originalConsoleError: typeof console.error;

beforeEach(() => {
  originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes(RC_OVERFLOW_ACT_WARNING)) {
      return;
    }
    originalConsoleError(...args);
  };
});

afterEach(() => {
  console.error = originalConsoleError;
});

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

  it('renders the brand, navigation, profile menu, footer, and routed content once authenticated', () => {
    useAuthMock.mockReturnValue(baseAuth({}));
    renderShell();
    expect(screen.getByText('MAVERA')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Home content')).toBeInTheDocument();
    expect(screen.getByText('Profile menu stub')).toBeInTheDocument();
    expect(screen.getByText('Powered by Maitsys')).toBeInTheDocument();
  });
});
