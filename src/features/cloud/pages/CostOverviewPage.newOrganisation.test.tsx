import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ThemeProvider } from '../../../shared/theme/ThemeProvider';
import { CostOverviewPage } from './CostOverviewPage';
import type { AuthContextValue } from '../../auth';
import { workspaceRepository } from '../../../data-access';
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
vi.mock('../components/ConnectCloudAccountWizard', () => ({
  ConnectCloudAccountWizard: ({ provider, onSave, onClose }: { provider: string; onSave: (payload: Record<string, string>) => Promise<void>; onClose: () => void }) => (
    <div>
      Wizard stub for {provider}
      <button onClick={() => void onSave({ name: 'Contoso Prod', subscriptionId: 's', tenantId: 't', clientId: 'c' }).then(onClose)}>Save stub account</button>
    </div>
  ),
}));

const renderPage = () => render(<ThemeProvider><MemoryRouter><CostOverviewPage /></MemoryRouter></ThemeProvider>);

describe('CostOverviewPage for a brand-new organisation', () => {
  beforeEach(() => {
    workspaceRepository.setProfile('empty');
    useAuthMock.mockReturnValue({
      user: { id: 'new', email: 'new@mavera.local', role: 'admin', canViewAzure: true, canViewAws: true, canViewBtp: true, canViewGcp: true },
      cloudAccess: ['azure', 'aws', 'btp', 'gcp'], invoiceOnly: false, modules: { cloudCost: true, sapMonitoring: true },
    });
    useDashboardDataMock.mockImplementation(() => ({ ...newOrganisationData([]), refetch: vi.fn() }));
  });
  afterEach(() => workspaceRepository.setProfile('populated'));

  it('offers one action, which opens the connect form in place, and shows no NaN or undefined', async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    expect(screen.getByRole('heading', { name: 'Connect your first cloud account' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Connect cloud account' })).toBeNull();
    expect(screen.queryByText('Total Spend (Month-to-Date)')).toBeNull();
    expect(container.textContent).not.toMatch(/NaN|undefined/);

    await user.click(screen.getByRole('button', { name: 'Connect your first account' }));
    expect(screen.getByText('Wizard stub for azure')).toBeInTheDocument();
  });

  it('connecting through that form really adds the account', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Connect your first account' }));
    await user.click(screen.getByRole('button', { name: 'Save stub account' }));
    // The page waits a moment for the simulated connection, then saves.
    await waitFor(() => expect(workspaceRepository.listAccounts('azure').map((a) => a.name)).toEqual(['Contoso Prod']));
    expect(workspaceRepository.listAccounts('azure')[0].sample).toBe(true);
  });
});
