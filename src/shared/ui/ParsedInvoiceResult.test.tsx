import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ParsedInvoiceResult } from './ParsedInvoiceResult';
import { formatInvoiceMoney, simulateInvoiceParse } from '../lib/parseInvoice';

const invoice = simulateInvoiceParse({ provider: 'azure', fileName: 'azure-invoice.pdf', sizeBytes: 182_400 });

describe('ParsedInvoiceResult', () => {
  it('shows the headline figures, the line items and spend by service', () => {
    render(<ParsedInvoiceResult invoice={invoice} onReset={() => undefined} />);
    expect(screen.getByRole('heading', { name: `Azure invoice ${invoice.invoiceNumber}` })).toBeInTheDocument();
    const facts = screen.getByLabelText('Invoice summary');
    expect(facts).toHaveTextContent(formatInvoiceMoney(invoice.total, invoice.currency));
    expect(facts).toHaveTextContent(formatInvoiceMoney(invoice.tax, invoice.currency));
    expect(screen.getByRole('list', { name: 'Spend by service, largest first' })).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText('Subtotal')).toBeInTheDocument();
  });

  it('labels the reset button, calls it and renders extra content under the breakdown', async () => {
    const onReset = vi.fn();
    render(<ParsedInvoiceResult invoice={invoice} onReset={onReset} resetLabel="Upload another invoice" compact><p>Next steps</p></ParsedInvoiceResult>);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Upload another invoice' }));
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Next steps')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Azure invoice/ })).toHaveClass('mv-idemo-result--compact');
  });
});
