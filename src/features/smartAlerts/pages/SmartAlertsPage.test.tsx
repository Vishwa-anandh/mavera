import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { resetSmartAlertsStore } from '../../../data-access';
import { SmartAlertsPage } from './SmartAlertsPage';

function setup(tab = '') {
  render(<MemoryRouter initialEntries={[`/smart-alerts${tab}`]}><SmartAlertsPage /></MemoryRouter>);
  return userEvent.setup();
}

const kpi = (label: string) => screen.getByText(label, { selector: '.mv-kpi-label' }).closest('.mv-kpi') as HTMLElement;
const rows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1);

beforeEach(() => {
  resetSmartAlertsStore();
  sessionStorage.clear();
});

describe('SmartAlertsPage tabs', () => {
  it('opens on Alerts with Alerts, Recipients and Settings tabs, rendering only the active panel', async () => {
    const user = setup();
    const tabs = screen.getByRole('tablist', { name: 'Smart Alerts sections' });
    expect(within(tabs).getAllByRole('tab').map((t) => t.textContent)).toEqual(['Alerts', 'Recipients', 'Settings']);
    expect(screen.getByRole('tab', { name: 'Alerts' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Cost anomaly detection' })).toBeNull();

    await user.click(screen.getByRole('tab', { name: 'Settings' }));
    expect(screen.getByRole('heading', { name: 'Cost anomaly detection' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Settings');
  });

  it('selects the tab from the URL hash', () => {
    setup('#recipients');
    expect(screen.getByRole('tab', { name: 'Recipients' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { name: 'Cost and budget alerts' })).toBeInTheDocument();
  });
});

describe('SmartAlertsPage alerts', () => {
  it('shows the counters, a paged table of 10 and the page numbers', async () => {
    const user = setup();
    expect(kpi('Total Active')).toHaveTextContent('28');
    expect(kpi('Unread')).toHaveTextContent('12');
    expect(kpi('Critical')).toHaveTextContent('4');
    expect(rows()).toHaveLength(10);
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 1–10 of 28 alerts');
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 11–20 of 28 alerts');
    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page');
  });

  it('filters by status, type and provider, and clears the filters', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Critical alerts' }));
    expect(rows()).toHaveLength(4);
    await user.click(screen.getByRole('button', { name: 'Unusual spend' }));
    expect(rows()).toHaveLength(1);
    expect(rows()[0]).toHaveTextContent('Amazon Elastic Compute Cloud');
    await user.click(screen.getByRole('button', { name: 'Provider' }));
    await user.click(screen.getByRole('option', { name: 'Azure' }));
    expect(screen.getByText('No alerts match these filters.')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: /Clear filters|Show active alerts/ })[0]);
    expect(rows()).toHaveLength(10);
  });

  it('keeps the status, type and provider filters in the URL, so a link restores them and a tab switch keeps them', async () => {
    const user = setup('?status=critical&type=unusual_spend#alerts');
    expect(screen.getByRole('button', { name: 'Critical alerts' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Unusual spend' })).toHaveAttribute('aria-pressed', 'true');
    expect(rows()).toHaveLength(1);
    await user.click(screen.getByRole('tab', { name: 'Settings' }));
    await user.click(screen.getByRole('tab', { name: 'Alerts' }));
    expect(screen.getByRole('button', { name: 'Critical alerts' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getAllByRole('button', { name: /Clear filters|Show active alerts/ })[0]);
    expect(rows()).toHaveLength(10);
  });

  it('marks an alert read, resolves it and takes it out of the counters', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Mark Cost Spike alert on az-acc-1 as read' }));
    expect(kpi('Unread')).toHaveTextContent('11');
    await user.click(screen.getByRole('button', { name: 'Resolve Cost Spike alert on az-acc-1' }));
    expect(kpi('Total Active')).toHaveTextContent('27');
    expect(kpi('Critical')).toHaveTextContent('3');
    await user.click(screen.getByRole('button', { name: 'Resolved alerts' }));
    expect(rows().some((r) => r.textContent?.includes('Azure spend is 42% above'))).toBe(true);
  });

  it('ignores an alert: it leaves the counters, shows under Ignored and can be reopened', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Ignore Cost Spike alert on az-acc-1' }));
    expect(kpi('Total Active')).toHaveTextContent('27');
    expect(kpi('Critical')).toHaveTextContent('3');
    await user.click(screen.getByRole('button', { name: 'Ignored alerts' }));
    expect(rows()).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: 'Reopen Cost Spike alert on az-acc-1' }));
    expect(kpi('Total Active')).toHaveTextContent('28');
    expect(rows()).toHaveLength(2);
  });

  it('marks everything read with Mark All Read', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: /Mark All Read/ }));
    expect(kpi('Unread')).toHaveTextContent('0');
  });

  it('opens an alert in a drawer, marking it read, and resolves from there', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'View details: Cost Spike alert on az-acc-1' }));
    const drawer = screen.getByRole('dialog', { name: 'Cost Spike' });
    expect(within(drawer).getByText('$881.90')).toBeInTheDocument();
    expect(kpi('Unread')).toHaveTextContent('11');
    await user.click(within(drawer).getByRole('button', { name: 'Resolve' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(kpi('Total Active')).toHaveTextContent('27');
  });
});

describe('SmartAlertsPage recipients', () => {
  it('adds a valid address, rejects a bad or duplicate one and removes one', async () => {
    const user = setup('#recipients');
    const group = screen.getByRole('region', { name: 'Resource and service creation alerts' });
    await user.type(within(group).getByLabelText(/^Email address/), 'not-an-email');
    await user.click(within(group).getByRole('button', { name: 'Add' }));
    expect(within(group).getByRole('alert')).toHaveTextContent('Enter a valid email address');

    await user.clear(within(group).getByLabelText(/^Email address/));
    await user.type(within(group).getByLabelText(/^Email address/), 'ana@maitsys.com');
    await user.click(within(group).getByRole('button', { name: 'Add' }));
    expect(within(group).getByRole('list', { name: /recipients/ })).toHaveTextContent('ana@maitsys.com');
    expect(within(group).getByText(/1 custom recipient\./)).toBeInTheDocument();

    await user.type(within(group).getByLabelText(/^Email address/), 'ANA@maitsys.com');
    await user.click(within(group).getByRole('button', { name: 'Add' }));
    expect(within(group).getByRole('alert')).toHaveTextContent('already a recipient');

    await user.click(within(group).getByRole('button', { name: 'Remove recipient ana@maitsys.com' }));
    expect(within(group).getByText('No custom recipients. These alerts will not be emailed to anyone.')).toBeInTheDocument();
    await user.click(within(group).getByRole('button', { name: 'Use default' }));
    expect(within(group).getByText(/Using the default: all organisation members/)).toBeInTheDocument();
  });
});

describe('SmartAlertsPage settings', () => {
  it('validates, saves and resets the detection parameters, keeping unsaved edits across a tab switch', async () => {
    const user = setup('#settings');
    const spike = screen.getByLabelText(/^Spike threshold/);
    await user.clear(spike);
    await user.type(spike, '2');
    await user.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(screen.getByText('Enter a value from 5 to 500.')).toBeInTheDocument();

    await user.clear(spike);
    await user.type(spike, '45');
    await user.click(screen.getByRole('tab', { name: 'Recipients' }));
    await user.click(screen.getByRole('tab', { name: 'Settings' }));
    expect(screen.getByLabelText(/^Spike threshold/)).toHaveValue(45);

    await user.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(screen.queryByText('Enter a value from 5 to 500.')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Reset to defaults' }));
    expect(screen.getByLabelText(/^Spike threshold/)).toHaveValue(30);
  });

  it('lists the accounts whose threshold ignoring has widened', () => {
    setup('#settings');
    const list = screen.getByRole('list', { name: 'Accounts with a widened threshold' });
    expect(list).toHaveTextContent('aws-acc-2');
    expect(list).toHaveTextContent('35%');
    expect(list).toHaveTextContent('+5 pts · 1 ignore');
  });
});
