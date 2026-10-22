import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { HomePage } from './HomePage';
import { ThemeProvider } from '../../../shared/theme/ThemeProvider';
import type { AuthContextValue } from '../../auth';
import { workspaceRepository } from '../../../data-access';
import { ConnectDialogHost, closeConnectDialog } from '../../workspace';
import { newOrganisationData } from '../model/newOrganisationData';
import type { DashboardData } from '../model/useDashboardData';

const useAuthMock = vi.fn<() => Partial<AuthContextValue>>();
const useDashboardDataMock = vi.fn<() => DashboardData & { refetch: () => void }>();

vi.mock('../../auth/model/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../auth/model/AuthContext')>();
  return { ...actual, useAuth: () => useAuthMock() };
});
vi.mock('../model/useDashboardData', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../model/useDashboardData')>();
  return { ...actual, useDashboardData: () => useDashboardDataMock() };
});
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return { ...actual, ResponsiveContainer: ({ children }: { children: ReactNode }) => <div style={{ width: 300, height: 180 }}>{children}</div> };
});

function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname}{search}</p>;
}

const renderDashboard = () => render(<ThemeProvider><MemoryRouter><HomePage /><Where /><ConnectDialogHost /></MemoryRouter></ThemeProvider>);

describe('HomePage for a brand-new organisation', () => {
  beforeEach(() => {
    workspaceRepository.setProfile('empty');
    useAuthMock.mockReturnValue({
      user: { id: 'new', email: 'new@mavera.local', name: 'Nora Newman', role: 'admin', canViewAzure: true, canViewAws: true, canViewBtp: true, canViewGcp: true },
      cloudAccess: ['azure', 'aws', 'btp', 'gcp'], invoiceOnly: false, modules: { cloudCost: true, sapMonitoring: true },
    });
    useDashboardDataMock.mockImplementation(() => ({ ...newOrganisationData([]), refetch: vi.fn() }));
  });
  afterEach(() => { closeConnectDialog(); workspaceRepository.setProfile('populated'); });

  it('shows zeros, an empty state for each module and ONE primary action to connect the first account', async () => {
    const user = userEvent.setup();
    const { container } = renderDashboard();

    // The pulse deck: one empty readout per module, each pointing at its connect flow.
    expect(screen.getByText('No cloud account connected yet')).toBeInTheDocument();
    expect(screen.getByText('No SAP system connected yet')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Connect your first account' }).some((link) => link.getAttribute('href') === '/azure?open=connect')).toBe(true);
    expect(screen.getAllByRole('link', { name: 'Connect an SAP system' }).some((link) => link.getAttribute('href') === '/sap/configuration?open=connect')).toBe(true);

    // The strip of figures reads zero, not NaN or sample numbers.
    const strip = screen.getByLabelText('At a glance');
    expect(within(strip).getAllByText('$0.00').length).toBeGreaterThan(0);
    expect(within(strip).getByText('0/0')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/NaN|undefined/);

    // Exactly one primary call to action (a button), and it opens the shared connect dialog in place.
    expect(screen.getByRole('heading', { name: 'Connect your first account' })).toBeInTheDocument();
    const primary = screen.getAllByRole('button', { name: 'Connect your first account' });
    expect(primary).toHaveLength(1);
    await user.click(primary[0]);
    expect(screen.getByRole('dialog', { name: 'Connect Azure account' })).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/$/);
  });

  it('the pulse deck and the empty panels open the same dialog in place on a plain click', async () => {
    const user = userEvent.setup();
    renderDashboard();
    await user.click(screen.getAllByRole('link', { name: 'Connect an SAP system' })[0]);
    expect(screen.getByRole('dialog', { name: 'Connect SAP system' })).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/$/);
  });

  it('shows the figures, not the empty state, once an account is connected', () => {
    workspaceRepository.addConnectedAccount('azure', { name: 'Contoso', subscriptionId: 's', tenantId: 't', clientId: 'c' });
    const { container } = renderDashboard();
    expect(screen.queryByText('No cloud account connected yet')).toBeNull();
    expect(screen.getByText('No SAP system connected yet')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Connect your first account' })).toBeNull();
    const strip = screen.getByLabelText('At a glance');
    expect(within(strip).queryByText('$0.00')).toBeNull();
    expect(container.textContent).not.toMatch(/NaN|undefined/);
  });
});
