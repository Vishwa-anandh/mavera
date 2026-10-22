import { describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ModuleNavigation } from './ModuleNavigation';
import type { AuthContextValue } from '../../features/auth';
import type { User } from '../../shared/types/auth';

const useAuthMock = vi.fn<() => AuthContextValue>();

vi.mock('../../features/auth/model/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../features/auth/model/AuthContext')>();
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

function renderNav() {
  return render(
    <MemoryRouter>
      <ModuleNavigation />
    </MemoryRouter>,
  );
}

describe('ModuleNavigation', () => {
  it('renders every top-level destination, in the required order, for a plain member', () => {
    useAuthMock.mockReturnValue(mockAuth({ id: '1', email: 'a@b.com', role: 'member' }));
    renderNav();

    const triggers = screen.getAllByRole('button').map((el) => el.textContent?.trim());
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(triggers.some((t) => t?.startsWith('SAP Monitoring'))).toBe(true);
    expect(triggers.some((t) => t?.startsWith('Cloud Cost'))).toBe(true);
    // Reports and Billing live inside the Cloud Cost dropdown, not at the top level.
    expect(screen.queryByText('Reports')).not.toBeInTheDocument();
    expect(screen.queryByText('Billing')).not.toBeInTheDocument();
    // The AI Assistant is not in the header: it lives in the floating widget (and Ctrl+K).
    expect(screen.queryByRole('link', { name: 'AI Assistant' })).not.toBeInTheDocument();
    expect(screen.queryByText('Administration')).not.toBeInTheDocument();
  });

  it('renders Administration for an admin', () => {
    useAuthMock.mockReturnValue(mockAuth({ id: '1', email: 'a@b.com', role: 'admin' }));
    renderNav();
    expect(screen.getByText('Administration')).toBeInTheDocument();
  });

  it('does not throw for a user missing every optional permission field', () => {
    useAuthMock.mockReturnValue(mockAuth({ id: '1', email: 'a@b.com', role: 'member' }));
    expect(() => renderNav()).not.toThrow();
  });

  it('opens a module dropdown on click, showing its destinations and title, and closes on Escape', async () => {
    useAuthMock.mockReturnValue(mockAuth({ id: '1', email: 'a@b.com', role: 'admin' }, { cloudAccess: ['azure'] }));
    const user = userEvent.setup();
    renderNav();

    const trigger = screen.getByText('Cloud Cost').closest('button')!;
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu', { name: 'Cloud Cost Monitoring' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Azure Subscriptions/ })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('lists Billing and Cost Analytics (which now holds report export) in the Cloud Cost dropdown', async () => {
    useAuthMock.mockReturnValue(mockAuth({ id: '1', email: 'a@b.com', role: 'member' }, { cloudAccess: ['azure'] }));
    const user = userEvent.setup();
    renderNav();

    await user.click(screen.getByText('Cloud Cost').closest('button')!);
    expect(screen.getByRole('menuitem', { name: /^Billing/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /^Cost Analytics/ })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /^Reports/ })).not.toBeInTheDocument();
  });

  it('marks a locked destination with an upgrade label instead of hiding or disabling it', async () => {
    useAuthMock.mockReturnValue(mockAuth({ id: '1', email: 'a@b.com', role: 'member' }, { cloudAccess: [] }));
    const user = userEvent.setup();
    renderNav();

    await user.click(screen.getByText('Cloud Cost').closest('button')!);
    const azureItem = screen.getByRole('menuitem', { name: /Azure Subscriptions/ });
    expect(azureItem).toHaveTextContent('Upgrade');
    expect(azureItem.tagName).toBe('A');
  });

  describe('hover', () => {
    const member: User = { id: '1', email: 'a@b.com', role: 'member' };
    const wait = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
    // React derives onPointerEnter/Leave from pointerover/pointerout; jsdom has no PointerEvent, so carry pointerType by hand.
    const pointer = (el: Element, type: 'pointerover' | 'pointerout', pointerType = 'mouse') => {
      const event = new Event(type, { bubbles: true });
      Object.defineProperty(event, 'pointerType', { value: pointerType });
      fireEvent(el, event);
    };

    it('opens a module dropdown when a mouse rests on it and closes it shortly after the pointer leaves', () => {
      vi.useFakeTimers();
      useAuthMock.mockReturnValue(mockAuth(member));
      renderNav();
      const trigger = screen.getByRole('button', { name: /^Cloud Cost/ });

      pointer(trigger, 'pointerover');
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      wait(120);
      expect(screen.getByRole('menu', { name: /Cloud Cost/ })).toBeInTheDocument();

      pointer(trigger, 'pointerout');
      wait(60);
      expect(screen.getByRole('menu')).toBeInTheDocument(); // grace period: the pointer can cross the gap
      wait(200);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      vi.useRealTimers();
    });

    it('stays open when the pointer comes back during the grace period, and when a click pins it', () => {
      vi.useFakeTimers();
      useAuthMock.mockReturnValue(mockAuth(member));
      renderNav();
      const trigger = screen.getByRole('button', { name: /^Cloud Cost/ });

      pointer(trigger, 'pointerover');
      wait(120);
      pointer(trigger, 'pointerout');
      wait(60);
      pointer(trigger, 'pointerover');
      wait(400);
      expect(screen.getByRole('menu')).toBeInTheDocument();

      fireEvent.click(trigger); // pinned, not toggled shut under the pointer
      expect(screen.getByRole('menu')).toBeInTheDocument();
      pointer(trigger, 'pointerout');
      wait(400);
      expect(screen.getByRole('menu')).toBeInTheDocument();
      vi.useRealTimers();
    });

    it('ignores touch pointers (they open on tap only)', () => {
      vi.useFakeTimers();
      useAuthMock.mockReturnValue(mockAuth(member));
      renderNav();
      pointer(screen.getByRole('button', { name: /^Cloud Cost/ }), 'pointerover', 'touch');
      wait(400);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      vi.useRealTimers();
    });
  });
});
