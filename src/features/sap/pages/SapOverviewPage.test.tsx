import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { SapOverviewPage } from './SapOverviewPage';
import { HanaMonitoringPage } from './HanaMonitoringPage';
import { ThemeProvider } from '../../../shared/theme/ThemeProvider';

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return { ...actual, ResponsiveContainer: ({ children }: { children: ReactNode }) => <div style={{ width: 400, height: 220 }}>{children}</div> };
});

const renderPage = (node: ReactNode) => render(<ThemeProvider><MemoryRouter>{node}</MemoryRouter></ThemeProvider>);

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

describe('HanaMonitoringPage', () => {
  it('opens with the last-24-hours findings, then the vitals, memory composition and per-service memory', () => {
    renderPage(<HanaMonitoringPage />);
    const findings = screen.getByRole('list', { name: 'HANA findings for the last 24 hours' });
    expect(within(findings).getByText(/CPU peaked at 1.1% around 18:00/)).toBeInTheDocument();
    expect(within(findings).getByText(/1 service stopped/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'HANA memory, used and free' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'HANA memory by service' })).toBeInTheDocument();
  });

  it('lists stopped services first in the services table', () => {
    renderPage(<HanaMonitoringPage />);
    const table = screen.getByRole('heading', { name: 'Active Core Services' }).closest('.mv-panel') as HTMLElement;
    const firstRow = within(table).getAllByRole('row')[1];
    expect(within(firstRow).getByText('hdbdiserver')).toBeInTheDocument();
    expect(within(firstRow).getByText('Stopped')).toBeInTheDocument();
  });
});
