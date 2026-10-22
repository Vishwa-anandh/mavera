import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { workspaceRepository } from '../../../data-access';
import { ConfirmProvider } from '../../../shared/ui/ConfirmProvider';
import { ThemeProvider } from '../../../shared/theme/ThemeProvider';
import { ConnectDialogHost, closeConnectDialog } from '../../workspace';
import { GcpAccountProvider } from '../model/GcpAccountContext';
import { GcpAccountManager } from './GcpAccountManager';

const authState = vi.hoisted(() => ({ canViewGcp: true }));
vi.mock('../../auth/model/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../auth/model/AuthContext')>();
  return {
    ...actual,
    useAuth: () => ({ user: { id: '1', email: 'a@b.com', role: 'member', canViewGcp: authState.canViewGcp }, cloudAccess: ['gcp'], invoiceOnly: false, accountLimits: {}, modules: { cloudCost: true, sapMonitoring: true } }),
  };
});

const renderAt = (url: string) => render(
  <ThemeProvider><MemoryRouter initialEntries={[url]}><ConfirmProvider><GcpAccountProvider><GcpAccountManager /><ConnectDialogHost /></GcpAccountProvider></ConfirmProvider></MemoryRouter></ThemeProvider>,
);

beforeEach(() => { workspaceRepository.setProfile('empty'); authState.canViewGcp = true; });
afterEach(() => { closeConnectDialog(); workspaceRepository.setProfile('populated'); });

describe('GCP Account Manager', () => {
  it('connects through the shared dialog (no inline form on the page)', async () => {
    const user = userEvent.setup();
    renderAt('/gcp/accounts');
    expect(screen.queryByLabelText('Service Account JSON Key')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Connect Project' }));
    expect(screen.getByRole('dialog', { name: 'Connect Google Cloud project' })).toBeInTheDocument();
    expect(screen.getByLabelText('Display Name')).toHaveFocus();
  });

  it('?open=connect opens the dialog', async () => {
    renderAt('/gcp/accounts?open=connect');
    expect(await screen.findByRole('dialog', { name: 'Connect Google Cloud project' })).toBeInTheDocument();
  });

  it('read-only users see the explanation and no Connect button', async () => {
    authState.canViewGcp = false;
    renderAt('/gcp/accounts');
    expect(screen.getByText('Read-only mode')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Connect Project' })).toBeNull();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
