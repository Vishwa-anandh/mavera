import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { workspaceRepository } from '../../../data-access';
import { ConfirmProvider } from '../../../shared/ui/ConfirmProvider';
import { ThemeProvider } from '../../../shared/theme/ThemeProvider';
import { ConnectDialogHost, closeConnectDialog } from '../../workspace';
import { BtpAccountProvider } from '../model/BtpAccountContext';
import { BtpAccountManager } from './BtpAccountManager';

const authState = vi.hoisted(() => ({ limit: 3 }));
vi.mock('../../auth/model/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../auth/model/AuthContext')>();
  return {
    ...actual,
    useAuth: () => ({ user: { id: '1', email: 'a@b.com', role: 'admin', canViewBtp: true }, cloudAccess: ['btp'], invoiceOnly: false, accountLimits: { btp: authState.limit }, modules: { cloudCost: true, sapMonitoring: true } }),
  };
});

const renderAt = (url: string) => render(
  <ThemeProvider><MemoryRouter initialEntries={[url]}><ConfirmProvider><BtpAccountProvider><BtpAccountManager /><ConnectDialogHost /></BtpAccountProvider></ConfirmProvider></MemoryRouter></ThemeProvider>,
);

beforeEach(() => { workspaceRepository.setProfile('empty'); authState.limit = 3; });
afterEach(() => { closeConnectDialog(); workspaceRepository.setProfile('populated'); });

describe('BTP Account Manager', () => {
  it('connects through the shared dialog (no inline form on the page)', async () => {
    const user = userEvent.setup();
    renderAt('/btp/accounts');
    expect(screen.queryByLabelText('Client ID')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Connect Account' }));
    expect(screen.getByRole('dialog', { name: 'Connect SAP BTP account' })).toBeInTheDocument();
    expect(screen.getByLabelText('Account Name')).toHaveFocus();
  });

  it('?open=connect opens the dialog', async () => {
    renderAt('/btp/accounts?open=connect');
    expect(await screen.findByRole('dialog', { name: 'Connect SAP BTP account' })).toBeInTheDocument();
  });

  it('at the plan limit the page says so and the dialog explains it too', async () => {
    authState.limit = 1;
    workspaceRepository.addConnectedAccount('btp', { name: 'First', targetUrl: 'https://x', hasCis: false });
    renderAt('/btp/accounts?open=connect');
    expect(screen.getByText(/Account limit reached — your plan allows up to 1 BTP account/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Connect Account' })).toBeNull();
    expect(await screen.findByRole('dialog', { name: 'Connect SAP BTP account' })).toHaveTextContent(/Account limit reached/);
  });
});
