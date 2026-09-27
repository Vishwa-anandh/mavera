import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ModuleNavigation } from './ModuleNavigation';
import type { AuthContextValue } from '../context/AuthContext';
import type { User } from '../types/auth';

const useAuthMock = vi.fn<() => AuthContextValue>();

vi.mock('../context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../context/AuthContext')>();
  return { ...actual, useAuth: () => useAuthMock() };
});

// @rc-component/overflow (used internally by AntD's Menu in horizontal mode,
// which ModuleNavigation renders) measures item widths on mount/unmount and
// batches those state updates through a real MessageChannel postMessage that
// resolves on a later tick, entirely outside React's own scheduler and
// therefore outside the synchronous act() scope @testing-library/react's
// render() wraps around the commit. This logs a "not wrapped in act(...)"
// warning even though no application code triggers it and no assertion here
// depends on it — a documented, benign interaction between
// @rc-component/overflow and jsdom test environments, not a bug in
// ModuleNavigation. Scoped to only this file's tests (rather than shared
// src/test/setup.ts) so a genuine act violation in any other test file's
// component is never silently swallowed.
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

function mockAuth(user: User, overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user,
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

describe('ModuleNavigation', () => {
  it('renders every visible top-level group for a plain member', () => {
    useAuthMock.mockReturnValue(mockAuth({ id: '1', email: 'a@b.com', role: 'member' }));
    render(
      <MemoryRouter>
        <ModuleNavigation />
      </MemoryRouter>,
    );
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Cloud Costs')).toBeInTheDocument();
    expect(screen.getByText('Optimisation')).toBeInTheDocument();
    // Operations holds only Invoices, which the reference Sidebar shows only
    // to invoice-only or hybrid orgs — so a plain cloud org doesn't get it.
    expect(screen.queryByText('Operations')).not.toBeInTheDocument();
    expect(screen.getByText('Governance')).toBeInTheDocument();
    expect(screen.getByText('Account')).toBeInTheDocument();
    expect(screen.queryByText('Administration')).not.toBeInTheDocument();
  });

  it('renders Administration for an admin', () => {
    useAuthMock.mockReturnValue(mockAuth({ id: '1', email: 'a@b.com', role: 'admin' }));
    render(
      <MemoryRouter>
        <ModuleNavigation />
      </MemoryRouter>,
    );
    expect(screen.getByText('Administration')).toBeInTheDocument();
  });

  it('does not throw for a user missing every optional permission field', () => {
    useAuthMock.mockReturnValue(mockAuth({ id: '1', email: 'a@b.com', role: 'member' }));
    expect(() =>
      render(
        <MemoryRouter>
          <ModuleNavigation />
        </MemoryRouter>,
      ),
    ).not.toThrow();
  });
});
