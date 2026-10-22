import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { resetSapAdminStore, sapAdminRepository } from '../../../data-access';
import { ConfirmProvider } from '../../../shared/ui/ConfirmProvider';
import { ThemeProvider } from '../../../shared/theme/ThemeProvider';
import { ConnectDialogHost, closeConnectDialog } from '../../workspace';
import { SystemConfigurationPage } from './SystemConfigurationPage';

vi.mock('../../auth/model/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../auth/model/AuthContext')>();
  return { ...actual, useAuth: () => ({ user: { id: '1', email: 'a@b.com', role: 'admin' }, cloudAccess: ['azure'], invoiceOnly: false, accountLimits: { azure: 3, aws: 3, btp: 3 }, modules: { cloudCost: true, sapMonitoring: true } }) };
});

const renderPage = () => render(<ThemeProvider><MemoryRouter><ConfirmProvider><SystemConfigurationPage /><ConnectDialogHost /></ConfirmProvider></MemoryRouter></ThemeProvider>);

beforeEach(() => resetSapAdminStore());
afterEach(closeConnectDialog);

describe('SystemConfigurationPage', () => {
  it('lists the destinations and searches by name or URL', async () => {
    const user = userEvent.setup();
    renderPage();
    expect(screen.getByText(/6 destinations · 1 active/)).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: /search destinations/i }), 'dev.maitsys');
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['MSQ']);
    await user.clear(screen.getByRole('searchbox', { name: /search destinations/i }));
    await user.type(screen.getByRole('searchbox', { name: /search destinations/i }), 'zzz');
    expect(screen.getByText(/No destinations match/)).toBeInTheDocument();
  });

  it('connects and disconnects', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Connect EMP_BTP1' }));
    expect(screen.getByText(/6 destinations · 2 active/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Disconnect Maitsys-Testing' }));
    expect(screen.getByText(/6 destinations · 1 active/)).toBeInTheDocument();
  });

  it('adds a destination through the shared connect dialog only when the form is valid, and connects it', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Add Destination' }));
    const dialog = screen.getByRole('dialog', { name: 'Connect SAP system' });
    await user.click(within(dialog).getByRole('button', { name: 'Connect' }));
    expect(within(dialog).getAllByRole('alert')).toHaveLength(3);
    await user.type(within(dialog).getByLabelText('Environment Name'), 'Sandbox');
    await user.type(within(dialog).getByLabelText('SID'), 'sbx');
    await user.type(within(dialog).getByLabelText('Gateway URL'), 'https://sbx.example.com');
    await user.click(within(dialog).getByRole('button', { name: 'Connect' }));
    expect(await within(dialog).findByText('Testing connection…', { selector: 'button' })).toBeInTheDocument();
    // The page stays where it is and shows the new destination, already connected.
    expect(await screen.findByRole('heading', { name: 'Sandbox' }, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Disconnect Sandbox' })).toBeInTheDocument();
    expect(sapAdminRepository.destinations.list().find((d) => d.name === 'Sandbox')?.systems).toEqual(['SBX']);
  });

  it('edits a destination in the same form, pre-filled', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Edit destination TEST EMP' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit TEST EMP' });
    const name = within(dialog).getByLabelText(/^Environment Name/);
    expect(name).toHaveValue('TEST EMP');
    expect(within(dialog).getByLabelText(/^SID/)).toHaveValue('EMP');
    await user.clear(name);
    await user.type(name, 'Renamed EMP');
    await user.click(within(dialog).getByRole('button', { name: 'Save Changes' }));
    expect(screen.getByRole('heading', { name: 'Renamed EMP' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'TEST EMP' })).not.toBeInTheDocument();
  });

  it('refuses a duplicate name when editing another destination', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Edit destination TEST EMP' }));
    const dialog = screen.getByRole('dialog');
    const name = within(dialog).getByLabelText(/^Environment Name/);
    await user.clear(name);
    await user.type(name, 'emp_btp1');
    await user.click(within(dialog).getByRole('button', { name: 'Save Changes' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent(/already exists/);
  });

  it('asks before removing and keeps the destination if cancelled', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Remove destination BTP Users' }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('heading', { name: 'BTP Users' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove destination BTP Users' }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Remove destination' }));
    expect(screen.queryByRole('heading', { name: 'BTP Users' })).not.toBeInTheDocument();
    expect(screen.getByText(/5 destinations/)).toBeInTheDocument();
  });

  it('keeps changes when the page is opened again', async () => {
    const user = userEvent.setup();
    const first = renderPage();
    await user.click(screen.getByRole('button', { name: 'Connect MSQ' }));
    first.unmount();
    renderPage();
    expect(screen.getByRole('button', { name: 'Disconnect MSQ' })).toBeInTheDocument();
  });

  it('shows an empty state with no destinations', () => {
    for (const d of sapAdminRepository.destinations.list()) sapAdminRepository.destinations.remove(d.id);
    renderPage();
    expect(screen.getByText('No destinations yet.')).toBeInTheDocument();
  });
});

describe('SystemConfigurationPage: opening the form on arrival (command palette)', () => {
  it('?open=connect opens the shared connect dialog on the SAP system credentials', () => {
    render(<ThemeProvider><MemoryRouter initialEntries={['/sap/configuration?open=connect']}><ConfirmProvider><SystemConfigurationPage /><ConnectDialogHost /></ConfirmProvider></MemoryRouter></ThemeProvider>);
    expect(screen.getByRole('dialog', { name: 'Connect SAP system' })).toBeInTheDocument();
    expect(screen.getByLabelText('Environment Name')).toHaveFocus();
  });

  it('opens no form when reached normally', () => {
    renderPage();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
