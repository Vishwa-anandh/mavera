import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { resetSapAdminStore, sapAdminRepository } from '../../../data-access';
import { ThemeProvider } from '../../../shared/theme/ThemeProvider';
import { SapAlertsPage } from './SapAlertsPage';

const renderPage = (path = '/') => render(<ThemeProvider><MemoryRouter initialEntries={[path]}><SapAlertsPage /></MemoryRouter></ThemeProvider>);
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
    expect(screen.queryByRole('tab', { name: /HANA Monitoring|SAP Monitoring/ })).not.toBeInTheDocument(); // the source switch is a toggle, not a tab
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

  it('has three tabs, shows only the active panel and follows the URL hash', async () => {
    const user = userEvent.setup();
    const { unmount } = renderPage();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Alerts', 'Settings', 'Recipients']);
    expect(screen.getByRole('tab', { name: 'Alerts' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Alerts');
    expect(screen.queryByRole('heading', { name: 'Alert recipients' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Settings' })).not.toBeInTheDocument(); // no header buttons any more

    await user.click(screen.getByRole('tab', { name: 'Recipients' }));
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Recipients');
    expect(screen.queryByText('Total Active')).not.toBeInTheDocument();
    unmount();

    renderPage('/#settings');
    expect(screen.getByRole('tab', { name: 'Settings' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { name: 'Anomaly Detection Settings' })).toBeInTheDocument();
  });

  it('edits Settings in its tab: validates, saves and resets; adjustments are counted', async () => {
    const user = userEvent.setup();
    renderPage('/#settings');
    const panel = screen.getByRole('tabpanel');
    const sensitivity = within(panel).getByLabelText(/Sensitivity/);
    expect(sensitivity).toHaveValue(3);

    await user.clear(sensitivity);
    await user.type(sensitivity, '9');
    await user.click(within(panel).getByRole('button', { name: 'Save settings' }));
    expect(within(panel).getByRole('alert')).toHaveTextContent('Enter a value from 1 to 6.');
    expect(sapAdminRepository.alerts.getSettings().sensitivity).toBe(3);

    await user.clear(sensitivity);
    await user.type(sensitivity, '2.5');
    await user.click(within(panel).getByRole('button', { name: 'Save settings' }));
    expect(sapAdminRepository.alerts.getSettings().sensitivity).toBe(2.5);

    await user.click(within(panel).getByRole('button', { name: 'Reset to defaults' }));
    expect(sensitivity).toHaveValue(3);
    expect(sapAdminRepository.alerts.getSettings().sensitivity).toBe(3);

    await user.click(screen.getByRole('tab', { name: 'Alerts' }));
    expect(screen.getByText(/Threshold adjustments:/)).toHaveTextContent('Threshold adjustments: 2');
  });

  it('keeps unsaved Settings edits when switching tabs and back', async () => {
    const user = userEvent.setup();
    renderPage('/#settings');
    const sensitivity = screen.getByLabelText(/Sensitivity/);
    await user.clear(sensitivity);
    await user.type(sensitivity, '4');
    await user.click(screen.getByRole('tab', { name: 'Recipients' }));
    await user.click(screen.getByRole('tab', { name: 'Settings' }));
    expect(screen.getByLabelText(/Sensitivity/)).toHaveValue(4);
    expect(sapAdminRepository.alerts.getSettings().sensitivity).toBe(3);
  });

  it('saves the HANA and SAP thresholds from the Settings tab', async () => {
    const user = userEvent.setup();
    renderPage('/#settings');
    const hana = screen.getByRole('region', { name: 'HANA Monitoring thresholds' });
    expect(screen.getByRole('region', { name: 'SAP Monitoring thresholds' })).toBeInTheDocument();
    const first = within(hana).getAllByRole('switch')[0];
    const before = first.getAttribute('aria-checked');
    await user.click(first);
    expect(first).toHaveAttribute('aria-checked', before === 'true' ? 'false' : 'true');
    await user.click(within(hana).getByRole('button', { name: 'Save HANA thresholds' }));
    expect(sapAdminRepository.alerts.getThresholds().hana[0].enabled).toBe(before !== 'true');
  });

  it('manages recipients in their tab: validates, adds and removes', async () => {
    const user = userEvent.setup();
    renderPage('/#recipients');
    const panel = screen.getByRole('tabpanel');
    const list = () => within(panel).getByRole('list', { name: 'Alert recipients' });
    expect(within(list()).getAllByRole('listitem')).toHaveLength(1);

    await user.type(within(panel).getByLabelText(/^Email address/), 'not-an-email');
    await user.click(within(panel).getByRole('button', { name: 'Add' }));
    expect(within(panel).getByRole('alert')).toHaveTextContent(/valid email/);

    await user.clear(within(panel).getByLabelText(/^Email address/));
    await user.type(within(panel).getByLabelText(/^Email address/), 'basis@maitsys.com');
    await user.click(within(panel).getByRole('button', { name: 'Add' }));
    expect(within(list()).getAllByRole('listitem')).toHaveLength(2);

    await user.click(within(panel).getByRole('button', { name: 'Remove recipient basis@maitsys.com' }));
    expect(within(list()).getAllByRole('listitem')).toHaveLength(1);
    await user.click(within(panel).getByRole('button', { name: 'Remove recipient demo@mavera.local' }));
    expect(within(panel).getByText(/No recipients/)).toBeInTheDocument();
  });

  it('shows an empty state when a filter matches nothing', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /^Status/ }));
    await user.click(screen.getByRole('option', { name: 'Ignored' }));
    expect(screen.getByText('No ignored alerts.')).toBeInTheDocument();
  });
});
