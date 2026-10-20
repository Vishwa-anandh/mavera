import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { resetSapAdminStore, sapAdminRepository, setSapAdminLatency } from '../../../data-access';
import { ConfirmProvider } from '../../../shared/ui/ConfirmProvider';
import { ThemeProvider } from '../../../shared/theme/ThemeProvider';
import { SecurityNotesPage } from './SecurityNotesPage';

vi.mock('../../auth', () => ({ useAuth: () => ({ user: { id: '1', email: 'ana@maitsys.com', name: 'Ana', role: 'admin' } }) }));

const renderPage = () => render(<ThemeProvider><MemoryRouter><ConfirmProvider><SecurityNotesPage /></ConfirmProvider></MemoryRouter></ThemeProvider>);
const kpi = (label: string) => screen.getByText(label, { selector: '.mv-kpi-label' }).closest('.mv-kpi') as HTMLElement;

beforeEach(() => {
  resetSapAdminStore();
  setSapAdminLatency(0);
  sessionStorage.clear();
});

describe('SecurityNotesPage', () => {
  it('shows the counters, the SAP Download column and a page of notes', () => {
    renderPage();
    expect(within(kpi('Total Notes')).getByText('14')).toBeInTheDocument();
    expect(within(kpi('Unknown')).getByText('1')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'SAP Download' })).toBeInTheDocument();
    expect(screen.getAllByText('Already Downloaded').length).toBeGreaterThan(0);
    expect(screen.getByText('Download failed')).toBeInTheDocument();
    expect(screen.getByText(/Showing/)).toHaveTextContent('1–10 of 14');
  });

  it('filters by SAP download status and by search', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /SAP download/i }));
    await user.click(screen.getByRole('option', { name: 'Not downloaded' }));
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(1);
    expect(within(rows[0]).getByText('3790112')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    await user.type(screen.getByRole('textbox', { name: /search by note number/i }), 'tomcat');
    expect(screen.getAllByRole('row').slice(1)).toHaveLength(1);
  });

  it('uploads note numbers after validating them; they appear as Unknown with the download pending', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Upload' }));
    const dialog = screen.getByRole('dialog', { name: 'Upload security notes' });
    const submit = within(dialog).getByRole('button', { name: 'Upload' });
    expect(submit).toBeDisabled();
    await user.type(within(dialog).getByRole('textbox', { name: 'Note numbers' }), '3800001, 12ab');
    expect(within(dialog).getByRole('alert')).toHaveTextContent('12ab');
    expect(submit).toBeDisabled();
    await user.clear(within(dialog).getByRole('textbox', { name: 'Note numbers' }));
    await user.type(within(dialog).getByRole('textbox', { name: 'Note numbers' }), '3800001 3800002');
    expect(within(dialog).getByText(/2 new notes to add/)).toBeInTheDocument();
    await user.click(submit);
    expect(await screen.findByText('3800001')).toBeInTheDocument();
    expect(within(kpi('Total Notes')).getByText('16')).toBeInTheDocument();
    expect(within(kpi('Unknown')).getByText('3')).toBeInTheDocument();
    expect(screen.getAllByText('Pending').length).toBe(2);
  });

  it('Check Status resolves the Unknown notes and recomputes the counters', async () => {
    const user = userEvent.setup();
    await sapAdminRepository.securityNotes.upload(['3800001', '3800002'], 'Ana');
    renderPage();
    expect(within(kpi('Unknown')).getByText('3')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Check Status' }));
    const unknownAfter = sapAdminRepository.securityNotes.list().filter((n) => n.status === 'Unknown').length;
    await screen.findByText(String(unknownAfter), { selector: '.mv-kpi-value' }, { timeout: 3000 }).catch(() => undefined);
    expect(within(kpi('Unknown')).getByText(String(unknownAfter))).toBeInTheDocument();
    expect(unknownAfter).toBeLessThan(3);
  });

  it('asks before deleting a note, then removes it and updates the counters', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Delete note 3727078' }));
    const confirmation = await screen.findByRole('alertdialog');
    await user.click(within(confirmation).getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText('3727078')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete note 3727078' }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete note' }));
    await screen.findByText('13', { selector: '.mv-kpi-value' });
    expect(screen.queryByText('3727078')).not.toBeInTheDocument();
  });

  it('rechecks a note from SAP and shows what happened in History', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Recheck status from SAP for note 3754659' }));
    await user.click(screen.getByRole('button', { name: 'History' }));
    const drawer = await screen.findByRole('dialog', { name: 'Notes history' });
    const items = Array.from(within(drawer).getByRole('list', { name: 'Security notes history' }).children);
    expect(items[0]).toHaveTextContent('Recheck');
    expect(items[0]).toHaveTextContent('By Ana');
    expect(items.length).toBe(5);
  });

  it('keeps uploads when the page is left and opened again', async () => {
    const user = userEvent.setup();
    const first = renderPage();
    await user.click(screen.getByRole('button', { name: 'Upload' }));
    await user.type(screen.getByRole('textbox', { name: 'Note numbers' }), '3800009');
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Upload' }));
    await screen.findByText('3800009');
    first.unmount();
    renderPage();
    expect(screen.getByText('3800009')).toBeInTheDocument();
  });

  it('shows an empty state when every note has been deleted', async () => {
    for (const n of sapAdminRepository.securityNotes.list()) await sapAdminRepository.securityNotes.remove(n.noteNumber, 'Ana');
    renderPage();
    expect(screen.getByText('No security notes are tracked yet.')).toBeInTheDocument();
  });
});
