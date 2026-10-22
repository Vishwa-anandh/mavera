import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ThemeProvider } from '../../../shared/theme/ThemeProvider';
import { CostOverviewPage } from './CostOverviewPage';
import type { AuthContextValue } from '../../auth';
import { workspaceRepository } from '../../../data-access';
import { ConnectDialogHost, closeConnectDialog } from '../../workspace';
import { newOrganisationData } from '../../dashboard/model/newOrganisationData';
import type { DashboardData } from '../../dashboard';

const useAuthMock = vi.fn<() => Partial<AuthContextValue>>();
const useDashboardDataMock = vi.fn<() => DashboardData & { refetch: () => void }>();

vi.mock('../../auth/model/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../auth/model/AuthContext')>();
  return { ...actual, useAuth: () => useAuthMock() };
});
vi.mock('../../dashboard/model/useDashboardData', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../dashboard/model/useDashboardData')>();
  return { ...actual, useDashboardData: () => useDashboardDataMock() };
});
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return { ...actual, ResponsiveContainer: ({ children }: { children: ReactNode }) => <div style={{ width: 300, height: 180 }}>{children}</div> };
});
function AccountPage() {
  return <p>Opened Azure account {useParams().accountId}</p>;
}

const renderPage = () => render(<ThemeProvider><MemoryRouter initialEntries={['/cloud/overview']}><Routes><Route path="/cloud/overview" element={<><CostOverviewPage /><ConnectDialogHost /></>} /><Route path="/azure/:accountId" element={<AccountPage />} /></Routes></MemoryRouter></ThemeProvider>);

describe('CostOverviewPage for a brand-new organisation', () => {
  beforeEach(() => {
    workspaceRepository.setProfile('empty');
    useAuthMock.mockReturnValue({
      user: { id: 'new', email: 'new@mavera.local', role: 'admin', canViewAzure: true, canViewAws: true, canViewBtp: true, canViewGcp: true },
      cloudAccess: ['azure', 'aws', 'btp', 'gcp'], invoiceOnly: false, modules: { cloudCost: true, sapMonitoring: true },
    });
    useDashboardDataMock.mockImplementation(() => ({ ...newOrganisationData([]), refetch: vi.fn() }));
  });
  afterEach(() => { closeConnectDialog(); workspaceRepository.setProfile('populated'); });

  it('offers one action, which opens the connect dialog in place, and shows no NaN or undefined', async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    expect(screen.getByRole('heading', { name: 'Connect your first cloud account' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Connect cloud account' })).toBeNull();
    expect(screen.queryByText('Total Spend (Month-to-Date)')).toBeNull();
    expect(container.textContent).not.toMatch(/NaN|undefined/);

    await user.click(screen.getByRole('button', { name: 'Connect your first account' }));
    // Straight onto the Azure credentials (no provider picker), with the other providers one click away.
    expect(screen.getByRole('dialog', { name: 'Connect Azure account' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose another provider' })).toBeInTheDocument();
  });

  it('two more clicks (sample credentials, Connect) add the account and open it', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Connect your first account' }));
    await user.click(screen.getByRole('button', { name: 'Use sample credentials' }));
    await user.click(screen.getByRole('button', { name: 'Connect' }));
    expect(await screen.findByText(/Opened Azure account/, undefined, { timeout: 4000 })).toBeInTheDocument();
    expect(workspaceRepository.listAccounts('azure').map((a) => a.name)).toEqual(['Northwind Production']);
    expect(workspaceRepository.listAccounts('azure')[0].sample).toBe(true);
    expect(screen.queryByRole('dialog')).toBeNull();
  }, 15000);
});
