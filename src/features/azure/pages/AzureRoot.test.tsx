import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { ConfirmProvider } from '../../../shared/ui/ConfirmProvider';
import { ThemeProvider } from '../../../shared/theme/ThemeProvider';
import type { AuthContextValue } from '../../auth';
import { ConnectDialogHost, closeConnectDialog } from '../../workspace';
import { AzureRoot } from './AzureRoot';

const authState = vi.hoisted(() => ({ role: 'admin' as 'admin' | 'member', limit: 3 }));
vi.mock('../../auth/model/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../auth/model/AuthContext')>();
  return {
    ...actual,
    useAuth: () => ({ user: { id: '1', email: 'a@b.com', role: authState.role, canViewAzure: authState.role === 'admin', azureReadOnly: authState.role === 'member' }, cloudAccess: ['azure'], invoiceOnly: false, modules: { cloudCost: true, sapMonitoring: true }, accountLimits: { azure: authState.limit, aws: 3, btp: 3 } } as Partial<AuthContextValue>),
  };
});

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return { ...actual, ResponsiveContainer: ({ children }: { children: ReactNode }) => <div style={{ width: 600, height: 240 }}>{children}</div> };
});

function Where() {
  const { search } = useLocation();
  return <p data-testid="search">{search}</p>;
}

const arriveAt = (url: string) => render(
  <ThemeProvider><MemoryRouter initialEntries={[url]}><ConfirmProvider><AzureRoot /><Where /><ConnectDialogHost /></ConfirmProvider></MemoryRouter></ThemeProvider>,
);

describe('Azure: opening the connect dialog on arrival (command palette)', () => {
  afterEach(closeConnectDialog);

  it('?open=connect opens the shared connect dialog on the Azure credentials, and clears the request', async () => {
    authState.role = 'admin';
    authState.limit = 3;
    arriveAt('/azure?open=connect');
    expect(await screen.findByRole('dialog', { name: 'Connect Azure account' })).toBeInTheDocument();
    expect(screen.getByLabelText('Subscription ID')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent(/^$/));
  });

  it('opens the dialog but explains the account limit instead of showing the form once it is reached', async () => {
    authState.role = 'admin';
    authState.limit = 1;
    arriveAt('/azure?open=connect');
    expect(await screen.findByRole('dialog', { name: 'Connect Azure account' })).toBeInTheDocument();
    expect(screen.getByText(/Account limit reached/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Subscription ID')).not.toBeInTheDocument();
  });

  it('stays on the overview when there is no request', () => {
    authState.role = 'admin';
    authState.limit = 3;
    arriveAt('/azure');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Azure Account Manager' })).not.toBeInTheDocument();
  });
});
