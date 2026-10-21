import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { resetSapAdminStore, sapAdminRepository, setSapAdminLatency } from '../../../data-access';
import { ThemeProvider } from '../../../shared/theme/ThemeProvider';
import { TransportManagementPage } from './TransportManagementPage';

vi.mock('../../auth', () => ({ useAuth: () => ({ user: { id: '1', email: 'ana@maitsys.com', name: 'Ana', role: 'admin' } }) }));

const renderPage = () => render(<ThemeProvider><MemoryRouter><TransportManagementPage /></MemoryRouter></ThemeProvider>);
const kpi = (label: string) => screen.getByText(label, { selector: '.mv-kpi-label' }).closest('.mv-kpi') as HTMLElement;

beforeEach(() => {
  resetSapAdminStore();
  setSapAdminLatency(0);
  sessionStorage.clear();
});

describe('TransportManagementPage', () => {
  it('derives the counters from the requests and lists the import queue', () => {
    renderPage();
    expect(within(kpi('Pending Imports')).getByText('3')).toBeInTheDocument();
    expect(within(kpi('Failed / Errors')).getByText('1')).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Requests waiting to be imported' })).getAllByRole('listitem')).toHaveLength(3);
  });

  it('filters requests with the status switch, which is a toggle group and not tabs', async () => {
    const user = userEvent.setup();
    renderPage();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Failed, 1' }));
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(1);
    expect(within(rows[0]).getByText('DEVK900418')).toBeInTheDocument();
  });

  it('shows only the latest few log entries on the page', () => {
    renderPage();
    expect(within(screen.getByRole('list', { name: 'Latest activity' })).getAllByRole('listitem')).toHaveLength(5);
  });

  it('opens the whole log from View All Logs, filterable by level, type and search, with paging', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'View All Logs' }));
    const drawer = await screen.findByRole('dialog', { name: 'Activity log' });
    const total = sapAdminRepository.transport.getState().activity.length;
    const list = () => within(drawer).getByRole('list', { name: 'Activity log entries' });
    expect(within(list()).getAllByRole('listitem')).toHaveLength(10);
    expect(within(drawer).getByText(/Showing/)).toHaveTextContent(`1–10 of ${total}`);
    await user.click(within(drawer).getByRole('button', { name: 'Next page' }));
    expect(within(drawer).getByText(/Showing/)).toHaveTextContent(`11–20 of ${total}`);

    await user.click(within(drawer).getByRole('button', { name: /Level/ }));
    await user.click(screen.getByRole('option', { name: 'Error' }));
    expect(within(list()).getAllByRole('listitem')).toHaveLength(1);
    expect(within(list()).getByText(/return code 8/)).toBeInTheDocument();

    await user.click(within(drawer).getByRole('button', { name: 'Clear filters' }));
    await user.type(within(drawer).getByRole('searchbox', { name: 'Search the activity log' }), 'no such text');
    expect(within(drawer).getByText('No log entries match these filters.')).toBeInTheDocument();
  });

  it('sets the route with validation, and the change shows up in the log', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByPlaceholderText('e.g. DEV'), 'dev');
    await user.type(screen.getByPlaceholderText('e.g. QAS'), 'dev');
    await user.click(screen.getByRole('button', { name: 'Set Route' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/differ/);
    await user.clear(screen.getByPlaceholderText('e.g. QAS'));
    await user.type(screen.getByPlaceholderText('e.g. QAS'), 'prd');
    await user.click(screen.getByRole('button', { name: 'Set Route' }));
    expect(screen.getByText('DEV → PRD')).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Latest activity' })).getAllByRole('listitem')[0]).toHaveTextContent('Import route set to DEV → PRD.');
  });

  it('imports the selected released requests, updating counters and queue', async () => {
    const user = userEvent.setup();
    renderPage();
    expect(screen.getByRole('button', { name: 'Import Selected' })).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: 'Select DEVK900415' }));
    await user.click(screen.getByRole('button', { name: 'Import Selected (1)' }));
    await within(kpi('Pending Imports')).findByText('2');
    expect(within(kpi('Successfully Imported')).getByText('6')).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Latest activity' })).getAllByRole('listitem')[0]).toHaveTextContent('DEVK900415 imported into QAS.');
  });

  it('refreshing adds a sync entry to the log', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByText('STMS queue refreshed on request.')).toBeInTheDocument();
  });
});
