import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './AppShell';
import type { AuthContextValue } from '../context/AuthContext';

const useAuthMock = vi.fn<() => AuthContextValue>();

vi.mock('../context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../context/AuthContext')>();
  return { ...actual, useAuth: () => useAuthMock() };
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

  it('renders the brand, navigation, and routed content once authenticated', () => {
    useAuthMock.mockReturnValue(baseAuth({}));
    renderShell();
    expect(screen.getByText('MAVERA')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Home content')).toBeInTheDocument();
  });
});
