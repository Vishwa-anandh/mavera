import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SapPerformancePage } from './SapPerformancePage';
import { ThemeProvider } from '../../../shared/theme/ThemeProvider';

const renderPage = (path = '/') => render(<ThemeProvider><MemoryRouter initialEntries={[path]}><SapPerformancePage /></MemoryRouter></ThemeProvider>);

describe('SapPerformancePage', () => {
  it('shows "Not reported" instead of a misleading 0% for metrics the SAP system did not send', () => {
    renderPage();

    expect(screen.getByLabelText('DB Hit Ratio not reported')).toHaveTextContent('—');
    expect(screen.getByLabelText('Memory Usage not reported')).toHaveTextContent('—');
    expect(screen.getAllByText('Not reported by this system')).toHaveLength(2);
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
  });

  it('lists each application server as its own card with readable metrics', () => {
    renderPage('/#health');
    expect(screen.getByText('1 instance')).toBeInTheDocument();
    expect(screen.getByText('sapgrc_GRC_00')).toBeInTheDocument();
    expect(screen.getByText('Dialog steps')).toBeInTheDocument();
  });

  it('has three tabs, renders only the active panel and follows the URL hash', async () => {
    const user = userEvent.setup();
    const { unmount } = renderPage();
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['System health', 'Jobs and processes', 'Analytics']);
    expect(screen.getByRole('tab', { name: 'System health' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: /Server Topology/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Work Processes/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Analytics' })).not.toBeInTheDocument();
    // the KPI strip and the host/sync line sit above the tabs
    expect(screen.getByText('Response Time')).toBeInTheDocument();
    expect(screen.getByRole('timer')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Jobs and processes' }));
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: /Work Processes/ })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Update and enqueue queues' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Server Topology/ })).not.toBeInTheDocument();
    expect(screen.getByRole('timer')).toBeInTheDocument();
    unmount();

    renderPage('/#analytics');
    expect(screen.getByRole('tab', { name: 'Analytics' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { name: 'Analytics' })).toBeInTheDocument();
  });
});
