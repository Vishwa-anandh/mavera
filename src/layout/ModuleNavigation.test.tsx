import { describe, it, expect, vi } from 'vitest';
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
    expect(screen.getByText('Operations')).toBeInTheDocument();
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
