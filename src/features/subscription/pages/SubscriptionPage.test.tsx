import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { subscriptionRepository } from '../../../data-access';
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

describe('SubscriptionPage available plans', () => {
  beforeEach(() => subscriptionRepository.reset());

  const plans = () => screen.getAllByRole('article');

  it('compares Free, Professional and Enterprise with feature checklists, "Pricing coming soon" and the current plan marked', () => {
    useAuthMock.mockReturnValue(auth({ planType: 'basic' }));
    render(<MemoryRouter><SubscriptionPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Available plans' })).toBeInTheDocument();
    expect(plans().map((p) => within(p).getByRole('heading').textContent)).toEqual(['Free', 'Professional', 'Enterprise']);
    for (const plan of plans()) expect(within(plan).getByText('Pricing coming soon')).toBeInTheDocument();
    const [free, pro, enterprise] = plans();
    expect(within(free).getByRole('list', { name: 'Free plan features' })).toHaveTextContent('Savings overview & MSP discounts');
    expect(within(free).getByText('Current')).toBeInTheDocument();
    expect(within(free).queryByRole('button', { name: /Choose plan/ })).not.toBeInTheDocument();
    expect(within(free).getByRole('button', { name: 'Free is your current plan' })).toBeDisabled();
    expect(within(pro).getByRole('list', { name: 'Professional plan features' })).toHaveTextContent('GCP & SAP BTP cost monitoring');
    expect(within(enterprise).getByRole('list', { name: 'Enterprise plan features' })).toHaveTextContent('SLA-backed priority support');
    expect(within(pro).getByRole('button', { name: 'Choose plan Professional' })).toBeInTheDocument();
    expect(within(enterprise).getByRole('button', { name: 'Choose plan Enterprise' })).toBeInTheDocument();
  });

  it('marks the plan the organisation is actually on', () => {
    useAuthMock.mockReturnValue(auth({ planType: 'premium' }));
    render(<MemoryRouter><SubscriptionPage /></MemoryRouter>);
    const [free, pro] = plans();
    expect(within(pro).getByText('Current')).toBeInTheDocument();
    expect(within(free).getByRole('button', { name: 'Choose plan Free' })).toBeInTheDocument();
  });

  it('records a plan request, toasts "Request sent to Maitsys", and changes neither the plan, modules nor seats', async () => {
    const user = userEvent.setup();
    const messages: string[] = [];
    const listener = (e: Event) => messages.push((e as CustomEvent<{ message: string }>).detail.message);
    window.addEventListener('ccm:toast', listener);
    useAuthMock.mockReturnValue(auth({ planType: 'basic', maxUsers: 10, user: { id: '2', email: 'member@acme.com', role: 'member' } }));
    render(<MemoryRouter><SubscriptionPage /></MemoryRouter>);

    await user.click(screen.getByRole('button', { name: 'Choose plan Professional' }));
    const dialog = screen.getByRole('dialog', { name: 'Request the Professional plan' });
    expect(dialog).toHaveTextContent('does not change your plan, modules or team size');
    await user.type(within(dialog).getByLabelText(/Anything Maitsys should know/), 'Need GCP from November');
    await user.click(within(dialog).getByRole('button', { name: 'Send request' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(messages).toContain('Request sent to Maitsys');
    expect(subscriptionRepository.listPlanRequests()).toMatchObject([{ planId: 'premium', requestedBy: 'member@acme.com', note: 'Need GCP from November' }]);

    // The page reflects the request, not a plan change.
    const [free, pro] = plans();
    expect(within(pro).getByText(/^Requested /)).toBeInTheDocument();
    expect(within(pro).getByRole('button', { name: 'Request sent' })).toBeDisabled();
    expect(within(free).getByText('Current')).toBeInTheDocument();
    expect(screen.getByText('Up to 10')).toBeInTheDocument();
    expect(screen.getByText('SAP Monitoring').closest('div')).toHaveTextContent('Locked');
    window.removeEventListener('ccm:toast', listener);
  });

  it('cancelling the dialog sends nothing', async () => {
    const user = userEvent.setup();
    useAuthMock.mockReturnValue(auth({ planType: 'basic' }));
    render(<MemoryRouter><SubscriptionPage /></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: 'Choose plan Enterprise' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(subscriptionRepository.listPlanRequests()).toEqual([]);
  });
});
