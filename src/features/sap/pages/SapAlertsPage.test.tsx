import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { resetSapAdminStore, sapAdminRepository } from '../../../data-access';
import { ThemeProvider } from '../../../shared/theme/ThemeProvider';
import { SapAlertsPage } from './SapAlertsPage';

const renderPage = () => render(<ThemeProvider><MemoryRouter><SapAlertsPage /></MemoryRouter></ThemeProvider>);
const counter = (label: string) => screen.getByText(label, { selector: '.mv-kpi-label' }).closest('.mv-kpi') as HTMLElement;
const bodyRows = () => screen.getAllByRole('row').slice(1);

beforeEach(() => {
  resetSapAdminStore();
  sessionStorage.clear();
});

describe('SapAlertsPage', () => {
  it('derives the summary line and the four counters from the alerts', () => {
    renderPage();
    expect(screen.getByText(/Last alert:/).textContent).toMatch(/Last alert: Sep 6, 9:27 AM\. Ignored this month: 0\. Threshold adjustments: 0\. Detection runs nightly at each destination's local EOD\./);
    expect(within(counter('Total Active')).getByText('9')).toBeInTheDocument();
    expect(within(counter('Unread')).getByText('5')).toBeInTheDocument();
    expect(within(counter('Critical')).getByText('2')).toBeInTheDocument();
    expect(within(counter('New Breaches')).getByText('0')).toBeInTheDocument();
  });

  it('switches between HANA and SAP Monitoring alerts, counters included', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'HANA Monitoring' }));
    expect(within(counter('Total Active')).getByText('5')).toBeInTheDocument();
    expect(bodyRows().every((row) => /HANA/.test(row.textContent ?? ''))).toBe(true);
    await user.click(screen.getByRole('button', { name: 'SAP Monitoring' }));
    expect(within(counter('Total Active')).getByText('4')).toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('filters by every alert type, including the ones that were missing', async () => {
    const user = userEvent.setup();
    renderPage();
    for (const type of ['CPU', 'Memory', 'Disk', 'Sessions', 'Dumps', 'Jobs', 'Locks', 'Work Processes']) {
      await user.click(screen.getByRole('button', { name: /^Type/ }));
      await user.click(screen.getByRole('option', { name: type }));
      expect(bodyRows().length, type).toBeGreaterThan(0);
    }
  });

  it('resolves an alert: it leaves the counters, gets a Resolved status and shows under the Resolved filter', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Resolve Dumps alert on MSQ' }));
    expect(within(counter('Total Active')).getByText('8')).toBeInTheDocument();
    expect(within(counter('Unread')).getByText('4')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resolve Dumps alert on MSQ' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Status/ }));
    await user.click(screen.getByRole('option', { name: 'Resolved' }));
    expect(bodyRows()).toHaveLength(2);
    expect(within(bodyRows()[0]).getByText('Resolved')).toBeInTheDocument();
    await user.click(within(bodyRows()[0]).getByRole('button', { name: /Reopen/ }));
    expect(within(counter('Total Active')).getByText('9')).toBeInTheDocument();
  });

  it('keeps resolved state when the page is opened again', async () => {
    const user = userEvent.setup();
    const first = renderPage();
    await user.click(screen.getByRole('button', { name: 'Resolve Dumps alert on MSQ' }));
    first.unmount();
    renderPage();
    expect(within(counter('Total Active')).getByText('8')).toBeInTheDocument();
  });

  it('marks everything read', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Mark All Read' }));
    expect(within(counter('Unread')).getByText('0')).toBeInTheDocument();
  });

  it('counts ignored alerts in the summary line', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Ignore Dumps alert on MSQ' }));
    expect(screen.getByText(/Ignored this month:/)).toHaveTextContent('Ignored this month: 1');
  });

  it('opens Settings in a drawer, validates, saves and resets; adjustments are counted', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    const drawer = await screen.findByRole('dialog', { name: 'Alert Settings' });
    const sensitivity = within(drawer).getByLabelText(/Sensitivity/);
    expect(sensitivity).toHaveValue(3);

    await user.clear(sensitivity);
    await user.type(sensitivity, '9');
    await user.click(within(drawer).getByRole('button', { name: 'Save Settings' }));
    expect(within(drawer).getByRole('alert')).toHaveTextContent('Enter a value from 1 to 6.');
    expect(sapAdminRepository.alerts.getSettings().sensitivity).toBe(3);

    await user.clear(sensitivity);
    await user.type(sensitivity, '2.5');
    await user.click(within(drawer).getByRole('button', { name: 'Save Settings' }));
    expect(sapAdminRepository.alerts.getSettings().sensitivity).toBe(2.5);

    await user.click(within(drawer).getByRole('button', { name: 'Reset to defaults' }));
    expect(sensitivity).toHaveValue(3);
    expect(sapAdminRepository.alerts.getSettings().sensitivity).toBe(3);

    await user.click(within(drawer).getByRole('button', { name: 'Close details' }));
    expect(screen.getByText(/Threshold adjustments:/)).toHaveTextContent('Threshold adjustments: 2');
  });

  it('manages recipients: validates, adds and removes', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Recipients' }));
    const dialog = screen.getByRole('dialog', { name: 'Alert recipients' });
    const list = () => within(dialog).getByRole('list', { name: 'Alert recipients' });
    expect(within(list()).getAllByRole('listitem')).toHaveLength(1);

    await user.type(within(dialog).getByLabelText(/^Email address/), 'not-an-email');
    await user.click(within(dialog).getByRole('button', { name: 'Add' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent(/valid email/);

    await user.clear(within(dialog).getByLabelText(/^Email address/));
    await user.type(within(dialog).getByLabelText(/^Email address/), 'basis@maitsys.com');
    await user.click(within(dialog).getByRole('button', { name: 'Add' }));
    expect(within(list()).getAllByRole('listitem')).toHaveLength(2);

    await user.click(within(dialog).getByRole('button', { name: 'Remove recipient basis@maitsys.com' }));
    expect(within(list()).getAllByRole('listitem')).toHaveLength(1);
    await user.click(within(dialog).getByRole('button', { name: 'Remove recipient demo@mavera.local' }));
    expect(within(dialog).getByText(/No recipients/)).toBeInTheDocument();
  });

  it('shows an empty state when a filter matches nothing', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /^Status/ }));
    await user.click(screen.getByRole('option', { name: 'Ignored' }));
    expect(screen.getByText('No ignored alerts.')).toBeInTheDocument();
  });
});
