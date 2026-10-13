import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { BillingPage } from './BillingPage';
import { BillingProvider } from '../model/BillingContext';

function renderBillingPage() {
  return render(
    <MemoryRouter>
      <BillingProvider>
        <BillingPage />
      </BillingProvider>
    </MemoryRouter>,
  );
}

describe('BillingPage', () => {
  it('shows only this organization\'s own invoices, read-only — no invoice-creation console', () => {
    renderBillingPage();

    // Northwind Traders (SELF_CUSTOMER_ID) has invoices seeded in the mock data.
    expect(screen.getByText('Your Invoices')).toBeInTheDocument();
    expect(screen.queryByText('New Invoice')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Invoices' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Payment Terms' })).not.toBeInTheDocument();
    expect(screen.queryByText('Contoso Ltd')).not.toBeInTheDocument();
  });

  it('lets the org pay an unpaid invoice from Maitsys', async () => {
    const user = userEvent.setup();
    renderBillingPage();

    // INV-2026-0004 is seeded as unpaid ("Sent"); select it from the list.
    await user.click(screen.getByText('INV-2026-0004'));
    const detail = screen.getByRole('heading', { level: 2, name: 'INV-2026-0004' }).closest('section') as HTMLElement;
    const payButton = within(detail).getByRole('button', { name: /Pay Now/ });

    await user.click(payButton);

    expect(within(detail).getByText(/Paid via card/)).toBeInTheDocument();
    expect(within(detail).queryByRole('button', { name: /Pay Now/ })).not.toBeInTheDocument();
  });
});
