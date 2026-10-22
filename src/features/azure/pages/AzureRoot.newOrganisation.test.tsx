import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ConfirmProvider } from '../../../shared/ui/ConfirmProvider';
import { ThemeProvider } from '../../../shared/theme/ThemeProvider';
import { workspaceRepository } from '../../../data-access';
import { AzureRoot } from './AzureRoot';
import { AzureCostPage } from './AzureCostPage';

vi.mock('../../auth/model/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../auth/model/AuthContext')>();
  return {
    ...actual,
    useAuth: () => ({ user: { id: '1', email: 'a@b.com', role: 'admin', canViewAzure: true }, cloudAccess: ['azure'], invoiceOnly: false, accountLimits: { azure: 3, aws: 3, btp: 3 } }),
  };
});
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return { ...actual, ResponsiveContainer: ({ children }: { children: ReactNode }) => <div style={{ width: 600, height: 240 }}>{children}</div> };
});

const renderAt = (url: string) => render(
  <ThemeProvider>
    <MemoryRouter initialEntries={[url]}>
      <ConfirmProvider>
        <Routes>
          <Route path="/azure" element={<AzureRoot />} />
          <Route path="/azure/:accountId" element={<AzureCostPage />} />
        </Routes>
      </ConfirmProvider>
    </MemoryRouter>
  </ThemeProvider>,
);

describe('Azure pages for a brand-new organisation', () => {
  beforeEach(() => workspaceRepository.setProfile('empty'));
  afterEach(() => workspaceRepository.setProfile('populated'));

  it('the overview has no subscriptions, no numbers and one action: Connect Azure', async () => {
    const user = userEvent.setup();
    const { container } = renderAt('/azure');
    expect(screen.getByRole('heading', { name: 'No Azure subscriptions connected yet' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Manage Accounts' })).toBeNull();
    expect(container.textContent).not.toMatch(/NaN|undefined/);
    // The action opens the account manager with the connect form open.
    await user.click(screen.getByRole('button', { name: 'Connect Azure' }));
    expect(await screen.findByRole('dialog', { name: 'Connect Azure account' })).toBeInTheDocument();
  });

  it('a connected account appears in the overview and has a cost page full of sample data under its name', () => {
    const account = workspaceRepository.addConnectedAccount('azure', { name: 'Contoso Prod', subscriptionId: '11111111-2222-4333-8444-555555555555', tenantId: 't', clientId: 'c' });
    const overview = renderAt('/azure');
    expect(screen.queryByRole('heading', { name: 'No Azure subscriptions connected yet' })).toBeNull();
    const table = screen.getByRole('table');
    expect(within(table).getByRole('button', { name: 'Contoso Prod' })).toBeInTheDocument();
    expect(screen.getAllByText('Sample data').length).toBeGreaterThan(0);
    overview.unmount();

    const { container } = renderAt(`/azure/${account.id}`);
    expect(screen.getByRole('heading', { name: 'Contoso Prod' })).toBeInTheDocument();
    expect(screen.getByText('Sample data')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/NaN|undefined/);
  });

  it('a cost page for an account that is not connected says so', () => {
    renderAt('/azure/az-acc-9');
    expect(screen.getByRole('heading', { name: 'Account not found' })).toBeInTheDocument();
  });
});
