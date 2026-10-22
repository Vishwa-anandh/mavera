import { beforeEach, describe, it, expect } from 'vitest';
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
  // The billing state is persisted to localStorage; every test starts from the seeded invoices.
  beforeEach(() => localStorage.clear());

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

    // INV-2026-0004 is seeded as unpaid ("Sent"), so it is already open: no selecting needed before paying.
    const detail = screen.getByRole('heading', { level: 2, name: 'INV-2026-0004' }).closest('section') as HTMLElement;
    const payButton = within(detail).getByRole('button', { name: /Pay Now/ });

    await user.click(payButton);

    expect(within(detail).getByText(/Paid via card/)).toBeInTheDocument();
    expect(within(detail).queryByRole('button', { name: /Pay Now/ })).not.toBeInTheDocument();
  });

  it('opens the first unpaid invoice when the page loads, so it can be paid straight away', async () => {
    const user = userEvent.setup();
    renderBillingPage();

    // INV-2026-0001 is newer but already paid; the unpaid INV-2026-0004 is the one shown.
    const detail = screen.getByRole('heading', { level: 2, name: 'INV-2026-0004' }).closest('section') as HTMLElement;
    expect(screen.getByRole('button', { name: /^INV-2026-0004/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^INV-2026-0001/ })).toHaveAttribute('aria-pressed', 'false');
    await user.click(within(detail).getByRole('button', { name: /Pay Now/ }));
    expect(within(detail).getByText(/Paid via card/)).toBeInTheDocument();
    // The paid invoice stays open instead of the page jumping to another one.
    expect(screen.getByRole('heading', { level: 2, name: 'INV-2026-0004' })).toBeInTheDocument();
  });

  it('falls back to the newest invoice when everything is paid', async () => {
    const user = userEvent.setup();
    renderBillingPage();
    await user.click(screen.getByRole('button', { name: 'Pay Now: INV-2026-0004' }));
    expect(screen.queryByRole('button', { name: /^Pay Now/ })).not.toBeInTheDocument();
  });

  it('shows Pay Now on the list row of every unpaid invoice only, and paying from the list marks it paid', async () => {
    const user = userEvent.setup();
    renderBillingPage();

    const list = within(screen.getByRole('list', { name: 'Your invoices' }));
    const unpaid = list.getByRole('button', { name: 'Pay Now: INV-2026-0004' });
    expect(list.queryByRole('button', { name: 'Pay Now: INV-2026-0001' })).not.toBeInTheDocument();
    // Select the paid invoice first, to show that paying from the list opens the invoice it paid.
    await user.click(list.getByRole('button', { name: /^INV-2026-0001/ }));
    expect(screen.getByRole('heading', { level: 2, name: 'INV-2026-0001' })).toBeInTheDocument();
    await user.click(unpaid);

    const detail = screen.getByRole('heading', { level: 2, name: 'INV-2026-0004' }).closest('section') as HTMLElement;
    expect(within(detail).getByText(/Paid via card/)).toBeInTheDocument();
    expect(list.queryByRole('button', { name: /^Pay Now/ })).not.toBeInTheDocument();
  });
});
