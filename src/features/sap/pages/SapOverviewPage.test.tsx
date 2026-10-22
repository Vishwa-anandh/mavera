import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { SapOverviewPage } from './SapOverviewPage';
import { HanaMonitoringPage } from './HanaMonitoringPage';
import { ThemeProvider } from '../../../shared/theme/ThemeProvider';

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return { ...actual, ResponsiveContainer: ({ children }: { children: ReactNode }) => <div style={{ width: 400, height: 220 }}>{children}</div> };
});

const renderPage = (node: ReactNode, path = '/') => render(<ThemeProvider><MemoryRouter initialEntries={[path]}>{node}</MemoryRouter></ThemeProvider>);

describe('SapOverviewPage', () => {
  it('charts the load per system and the condition mix, above the one systems table', () => {
    renderPage(<SapOverviewPage />);
    expect(screen.getByRole('img', { name: 'CPU and memory load by system' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Systems by condition' })).toBeInTheDocument();
    const systems = screen.getByRole('heading', { name: 'Systems' }).closest('.mv-panel') as HTMLElement;
    expect(within(systems).getAllByRole('row').length).toBeGreaterThan(1);
  });

  it('says what needs attention, most urgent first, with each row linking on', () => {
    renderPage(<SapOverviewPage />);
    const list = screen.getByRole('list', { name: 'SAP items that need attention' });
    const rows = within(list).getAllByRole('listitem');
    expect(within(rows[0]).getByText('HANA-PRD is critical')).toBeInTheDocument();
    expect(within(rows[0]).getByRole('link')).toHaveAttribute('href', '/sap/systems');
  });

  it('summarises unread alerts by severity and links to Jobs & Dumps', () => {
    renderPage(<SapOverviewPage />);
    expect(screen.getByRole('list', { name: 'Unread SAP alerts by severity' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Jobs & Dumps' })).toHaveAttribute('href', '/sap/jobs');
  });
});

describe('SapOverviewPage systems table', () => {
  const systemsPanel = () => screen.getByRole('heading', { name: 'Systems' }).closest('.mv-panel') as HTMLElement;

  it('filters the systems with condition chips that carry the counts', async () => {
    renderPage(<SapOverviewPage />);
    const chips = within(systemsPanel()).getByRole('group', { name: 'Filter systems by condition' });
    expect(within(chips).getByRole('button', { name: /^All\s*5$/ })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(within(chips).getByRole('button', { name: /^Critical\s*1$/ }));
    const rows = within(systemsPanel()).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent('HANA-PRD');
    await userEvent.click(within(chips).getByRole('button', { name: /^All/ }));
    expect(within(systemsPanel()).getAllByRole('row').length).toBe(6);
  });

  it('opens a system from anywhere in its row, or from its name with the keyboard, and links on to HANA monitoring', async () => {
    renderPage(<SapOverviewPage />);
    const row = within(systemsPanel()).getByRole('button', { name: 'HANA-PRD' }).closest('tr') as HTMLElement;
    await userEvent.click(within(row).getByText('Production'));
    const drawer = screen.getByRole('dialog', { name: 'HANA-PRD' });
    expect(drawer).toHaveTextContent('92%');
    expect(drawer).toHaveTextContent('CPU and memory are at or above');
    expect(within(drawer).getByRole('link', { name: 'Open HANA monitoring' })).toHaveAttribute('href', '/sap/databases');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const qa = within(systemsPanel()).getByRole('button', { name: 'S4H-QA' });
    qa.focus();
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('dialog', { name: 'S4H-QA' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open HANA monitoring' })).not.toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(qa).toHaveFocus();
  });
});

describe('HanaMonitoringPage', () => {
  it('opens with the last-24-hours findings and the vitals tab, with the per-service memory chart one tab over', async () => {
    renderPage(<HanaMonitoringPage />);
    const findings = screen.getByRole('list', { name: 'HANA findings for the last 24 hours' });
    expect(within(findings).getByText(/CPU peaked at 1.1% around 18:00/)).toBeInTheDocument();
    expect(within(findings).getByText(/1 service stopped/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'HANA memory, used and free' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /HANA memory by service/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Services and disk' }));
    expect(screen.getByRole('img', { name: /HANA memory by service/ })).toBeInTheDocument();
  });

  it('lists stopped services first in the services list view', async () => {
    renderPage(<HanaMonitoringPage />, '/#storage');
    await userEvent.click(screen.getByRole('button', { name: 'List' }));
    const table = screen.getByRole('heading', { name: 'Active Core Services' }).closest('.mv-panel') as HTMLElement;
    const firstRow = within(table).getAllByRole('row')[1];
    expect(within(firstRow).getByText('hdbdiserver')).toBeInTheDocument();
    expect(within(firstRow).getByText('Stopped')).toBeInTheDocument();
  });
});
