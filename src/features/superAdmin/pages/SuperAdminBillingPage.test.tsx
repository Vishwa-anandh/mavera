import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SuperAdminBillingPage } from './SuperAdminBillingPage';
import { BillingProvider } from '../../billing';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <BillingProvider>
        <SuperAdminBillingPage />
      </BillingProvider>
    </MemoryRouter>,
  );
}

describe('SuperAdminBillingPage', () => {
  it('shows every organization\'s invoices by default, with actions to create one or manage customers', async () => {
    const user = userEvent.setup();
    renderPage();

    // Cross-organization visibility — unlike the org-side BillingPage, every
    // seeded customer's invoices are visible here (Northwind has 2, so this
    // uses getAllByText rather than asserting a single match).
    expect(screen.getAllByText('Northwind Traders').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Contoso Ltd').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /New Invoice/ }));
    expect(navigateMock).toHaveBeenCalledWith('/admin/billing/generate');

    await user.click(screen.getByRole('button', { name: /Manage Customers/ }));
    expect(navigateMock).toHaveBeenCalledWith('/admin/billing/customers');
  });

  it('switches to the Payment Terms tab', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Payment Terms' }));
    expect(screen.getByText('Net 30')).toBeInTheDocument();
  });
});
