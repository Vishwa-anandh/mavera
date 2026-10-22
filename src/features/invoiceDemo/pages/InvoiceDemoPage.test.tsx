import { describe, it, expect, afterEach, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { InvoiceDemoPage } from './InvoiceDemoPage';
import { PARSE_DELAY_MS, simulateInvoiceParse } from '../../../shared/lib/parseInvoice';

const renderPage = () => render(<MemoryRouter><InvoiceDemoPage /></MemoryRouter>);
const pdf = (name = 'azure-sep.pdf', size = 3000) => new File(['x'.repeat(size)], name, { type: 'application/pdf' });
const fileInput = () => screen.getByLabelText('Invoice file (PDF or XLSX)') as HTMLInputElement;

afterEach(() => { vi.useRealTimers(); });

describe('InvoiceDemoPage', () => {
  it('shows the headline, the four providers and a Parse button that waits for a file', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Parse your cloud invoice in seconds' })).toBeInTheDocument();
    const providers = screen.getByRole('group', { name: 'Cloud provider' });
    expect(within(providers).getAllByRole('radio').map((r) => (r as HTMLInputElement).labels?.[0].textContent)).toEqual(['Azure', 'AWS', 'SAP BTP', 'Google Cloud']);
    expect(within(providers).getByRole('radio', { name: 'Azure' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Parse invoice' })).toBeDisabled();
    expect(screen.getByText(/Drop your invoice here/)).toBeInTheDocument();
    expect(screen.getByText(/never read or uploaded/)).toBeInTheDocument();
    expect(screen.getByAltText('Maitsys')).toBeInTheDocument();
  });

  it('links to company registration and sign in', () => {
    renderPage();
    expect(screen.getAllByRole('link', { name: 'Sign in' })[0]).toHaveAttribute('href', '/login');
    expect(screen.getAllByRole('link', { name: 'Register your company' })[0]).toHaveAttribute('href', '/company-signup');
  });

  it('rejects a file that is not a PDF or XLSX and keeps Parse disabled', async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderPage();
    await user.upload(fileInput(), new File(['a,b'], 'bill.csv', { type: 'text/csv' }));
    expect(screen.getByRole('alert')).toHaveTextContent('bill.csv is not a PDF or XLSX file.');
    expect(screen.getByRole('button', { name: 'Parse invoice' })).toBeDisabled();
    expect(fileInput()).toHaveAttribute('aria-invalid', 'true');
  });

  it('rejects an oversized file', async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderPage();
    const big = pdf('huge.pdf', 10);
    Object.defineProperty(big, 'size', { value: 11 * 1024 * 1024 });
    await user.upload(fileInput(), big);
    expect(screen.getByRole('alert')).toHaveTextContent('huge.pdf is larger than 10 MB.');
  });

  it('accepts a file, simulates the parse after a delay, and shows the same result for the same file', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();
    await user.click(screen.getByRole('radio', { name: 'AWS' }));
    await user.upload(fileInput(), pdf('aws-sep.pdf', 4200));
    expect(screen.getByText('aws-sep.pdf')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Parse invoice' }));
    expect(screen.getByRole('button', { name: 'Parsing…' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Reading the invoice…');
    expect(screen.queryByText('Sample parse, prototype')).not.toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(PARSE_DELAY_MS + 50); });
    const expected = simulateInvoiceParse({ provider: 'aws', fileName: 'aws-sep.pdf', sizeBytes: 4200 });
    expect(screen.getByRole('heading', { level: 2, name: `AWS invoice ${expected.invoiceNumber}` })).toHaveFocus();
    expect(screen.getByText('Sample parse, prototype')).toBeInTheDocument();

    const summary = screen.getByLabelText('Invoice summary');
    expect(summary).toHaveTextContent(expected.invoiceNumber);
    expect(summary).toHaveTextContent(expected.billingPeriod);
    expect(summary).toHaveTextContent(/Tax \(18%\)\$/);
    expect(summary).toHaveTextContent(new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(expected.total));

    const items = screen.getByRole('table');
    expect(within(items).getAllByRole('row')).toHaveLength(1 + expected.lineItems.length + 3);
    const bars = screen.getByRole('list', { name: 'Spend by service, largest first' });
    expect(within(bars).getAllByRole('listitem')).toHaveLength(expected.spendByService.length);
    expect(within(bars).getAllByRole('listitem')[0]).toHaveTextContent(expected.spendByService[0].service);

  });

  it('offers to register or sign in from the result, and resets with "Try another invoice"', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();
    await user.upload(fileInput(), pdf());
    await user.click(screen.getByRole('button', { name: 'Parse invoice' }));
    act(() => { vi.advanceTimersByTime(PARSE_DELAY_MS + 50); });

    const next = screen.getByRole('complementary', { name: 'Next steps' });
    expect(within(next).getByRole('link', { name: 'Register your company' })).toHaveAttribute('href', '/company-signup');
    expect(within(next).getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');

    await user.click(screen.getByRole('button', { name: 'Try another invoice' }));
    expect(screen.getByRole('button', { name: 'Parse invoice' })).toBeDisabled();
    expect(screen.queryByText('Sample parse, prototype')).not.toBeInTheDocument();
    expect(screen.queryByText('azure-sep.pdf')).not.toBeInTheDocument();
  });

  it('accepts a dropped XLSX file', async () => {
    renderPage();
    const drop = fileInput().closest('label') as HTMLElement;
    const file = new File(['x'], 'btp-costs.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    fireEvent.dragOver(drop);
    expect(drop).toHaveClass('is-dragging');
    fireEvent.drop(drop, { dataTransfer: { files: [file] } });
    expect(await screen.findByText('btp-costs.xlsx')).toBeInTheDocument();
    expect(drop).not.toHaveClass('is-dragging');
    expect(screen.getByRole('button', { name: 'Parse invoice' })).toBeEnabled();
  });
});
