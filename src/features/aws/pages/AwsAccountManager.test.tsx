import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { workspaceRepository } from '../../../data-access';
import { ConfirmProvider } from '../../../shared/ui/ConfirmProvider';
import { ThemeProvider } from '../../../shared/theme/ThemeProvider';
import { ConnectDialogHost, closeConnectDialog } from '../../workspace';
import { AwsAccountProvider } from '../model/AwsAccountContext';
import { AwsAccountManager } from './AwsAccountManager';

vi.mock('../../auth/model/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../auth/model/AuthContext')>();
  return {
    ...actual,
    useAuth: () => ({ user: { id: '1', email: 'a@b.com', role: 'admin', canViewAws: true }, cloudAccess: ['aws'], invoiceOnly: false, accountLimits: { aws: 3 }, modules: { cloudCost: true, sapMonitoring: true } }),
  };
});

const renderAt = (url: string) => render(
  <ThemeProvider><MemoryRouter initialEntries={[url]}><ConfirmProvider><AwsAccountProvider><AwsAccountManager /><ConnectDialogHost /></AwsAccountProvider></ConfirmProvider></MemoryRouter></ThemeProvider>,
);

beforeEach(() => workspaceRepository.setProfile('empty'));
afterEach(() => { closeConnectDialog(); workspaceRepository.setProfile('populated'); });

describe('AWS Account Manager', () => {
  it('Connect Account opens the shared dialog on the AWS credentials', async () => {
    const user = userEvent.setup();
    renderAt('/aws/accounts');
    await user.click(screen.getByRole('button', { name: 'Connect Account' }));
    expect(screen.getByRole('dialog', { name: 'Connect AWS account' })).toBeInTheDocument();
    expect(screen.getByLabelText('Access key ID')).toBeInTheDocument();
  });

  it('?open=connect opens the dialog', async () => {
    renderAt('/aws/accounts?open=connect');
    expect(await screen.findByRole('dialog', { name: 'Connect AWS account' })).toBeInTheDocument();
  });
});
