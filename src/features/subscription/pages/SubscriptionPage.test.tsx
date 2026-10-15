import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SubscriptionPage } from './SubscriptionPage';
import type { AuthContextValue } from '../../auth';

const useAuthMock = vi.fn<() => AuthContextValue>();

vi.mock('../../auth/model/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../auth/model/AuthContext')>();
  return { ...actual, useAuth: () => useAuthMock() };
});

function auth(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: { id: '1', email: 'owner@acme.com', role: 'owner' },
    loading: false,
    isAuthenticated: true,
    invoiceOnly: false,
    cloudAccess: ['azure'],
    features: { budgets: true, smartAlerts: true, syncLogs: true, recommendations: true, cloudManagement: true, invoices: true },
    accountLimits: { azure: 3, aws: 3, btp: 3 },
    modules: { cloudCost: true, sapMonitoring: false },
    maxUsers: 25,
    planType: 'premium',
    subscriptionStartsAt: '2026-01-01',
    subscriptionExpiresAt: '2027-01-01',
    subscriptionActive: true,
    subscriptionNotes: 'Extended per renewal agreement',
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

describe('SubscriptionPage (organization view)', () => {
  it('is read-only even for an org owner: no controls to change modules or cloud access', () => {
    useAuthMock.mockReturnValue(auth());
    render(<MemoryRouter><SubscriptionPage /></MemoryRouter>);

    expect(screen.getByText('Managed by Maitsys')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Update Cloud Access/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { pressed: true })).not.toBeInTheDocument();
  });

  it("shows which modules are subscribed and Maitsys's note", () => {
    useAuthMock.mockReturnValue(auth());
    render(<MemoryRouter><SubscriptionPage /></MemoryRouter>);

    expect(screen.getByText('Note from Maitsys')).toBeInTheDocument();
    expect(screen.getByText('Extended per renewal agreement')).toBeInTheDocument();
    expect(screen.getByText('SAP Monitoring').closest('div')).toHaveTextContent('Locked');
  });
});
