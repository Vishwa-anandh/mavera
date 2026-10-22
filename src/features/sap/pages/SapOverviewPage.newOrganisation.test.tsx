import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { SapOverviewPage } from './SapOverviewPage';
import { HanaMonitoringPage } from './HanaMonitoringPage';
import { SapAlertsPage } from './SapAlertsPage';
import { SapJobsPage } from './SapJobsPage';
import { SapPerformancePage } from './SapPerformancePage';
import { TransportManagementPage } from './TransportManagementPage';
import { SecurityNotesPage } from './SecurityNotesPage';
import { BtpSecurityPage } from './BtpSecurityPage';
import { ThemeProvider } from '../../../shared/theme/ThemeProvider';
import { ConfirmProvider } from '../../../shared/ui/ConfirmProvider';
import { sapAdminRepository, workspaceRepository } from '../../../data-access';

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return { ...actual, ResponsiveContainer: ({ children }: { children: ReactNode }) => <div style={{ width: 400, height: 220 }}>{children}</div> };
});

function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname}{search}</p>;
}
const renderPage = (node: ReactNode) => render(<ThemeProvider><MemoryRouter><ConfirmProvider>{node}<Where /></ConfirmProvider></MemoryRouter></ThemeProvider>);

describe('SAP pages for a brand-new organisation', () => {
  beforeEach(() => workspaceRepository.setProfile('empty'));
  afterEach(() => workspaceRepository.setProfile('populated'));

  it('SAP Overview offers one action: connect an SAP system, in System Configuration with the form open', async () => {
    const user = userEvent.setup();
    const { container } = renderPage(<SapOverviewPage />);
    expect(screen.getByRole('heading', { name: 'SAP Overview' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'No SAP system connected yet' })).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(container.textContent).not.toMatch(/NaN|undefined/);
    await user.click(screen.getByRole('button', { name: 'Connect an SAP system' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/sap/configuration?open=connect');
  });

  it.each([
    ['HANA/DB Monitoring', <HanaMonitoringPage key="h" />],
    ['Jobs & Dumps', <SapJobsPage key="j" />],
    ['Performance', <SapPerformancePage key="p" />],
    ['Alerts & Escalations', <SapAlertsPage key="a" />],
    ['Transport Management', <TransportManagementPage key="t" />],
    ['Security Notes', <SecurityNotesPage key="s" />],
    ['BTP Security Assessment', <BtpSecurityPage key="b" />],
  ])('%s shows the same empty state, with no figures', (title, page) => {
    const { container } = renderPage(page);
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect an SAP system' })).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/NaN|undefined/);
  });

  it('shows the page itself once a system is connected', () => {
    sapAdminRepository.destinations.add({
      name: 'Prod', connectionType: 'ODATA', url: 'https://sap.example.com', systems: ['PRD'], timezone: 'UTC — UTC+0', client: '100', language: 'EN', username: 'svc',
    });
    renderPage(<SapOverviewPage />);
    expect(screen.queryByRole('heading', { name: 'No SAP system connected yet' })).toBeNull();
    expect(screen.getByRole('img', { name: 'Systems by condition' })).toBeInTheDocument();
  });
});
