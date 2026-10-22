import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '../../../shared/theme/ThemeProvider';
import { UploadNotesDialog } from './UploadNotesDialog';

// "Check status after upload" is remembered for the session; every case starts from the default (on).
beforeEach(() => sessionStorage.clear());

const setup = (tracked: string[] = []) => {
  const onSubmit = vi.fn();
  render(<ThemeProvider><UploadNotesDialog trackedNumbers={tracked} busy={false} onClose={() => {}} onSubmit={onSubmit} /></ThemeProvider>);
  const user = userEvent.setup({ applyAccept: false });
  const input = screen.getByLabelText('Note numbers file (.csv or .txt)') as HTMLInputElement;
  const upload = (file: File) => user.upload(input, file);
  return { onSubmit, user, upload };
};
const file = (content: string, name: string, type = 'text/csv') => new File([content], name, { type });

describe('UploadNotesDialog file input', () => {
  it('explains that Excel files should be saved as CSV', () => {
    setup();
    expect(screen.getByText(/Excel files cannot be read here: in Excel use File, Save As, CSV/)).toBeInTheDocument();
    expect(screen.getByLabelText('Note numbers file (.csv or .txt)')).toHaveAttribute('accept', expect.stringContaining('.csv'));
  });

  it('puts the numbers from a CSV into the box, ignores the header and reports skipped entries', async () => {
    const { upload, user, onSubmit } = setup(['3515598']);
    await upload(file('Note number,Title\n3727078\n3515598, 12345\nabc 3763800\n', 'notes.csv'));
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Note numbers' })).toHaveValue('3727078\n3515598\n3763800'));
    expect(screen.getByRole('status', { hidden: false })).toHaveTextContent('Read 3 note numbers from notes.csv (header row ignored); 2 entries skipped because they are not 7-digit numbers.');
    expect(screen.getByText('2 new notes to add · 1 already tracked')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Upload' }));
    expect(onSubmit).toHaveBeenCalledWith(['3727078', '3763800', '3515598'], true);
  });

  it('adds file numbers after what was already typed, and accepts a .txt file', async () => {
    const { upload, user } = setup();
    await user.type(screen.getByRole('textbox', { name: 'Note numbers' }), '3800001');
    await upload(file('3800002\n3800003', 'list.txt', 'text/plain'));
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Note numbers' })).toHaveValue('3800001\n3800002\n3800003'));
    expect(screen.getByRole('status')).toHaveTextContent('Read 2 note numbers from list.txt.');
  });

  it('tells Excel users to save as CSV and leaves the box alone', async () => {
    const { upload } = setup();
    await upload(file('x', 'notes.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'));
    expect(await screen.findByRole('alert')).toHaveTextContent('notes.xlsx is a spreadsheet. Save it as CSV from Excel');
    expect(screen.getByRole('textbox', { name: 'Note numbers' })).toHaveValue('');
  });

  it('says so when a file has no usable numbers', async () => {
    const { upload } = setup();
    await upload(file('Note number\n123\nabc\n', 'bad.csv'));
    expect(await screen.findByRole('alert')).toHaveTextContent('No note numbers found in bad.csv; 2 entries skipped because they are not 7-digit numbers.');
    expect(screen.getByText('Nothing to upload yet.')).toBeInTheDocument();
  });

  it('rejects a file over 1 MB', async () => {
    const { upload } = setup();
    await upload(file('3727078'.padEnd(1024 * 1024 + 1, ' '), 'big.csv'));
    expect(await screen.findByRole('alert')).toHaveTextContent('big.csv is larger than 1 MB');
  });

  it('checks the status after upload by default, and passes the choice on when it is switched off', async () => {
    const { user, onSubmit } = setup();
    const box = screen.getByRole('checkbox', { name: 'Check status after upload' });
    expect(box).toBeChecked();
    await user.click(box);
    expect(screen.getByText(/added as Unknown with the SAP download pending until you run Check Status/)).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Note numbers' }), '3800001');
    await user.click(screen.getByRole('button', { name: 'Upload' }));
    expect(onSubmit).toHaveBeenCalledWith(['3800001'], false);
  });
});
