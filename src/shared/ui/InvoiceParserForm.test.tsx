import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InvoiceParserForm } from './InvoiceParserForm';
import type { DemoProvider } from '../lib/parseInvoice';

function Harness({ providers, parsing = false, problem = null, onSubmit = () => undefined, onFile = () => undefined }: {
  providers?: DemoProvider[]; parsing?: boolean; problem?: string | null; onSubmit?: () => void; onFile?: (file: File) => void;
}) {
  const [provider, setProvider] = useState<DemoProvider>(providers?.[0] ?? 'azure');
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  return (
    <InvoiceParserForm
      providers={providers} provider={provider} onProviderChange={setProvider} file={file} problem={problem} parsing={parsing}
      onFile={(picked) => { setFile({ name: picked.name, size: picked.size }); onFile(picked); }} onSubmit={onSubmit}
    />
  );
}

const pdf = (name: string) => new File(['%PDF-1.4'], name, { type: 'application/pdf' });

describe('InvoiceParserForm', () => {
  it('lists every provider chip with the hint for the chosen one', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const group = screen.getByRole('group', { name: 'Cloud provider' });
    expect(within(group).getAllByRole('radio').map((r) => r.closest('label')?.textContent)).toEqual(['Azure', 'AWS', 'SAP BTP', 'Google Cloud']);
    expect(screen.getByText('Billing, Invoices, Download PDF in the Azure portal.')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Google Cloud' }));
    expect(screen.getByText('Cloud Billing, Documents, Download PDF.')).toBeInTheDocument();
  });

  it('shows only the providers it is given', () => {
    render(<Harness providers={['aws', 'gcp']} />);
    expect(screen.getAllByRole('radio').map((r) => r.closest('label')?.textContent)).toEqual(['AWS', 'Google Cloud']);
    expect(screen.getByRole('radio', { name: 'AWS' })).toBeChecked();
  });

  it('keeps Parse disabled until a file is chosen, then submits once', async () => {
    const user = userEvent.setup({ applyAccept: false });
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    expect(screen.getByRole('button', { name: 'Parse invoice' })).toBeDisabled();
    expect(screen.getByText('PDF or XLSX, up to 10 MB.')).toBeInTheDocument();
    await user.upload(screen.getByLabelText('Invoice file (PDF or XLSX)'), pdf('azure-invoice.pdf'));
    expect(screen.getByText('azure-invoice.pdf')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Parse invoice' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('highlights the drop zone while a file is dragged over it and hands over a dropped file', () => {
    const onFile = vi.fn();
    render(<Harness onFile={onFile} />);
    const zone = screen.getByText('Drop your invoice here').closest('label') as HTMLElement;
    fireEvent.dragOver(zone);
    expect(zone).toHaveClass('is-dragging');
    fireEvent.dragLeave(zone);
    expect(zone).not.toHaveClass('is-dragging');
    fireEvent.drop(zone, { dataTransfer: { files: [pdf('aws.pdf')] } });
    expect(onFile).toHaveBeenCalledWith(expect.objectContaining({ name: 'aws.pdf' }));
  });

  it('announces a problem and marks the file field invalid', () => {
    render(<Harness problem="notes.docx is not a PDF or XLSX file." />);
    expect(screen.getByRole('alert')).toHaveTextContent('notes.docx is not a PDF or XLSX file.');
    expect(screen.getByLabelText('Invoice file (PDF or XLSX)')).toHaveAttribute('aria-invalid', 'true');
  });

  it('locks the form while parsing', () => {
    render(<Harness parsing />);
    expect(screen.getByRole('button', { name: 'Parsing…' })).toBeDisabled();
    expect(screen.getByRole('group', { name: 'Cloud provider' })).toBeDisabled();
    expect(screen.getByLabelText('Invoice file (PDF or XLSX)')).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Reading the invoice…');
  });
});
