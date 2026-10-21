import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { invoicesRepository, resetInvoicesStore } from '../../../data-access';
import { ThemeProvider } from '../../../shared/theme/ThemeProvider';
import { ConfirmProvider } from '../../../shared/ui/ConfirmProvider';
import type { AuthContextValue } from '../../auth';
import { InvoicesPage } from './InvoicesPage';

vi.mock('../../auth/model/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../auth/model/AuthContext')>();
  return { ...actual, useAuth: () => ({ user: { id: '1', email: 'a@b.com', role: 'admin' }, cloudAccess: ['azure', 'aws', 'btp', 'gcp'], invoiceOnly: false } as Partial<AuthContextValue>) };
});

// Recharts measures its container, which jsdom doesn't lay out; give it a fixed size.
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return { ...actual, ResponsiveContainer: ({ children }: { children: ReactNode }) => <div style={{ width: 300, height: 180 }}>{children}</div> };
});

function setup() {
  render(<MemoryRouter><ThemeProvider><ConfirmProvider><InvoicesPage /></ConfirmProvider></ThemeProvider></MemoryRouter>);
  return userEvent.setup();
}

const chip = (name: RegExp) => screen.getByRole('button', { name });

beforeEach(() => {
  resetInvoicesStore();
  sessionStorage.clear();
});

describe('InvoicesPage provider filter', () => {
  it('shows a chip per provider with its invoice count and filters the list', async () => {
    const user = setup();
    const group = screen.getByRole('group', { name: 'Invoice provider' });
    expect(within(group).getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([
      'All providers, 9 invoices', 'Azure, 3 invoices', 'AWS, 2 invoices', 'SAP BTP, 2 invoices', 'Google Cloud, 2 invoices',
    ]);
    expect(within(chip(/^Azure, 3/)).getByText('3')).toBeInTheDocument();
    await user.click(chip(/^SAP BTP, 2/));
    expect(chip(/^SAP BTP, 2/)).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 1–2 of 2 invoices');
  });
});

describe('InvoicesPage Maitsys CSP Savings', () => {
  it('shows the discount rate, the saving in money terms, a donut and spend bars for the selected invoice', async () => {
    const user = setup();
    await user.click(chip(/^Azure, 3/));
    await user.click(screen.getByRole('button', { name: /September 2026/ }));
    const block = screen.getByRole('region', { name: 'Maitsys CSP Savings' });
    expect(block).toHaveTextContent('7.0% Azure discount');
    expect(block).toHaveTextContent('$642.80');
    expect(block).toHaveTextContent('saved on $8,420.00 of charges');
    expect(within(block).getByRole('img', { name: 'CSP savings by service' })).toBeInTheDocument();
    const bars = within(block).getByRole('list', { name: 'Spend by service' });
    expect(within(bars).getAllByRole('listitem')).toHaveLength(5);
    expect(bars).toHaveTextContent('Virtual Machines');
    expect(bars).toHaveTextContent('$305.60 saved at 8.0%');
    await user.click(within(block).getByRole('button', { name: 'View data' }));
    expect(within(screen.getByRole('dialog', { name: 'CSP savings by service' })).getByRole('cell', { name: '$305.60' })).toBeInTheDocument();
  });

  it('breaks a SAP BTP invoice down by subaccount', async () => {
    const user = setup();
    await user.click(chip(/^SAP BTP, 2/));
    await user.click(screen.getByRole('button', { name: /September 2026/ }));
    const block = screen.getByRole('region', { name: 'Maitsys CSP Savings' });
    expect(block).toHaveTextContent('2.0% SAP BTP discount');
    expect(within(block).getByRole('list', { name: 'Spend by subaccount' })).toHaveTextContent('prod-eu10');
  });

  it('says the breakdown was not extracted when an invoice has no services', async () => {
    const user = setup();
    await user.click(chip(/^Azure, 3/));
    await user.click(screen.getByRole('button', { name: /July 2026/ }));
    expect(screen.getByText('Service breakdown not extracted')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Maitsys CSP Savings' })).toBeNull();
  });
});

describe('InvoicesPage delete', () => {
  async function openAwsSeptember(user: ReturnType<typeof userEvent.setup>) {
    await user.click(chip(/^AWS, 2/));
    await user.click(screen.getByRole('button', { name: /September 2026/ }));
  }

  it('asks first, and keeps the invoice when cancelled', async () => {
    const user = setup();
    await openAwsSeptember(user);
    await user.click(screen.getByRole('button', { name: 'Delete invoice' }));
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent('Delete invoice AWS-2026-09-77421?');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(invoicesRepository.list()).toHaveLength(9);
    expect(screen.getByRole('region', { name: 'Invoice AWS-2026-09-77421' })).toBeInTheDocument();
  });

  it('deletes the invoice once confirmed: it leaves the list, the counts and the store', async () => {
    const user = setup();
    await openAwsSeptember(user);
    await user.click(screen.getByRole('button', { name: 'Delete invoice' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete invoice' }));
    expect(invoicesRepository.list()).toHaveLength(8);
    expect(chip(/^AWS, 1/)).toBeInTheDocument();
    expect(chip(/^All providers, 8/)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Invoice AWS-2026-09-77421' })).toBeNull();
    expect(screen.getByText('Select an invoice to analyse')).toBeInTheDocument();
  });
});
