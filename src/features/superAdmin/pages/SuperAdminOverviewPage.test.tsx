import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SuperAdminOverviewPage } from './SuperAdminOverviewPage';
import { BillingProvider } from '../../billing';
import { SuperAdminAuthProvider } from '../model/SuperAdminAuthContext';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <SuperAdminAuthProvider>
        <BillingProvider>
          <SuperAdminOverviewPage />
        </BillingProvider>
      </SuperAdminAuthProvider>
    </MemoryRouter>,
  );
}

describe('SuperAdminOverviewPage', () => {
  it('shows cross-cutting KPIs and recent invoices, with links into Organizations and Billing', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getAllByText('Organizations').length).toBeGreaterThan(0);
    expect(screen.getByText('Outstanding')).toBeInTheDocument();
    expect(screen.getByText('Collected')).toBeInTheDocument();
    expect(screen.getByText('Recent Invoices')).toBeInTheDocument();

    const viewAllButtons = screen.getAllByRole('button', { name: 'View all' });
    await user.click(viewAllButtons[0]);
    expect(navigateMock).toHaveBeenCalledWith('/admin/billing');

    await user.click(viewAllButtons[1]);
    expect(navigateMock).toHaveBeenCalledWith('/admin/organizations');

    await user.click(screen.getByRole('button', { name: /New Invoice/ }));
    expect(navigateMock).toHaveBeenCalledWith('/admin/billing/generate');
  });

  it('lists organizations expiring within 30 days', () => {
    renderPage();
    // Initech Solutions expires 2026-09-20, before the fixed "today" of
    // 2026-09-27 used across the Super Admin mock data — already expired,
    // not "expiring soon" — while Globex (2026-10-12) and Northwind
    // (2026-10-05) both fall inside the 30-day window.
    expect(screen.getByText('Globex Manufacturing')).toBeInTheDocument();
    expect(screen.getByText('Northwind Logistics')).toBeInTheDocument();
  });
});
