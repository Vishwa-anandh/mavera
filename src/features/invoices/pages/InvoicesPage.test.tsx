import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { invoicesRepository, resetInvoicesStore } from '../../../data-access';
import { ThemeProvider } from '../../../shared/theme/ThemeProvider';
import { ConfirmProvider } from '../../../shared/ui/ConfirmProvider';
import { ToastListener } from '../../../shared/ui/ToastListener';
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
  render(<MemoryRouter><ThemeProvider><ConfirmProvider><ToastListener /><InvoicesPage /></ConfirmProvider></ThemeProvider></MemoryRouter>);
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

  it('deletes from the open invoice at once, with no confirmation: it leaves the list, the counts and the store', async () => {
    const user = setup();
    await openAwsSeptember(user);
    await user.click(screen.getByRole('button', { name: 'Delete invoice' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(invoicesRepository.list()).toHaveLength(8);
    expect(chip(/^AWS, 1/)).toBeInTheDocument();
    expect(chip(/^All providers, 8/)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Invoice AWS-2026-09-77421' })).toBeNull();
    expect(screen.getByText('Select an invoice to analyse')).toBeInTheDocument();
    expect(await screen.findByText('Invoice AWS-2026-09-77421 deleted.')).toBeInTheDocument();
  });

  it('has a trash button on every row, so an invoice can be deleted without opening it', async () => {
    const user = setup();
    await user.click(chip(/^AWS, 2/));
    await user.click(screen.getByRole('button', { name: 'Delete invoice AWS-2026-09-77421' }));
    expect(invoicesRepository.list().map((i) => i.id)).not.toContain('inv-aws-09');
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 1–1 of 1 invoices');
  });

  it('Undo in the toast puts the invoice back where it was and opens it again if it was open', async () => {
    const user = setup();
    const before = invoicesRepository.list().map((i) => i.id);
    await openAwsSeptember(user);
    await user.click(screen.getByRole('button', { name: 'Delete invoice' }));
    expect(invoicesRepository.list()).toHaveLength(8);
    await user.click(await screen.findByRole('button', { name: 'Undo' }));
    expect(invoicesRepository.list().map((i) => i.id)).toEqual(before);
    expect(chip(/^All providers, 9/)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Invoice AWS-2026-09-77421' })).toBeInTheDocument();
  });
});

describe('InvoicesPage upload', () => {
  const pdf = (name: string) => new File(['%PDF-1.4'], name, { type: 'application/pdf' });
  const chooser = () => screen.getByLabelText('Invoice file (PDF, or XLSX for SAP BTP)') as HTMLInputElement;
  const uploadUser = () => userEvent.setup({ applyAccept: false });

  it('Upload Invoice goes straight to the file chooser, not a dialog', async () => {
    const user = setup();
    const click = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => undefined);
    await user.click(screen.getByRole('button', { name: 'Upload Invoice' }));
    expect(click).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).toBeNull();
    click.mockRestore();
  });

  it('a file whose name says the provider uploads without another click', async () => {
    const user = uploadUser();
    setup();
    await user.upload(chooser(), pdf('azure-october-invoice.pdf'));
    expect(await screen.findByText(/Parsing azure-october-invoice\.pdf/)).toBeInTheDocument();
    await waitFor(() => expect(invoicesRepository.list()).toHaveLength(10), { timeout: 5000 });
    expect(invoicesRepository.list()[0]).toMatchObject({ provider: 'azure', file_name: 'azure-october-invoice.pdf' });
    expect(await screen.findByText('azure-october-invoice.pdf uploaded and added to your invoices.')).toBeInTheDocument();
  }, 10000);

  it('still uploads a named file when React re-runs effects, as it does in development (StrictMode)', async () => {
    const user = uploadUser();
    render(<StrictMode><MemoryRouter><ThemeProvider><ConfirmProvider><ToastListener /><InvoicesPage /></ConfirmProvider></ThemeProvider></MemoryRouter></StrictMode>);
    await user.upload(chooser(), pdf('azure-strict.pdf'));
    await waitFor(() => expect(invoicesRepository.list()[0]).toMatchObject({ provider: 'azure', file_name: 'azure-strict.pdf' }), { timeout: 5000 });
    expect(invoicesRepository.list()).toHaveLength(10);
  }, 10000);

  it('a file whose name does not say the provider opens the dialog with the guess filled in, and one click uploads it', async () => {
    const user = uploadUser();
    setup();
    await user.upload(chooser(), pdf('october.pdf'));
    const dialog = await screen.findByRole('dialog', { name: 'Upload invoice' });
    expect(within(dialog).getByText('Selected: october.pdf')).toBeInTheDocument();
    expect(within(dialog).getByText(/could not tell the provider from the file name, so we chose Azure/)).toBeInTheDocument();
    expect(invoicesRepository.list()).toHaveLength(9);
    await user.click(within(dialog).getByRole('button', { name: 'Upload Invoice' }));
    await waitFor(() => expect(invoicesRepository.list()).toHaveLength(10), { timeout: 5000 });
  }, 10000);

  it('says why a file of the wrong type cannot be used and opens nothing', async () => {
    const user = uploadUser();
    setup();
    await user.upload(chooser(), new File(['x'], 'notes.docx'));
    expect(await screen.findByText(/notes\.docx: Invoices must be a PDF/)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('accepts a file dropped anywhere on the page, showing a drop hint while it is dragged over', async () => {
    setup();
    const dataTransfer = { types: ['Files'], files: [pdf('aws-invoice.pdf')] };
    fireEvent.dragEnter(document.body, { dataTransfer });
    expect(screen.getByText('Drop your invoice anywhere to upload it')).toBeInTheDocument();
    fireEvent.drop(document.body, { dataTransfer });
    expect(screen.queryByText('Drop your invoice anywhere to upload it')).toBeNull();
    expect(await screen.findByText(/Parsing aws-invoice\.pdf/)).toBeInTheDocument();
    await waitFor(() => expect(invoicesRepository.list()[0]).toMatchObject({ provider: 'aws' }), { timeout: 5000 });
  }, 10000);

  it('ignores drags that carry no files, such as selected text', () => {
    setup();
    fireEvent.dragEnter(document.body, { dataTransfer: { types: ['text/plain'], files: [] } });
    expect(screen.queryByText('Drop your invoice anywhere to upload it')).toBeNull();
  });

  it('Escape while an invoice is parsing cancels it: nothing is added', async () => {
    const user = uploadUser();
    setup();
    await user.upload(chooser(), pdf('gcp-invoice.pdf'));
    await screen.findByText(/Parsing gcp-invoice\.pdf/);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 2500));
    expect(invoicesRepository.list()).toHaveLength(9);
  }, 10000);
});

describe('InvoicesPage: opening the upload dialog on arrival (command palette)', () => {
  afterEach(() => { Object.defineProperty(navigator, 'userActivation', { value: undefined, configurable: true }); });

  it('?open=upload with a fresh key press goes straight to the file chooser', () => {
    Object.defineProperty(navigator, 'userActivation', { value: { isActive: true, hasBeenActive: true }, configurable: true });
    const click = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => undefined);
    render(<MemoryRouter initialEntries={['/invoices?open=upload']}><ThemeProvider><ConfirmProvider><InvoicesPage /></ConfirmProvider></ThemeProvider></MemoryRouter>);
    expect(click).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).toBeNull();
    click.mockRestore();
  });

  it('?open=upload opens the Upload invoice dialog', () => {
    render(<MemoryRouter initialEntries={['/invoices?open=upload']}><ThemeProvider><ConfirmProvider><InvoicesPage /></ConfirmProvider></ThemeProvider></MemoryRouter>);
    expect(screen.getByRole('dialog', { name: 'Upload invoice' })).toBeInTheDocument();
  });
});
