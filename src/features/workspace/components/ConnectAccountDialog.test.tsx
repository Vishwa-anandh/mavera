import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { resetSapAdminStore, sapAdminRepository, workspaceRepository } from '../../../data-access';
import { subscribeToToasts, type ToastDetail } from '../../../shared/lib/toastEvents';
import { ThemeProvider } from '../../../shared/theme/ThemeProvider';
import type { AuthContextValue } from '../../auth';
import { closeConnectDialog, openConnectDialog } from '../model/connectDialogStore';
import type { ConnectProvider } from '../model/connectProviders';
import { ConnectAccountDialog } from './ConnectAccountDialog';
import { ConnectDialogHost } from './ConnectDialogHost';

const authState = vi.hoisted(() => ({
  role: 'admin' as 'admin' | 'member',
  modules: { cloudCost: true, sapMonitoring: true },
  limits: { azure: 3, aws: 3, btp: 3 },
  readOnly: false,
}));

vi.mock('../../auth/model/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../auth/model/AuthContext')>();
  return {
    ...actual,
    useAuth: () => ({
      user: { id: '1', email: 'a@b.com', role: authState.role, canViewAzure: true, canViewAws: true, canViewGcp: true, canViewBtp: true, azureReadOnly: authState.readOnly, awsReadOnly: authState.readOnly },
      cloudAccess: ['azure', 'aws', 'gcp', 'btp'], invoiceOnly: false, accountLimits: authState.limits, modules: authState.modules,
    } as Partial<AuthContextValue>),
  };
});

function Where() {
  const { pathname } = useLocation();
  return <p data-testid="where">{pathname}</p>;
}

const renderHost = () => render(<ThemeProvider><MemoryRouter initialEntries={['/start']}><ConnectDialogHost /><Where /></MemoryRouter></ThemeProvider>);
const open = (provider?: ConnectProvider, options?: Parameters<typeof openConnectDialog>[1]) => act(() => openConnectDialog(provider, options));
const dialog = (name: string | RegExp) => screen.getByRole('dialog', { name });

const toasts: ToastDetail[] = [];
let unsubscribe: () => void;

beforeEach(() => {
  workspaceRepository.setProfile('empty');
  resetSapAdminStore();
  authState.role = 'admin';
  authState.modules = { cloudCost: true, sapMonitoring: true };
  authState.limits = { azure: 3, aws: 3, btp: 3 };
  authState.readOnly = false;
  toasts.length = 0;
  unsubscribe = subscribeToToasts((detail) => toasts.push(detail));
});
afterEach(() => {
  // Unmount first, so resetting the stores below does not re-render a mounted dialog outside act().
  cleanup();
  unsubscribe();
  closeConnectDialog();
  workspaceRepository.setProfile('populated');
  resetSapAdminStore();
});

const CASES: Array<{ provider: ConnectProvider; title: string; firstField: string; syncing: string; landing: RegExp }> = [
  { provider: 'azure', title: 'Connect Azure account', firstField: 'Account name', syncing: 'Syncing costs…', landing: /^\/azure\/az-/ },
  { provider: 'aws', title: 'Connect AWS account', firstField: 'Account name', syncing: 'Syncing costs…', landing: /^\/aws\/account\// },
  { provider: 'gcp', title: 'Connect Google Cloud project', firstField: 'Display Name', syncing: 'Syncing costs…', landing: /^\/gcp\/account\// },
  { provider: 'btp', title: 'Connect SAP BTP account', firstField: 'Account Name', syncing: 'Syncing costs…', landing: /^\/btp\/account\// },
  { provider: 'sap', title: 'Connect SAP system', firstField: 'Environment Name', syncing: 'Testing connection…', landing: /^\/sap\/systems$/ },
];

describe('ConnectAccountDialog from a provider page', () => {
  it.each(CASES)('$provider: opens on the credentials with the first field focused and the tour hooks in place', async ({ provider, title, firstField }) => {
    renderHost();
    await open(provider);
    const root = dialog(title);
    expect(root).toHaveAttribute('data-tour', 'connect-dialog');
    expect(within(root).getByLabelText(firstField)).toHaveFocus();
    expect(within(root).getByRole('button', { name: 'Use sample credentials' })).toHaveAttribute('data-tour', 'use-sample-credentials');
    expect(within(root).getByRole('button', { name: 'Connect' })).toHaveAttribute('data-tour', 'connect-submit');
    // Launched from a provider page there is no provider step and no way to wander off.
    expect(within(root).queryByRole('button', { name: 'Choose another provider' })).toBeNull();
    expect(root.querySelector('[data-tour^="connect-provider-"]')).toBeNull();
  });

  it.each(CASES)('$provider: sample credentials then Connect shows the syncing state, closes, toasts and opens the new account', async ({ provider, title, syncing, landing }) => {
    const user = userEvent.setup();
    const onConnected = vi.fn();
    renderHost();
    await open(provider, { onConnected });
    const root = dialog(title);
    await user.click(within(root).getByRole('button', { name: 'Use sample credentials' }));
    // Two clicks in all: the sample button, then Connect (which now has focus, so Enter would do too).
    expect(within(root).getByRole('button', { name: 'Connect' })).toHaveFocus();
    await user.click(within(root).getByRole('button', { name: 'Connect' }));

    expect(within(root).getByRole('button', { name: syncing })).toBeDisabled();
    expect(within(root).getByRole('status')).toHaveTextContent(/Northwind/);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), { timeout: 4000 });
    await waitFor(() => expect(screen.getByTestId('where').textContent).toMatch(landing));
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toMatchObject({ type: 'success' });
    expect(toasts[0].message).toMatch(/sample data/);
    expect(onConnected).toHaveBeenCalledTimes(1);
    const account = onConnected.mock.calls[0][0] as { provider: string; id: string; name: string; path: string };
    expect(account.provider).toBe(provider);
    expect(account.path).toBe(screen.getByTestId('where').textContent);
    if (provider === 'sap') {
      const destination = sapAdminRepository.destinations.list().find((d) => d.id === account.id);
      expect(destination?.status).toBe('Connected');
    } else {
      expect(workspaceRepository.listAccounts(provider).map((a) => a.id)).toEqual([account.id]);
      expect(workspaceRepository.listAccounts(provider)[0].sample).toBe(true);
    }
  }, 15000);

  it('stays on the page when asked to (System Configuration adds a destination without leaving)', async () => {
    const user = userEvent.setup();
    const onConnected = vi.fn();
    renderHost();
    await open('sap', { stay: true, onConnected });
    await user.click(screen.getByRole('button', { name: 'Use sample credentials' }));
    await user.click(screen.getByRole('button', { name: 'Connect' }));
    await waitFor(() => expect(onConnected).toHaveBeenCalled(), { timeout: 4000 });
    expect(screen.getByTestId('where')).toHaveTextContent('/start');
  }, 15000);

  it('Escape while syncing cancels the connection: nothing is added', async () => {
    const user = userEvent.setup();
    renderHost();
    await open('azure');
    await user.click(screen.getByRole('button', { name: 'Use sample credentials' }));
    await user.click(screen.getByRole('button', { name: 'Connect' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 1200));
    expect(workspaceRepository.listAccounts('azure')).toEqual([]);
    expect(screen.getByTestId('where')).toHaveTextContent('/start');
  }, 10000);
});

describe('ConnectAccountDialog validation', () => {
  it('shows every missing field inline on Connect, focuses the first, and clears an error as it is fixed', async () => {
    const user = userEvent.setup();
    renderHost();
    await open('azure');
    const root = dialog('Connect Azure account');
    expect(within(root).queryByRole('alert')).toBeNull();
    await user.click(within(root).getByRole('button', { name: 'Connect' }));
    expect(within(root).getAllByRole('alert').map((a) => a.textContent)).toEqual([
      'Account name is required.', 'Subscription ID is required.', 'Tenant ID is required.', 'Client ID is required.', 'Client secret is required.',
    ]);
    expect(within(root).getByLabelText('Account name')).toHaveFocus();
    expect(within(root).getByLabelText('Account name')).toHaveAttribute('aria-invalid', 'true');
    await user.type(within(root).getByLabelText('Account name'), 'Prod');
    expect(within(root).getAllByRole('alert')).toHaveLength(4);
    expect(workspaceRepository.listAccounts('azure')).toEqual([]);
  });

  it('reports the existing format errors beside the field that has them', async () => {
    const user = userEvent.setup();
    renderHost();
    await open('azure');
    const root = dialog('Connect Azure account');
    await user.click(within(root).getByRole('button', { name: 'Use sample credentials' }));
    const tenant = within(root).getByLabelText('Tenant ID');
    await user.clear(tenant);
    await user.type(tenant, 'tenant-1');
    await user.click(within(root).getByRole('button', { name: 'Connect' }));
    expect(within(root).getByRole('alert')).toHaveTextContent('Invalid Tenant ID format. Must be a valid UUID.');
    expect(tenant).toHaveFocus();
    expect(tenant).toHaveAccessibleDescription('Invalid Tenant ID format. Must be a valid UUID.');
  });

  it('AWS: rejects a short access key', async () => {
    const user = userEvent.setup();
    renderHost();
    await open('aws');
    const root = dialog('Connect AWS account');
    await user.click(within(root).getByRole('button', { name: 'Use sample credentials' }));
    const key = within(root).getByLabelText('Access key ID');
    await user.clear(key);
    await user.type(key, 'AKIAEXAMPLE');
    await user.click(within(root).getByRole('button', { name: 'Connect' }));
    expect(within(root).getByRole('alert')).toHaveTextContent('Invalid Access Key ID. Should start with AKIA or ASIA and be 20 chars.');
  });

  it('sample credentials replace what was typed, stay editable, and clear earlier errors', async () => {
    const user = userEvent.setup();
    renderHost();
    await open('gcp');
    const root = dialog('Connect Google Cloud project');
    await user.click(within(root).getByRole('button', { name: 'Connect' }));
    expect(within(root).getAllByRole('alert').length).toBeGreaterThan(0);
    await user.type(within(root).getByLabelText('Display Name'), 'typed');
    await user.click(within(root).getByRole('button', { name: 'Use sample credentials' }));
    expect(within(root).queryByRole('alert')).toBeNull();
    const name = within(root).getByLabelText('Display Name');
    expect(name).toHaveValue('Northwind Analytics');
    expect(within(root).getByLabelText('Project ID')).toHaveValue('northwind-analytics-418207');
    expect((within(root).getByLabelText('Service Account JSON Key') as HTMLTextAreaElement).value).toContain('"client_email"');
    await user.clear(name);
    await user.type(name, 'My own name');
    expect(name).toHaveValue('My own name');
  });

  it('SAP: a second sample picks a name that is not already a destination', async () => {
    const user = userEvent.setup();
    sapAdminRepository.destinations.add({ name: 'Northwind S/4HANA Production', systems: ['PRD'], timezone: 'UTC — UTC+0', connectionType: 'ODATA', url: 'https://x.example.com', client: '100', language: 'EN', username: 'u' });
    renderHost();
    await open('sap');
    await user.click(screen.getByRole('button', { name: 'Use sample credentials' }));
    expect(screen.getByLabelText('Environment Name')).toHaveValue('Northwind S/4HANA Quality');
  });

  it('SAP: switches the connection strategy and says what it means', async () => {
    const user = userEvent.setup();
    renderHost();
    await open('sap');
    const group = screen.getByRole('group', { name: 'Connection strategy' });
    expect(within(group).getByRole('button', { name: 'OData' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(within(group).getByRole('button', { name: 'RFC' }));
    expect(within(group).getByRole('button', { name: 'RFC' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Classic SAP RFC/)).toBeInTheDocument();
  });

  it('SAP BTP: the CIS block is optional, opens with the sample, and a token URL gains its OAuth path when left', async () => {
    const user = userEvent.setup();
    renderHost();
    await open('btp');
    const root = dialog('Connect SAP BTP account');
    expect(within(root).queryByLabelText('CIS Client ID')).toBeNull();
    const token = within(root).getByLabelText('Token URL');
    await user.type(token, 'https://abc.authentication.eu10.hana.ondemand.com');
    await user.tab();
    expect(token).toHaveValue('https://abc.authentication.eu10.hana.ondemand.com/oauth/token');
    await user.click(within(root).getByRole('button', { name: 'Use sample credentials' }));
    expect((within(root).getByLabelText('CIS Client ID') as HTMLInputElement).value).toContain('cis-central');
    // Setting just one CIS field with the others blank asks for the rest.
    await user.clear(within(root).getByLabelText('CIS Client Secret'));
    await user.click(within(root).getByRole('button', { name: 'Connect' }));
    expect(within(root).getByRole('alert')).toHaveTextContent('CIS Client ID and Client Secret are required if configuring CIS_Central.');
  });
});

describe('ConnectAccountDialog launched generically', () => {
  it('opens on a provider picker with a stable hook per option, and goes to the credentials of the one chosen', async () => {
    const user = userEvent.setup();
    renderHost();
    await open();
    const root = dialog('Connect an account');
    const options = Array.from(root.querySelectorAll('[data-tour^="connect-provider-"]')).map((o) => o.getAttribute('data-tour'));
    expect(options).toEqual(['connect-provider-azure', 'connect-provider-aws', 'connect-provider-gcp', 'connect-provider-btp', 'connect-provider-sap']);
    expect(within(root).getByRole('button', { name: /Azure/ })).toHaveFocus();
    expect(within(root.querySelector('[data-tour="connect-provider-sap"]') as HTMLElement).getByText('SAP system')).toBeInTheDocument();

    await user.click(within(root).getByRole('button', { name: /AWS/ }));
    expect(screen.getByRole('dialog', { name: 'Connect AWS account' })).toBeInTheDocument();
    expect(screen.getByLabelText('Account name')).toHaveFocus();

    // And back, to pick something else.
    await user.click(screen.getByRole('button', { name: 'Choose another provider' }));
    expect(screen.getByRole('dialog', { name: 'Connect an account' })).toBeInTheDocument();
  });

  it('three clicks from the picker: choose, sample credentials, Connect', async () => {
    const user = userEvent.setup();
    renderHost();
    await open();
    await user.click(screen.getByRole('button', { name: /Google Cloud/ }));
    await user.click(screen.getByRole('button', { name: 'Use sample credentials' }));
    await user.click(screen.getByRole('button', { name: 'Connect' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), { timeout: 4000 });
    expect(workspaceRepository.listAccounts('gcp')).toHaveLength(1);
    await waitFor(() => expect(screen.getByTestId('where').textContent).toMatch(/^\/gcp\/account\//));
  }, 15000);

  it('offers only what the organisation subscribes to', async () => {
    authState.modules = { cloudCost: false, sapMonitoring: true };
    renderHost();
    await open();
    const root = dialog('Connect an account');
    expect(Array.from(root.querySelectorAll('[data-tour^="connect-provider-"]')).map((o) => o.getAttribute('data-tour'))).toEqual(['connect-provider-sap']);
  });

  it('a provider launch can still offer the others from the credentials step (canSwitch)', async () => {
    const user = userEvent.setup();
    renderHost();
    await open('azure', { canSwitch: true });
    await user.click(screen.getByRole('button', { name: 'Choose another provider' }));
    expect(screen.getByRole('dialog', { name: 'Connect an account' })).toBeInTheDocument();
  });

  it('marks an option that cannot be used and says why', async () => {
    authState.limits = { azure: 1, aws: 3, btp: 3 };
    workspaceRepository.addConnectedAccount('azure', { name: 'First', subscriptionId: 's', tenantId: 't', clientId: 'c' });
    renderHost();
    await open();
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: /Azure/ })).toHaveTextContent(/Account limit reached/);
  });
});

describe('ConnectAccountDialog limits and permissions', () => {
  it('explains the account limit instead of showing the form', async () => {
    authState.limits = { azure: 1, aws: 3, btp: 3 };
    workspaceRepository.addConnectedAccount('azure', { name: 'First', subscriptionId: 's', tenantId: 't', clientId: 'c' });
    renderHost();
    await open('azure');
    const root = dialog('Connect Azure account');
    expect(within(root).getByRole('alert')).toHaveTextContent('Account limit reached — your plan allows up to 1 Azure account.');
    expect(within(root).queryByLabelText('Subscription ID')).toBeNull();
    expect(within(root).queryByRole('button', { name: 'Connect' })).toBeNull();
    expect(within(root).queryByRole('button', { name: 'Use sample credentials' })).toBeNull();
  });

  it('a limit of 0 means no limit', async () => {
    authState.limits = { azure: 0, aws: 3, btp: 3 };
    for (let i = 0; i < 4; i += 1) workspaceRepository.addConnectedAccount('azure', { name: `A${i}`, subscriptionId: 's', tenantId: 't', clientId: 'c' });
    renderHost();
    await open('azure');
    expect(within(dialog('Connect Azure account')).getByLabelText('Subscription ID')).toBeInTheDocument();
  });

  it('explains read-only mode', async () => {
    authState.role = 'member';
    authState.readOnly = true;
    renderHost();
    await open('aws');
    expect(within(dialog('Connect AWS account')).getByRole('alert')).toHaveTextContent(/Read-only mode/);
    expect(screen.queryByLabelText('Access key ID')).toBeNull();
  });

  it('says so when the plan does not include the module', async () => {
    authState.modules = { cloudCost: false, sapMonitoring: true };
    renderHost();
    await open('azure');
    expect(within(dialog('Connect Azure account')).getByRole('alert')).toHaveTextContent('Your plan does not include Cloud Cost.');
  });
});

describe('Set up everything with sample data', () => {
  it('connects one of each provider and an SAP system, then opens the dashboard', async () => {
    const user = userEvent.setup();
    renderHost();
    await open();
    const button = screen.getByRole('button', { name: 'Set up everything with sample data' });
    expect(button).toHaveAttribute('data-tour', 'connect-everything');
    await user.click(button);
    expect(screen.getByRole('button', { name: 'Setting up sample data…' })).toBeDisabled();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), { timeout: 5000 });
    expect(workspaceRepository.connectedProviders().sort()).toEqual(['aws', 'azure', 'btp', 'gcp']);
    expect(sapAdminRepository.destinations.list().map((d) => d.status)).toEqual(['Connected']);
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent(/^\/$/));
    expect(toasts[0].message).toBe('Connected 5 sample connections. Everything shows sample data.');
  }, 15000);

  it('is offered from the credentials step too, and skips a provider that is at its limit', async () => {
    const user = userEvent.setup();
    authState.limits = { azure: 0, aws: 3, btp: 3 };
    authState.modules = { cloudCost: true, sapMonitoring: false };
    renderHost();
    await open('aws');
    await user.click(screen.getByRole('button', { name: 'Set up everything with sample data' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), { timeout: 5000 });
    expect(sapAdminRepository.destinations.count()).toBe(0);
    expect(workspaceRepository.connectedProviders().sort()).toEqual(['aws', 'azure', 'btp', 'gcp']);
  }, 15000);

  it('is not offered once something is connected', async () => {
    workspaceRepository.addConnectedAccount('azure', { name: 'First', subscriptionId: 's', tenantId: 't', clientId: 'c' });
    renderHost();
    await open();
    expect(screen.queryByRole('button', { name: 'Set up everything with sample data' })).toBeNull();
  });
});

describe('ConnectAccountDialog as a plain component', () => {
  it('renders nothing while closed, and Cancel and the close button call onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { rerender } = render(<ThemeProvider><MemoryRouter><ConnectAccountDialog provider="azure" open={false} onClose={onClose} /></MemoryRouter></ThemeProvider>);
    expect(screen.queryByRole('dialog')).toBeNull();
    rerender(<ThemeProvider><MemoryRouter><ConnectAccountDialog provider="azure" open onClose={onClose} /></MemoryRouter></ThemeProvider>);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(screen.getByRole('button', { name: 'Close connection dialog' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
