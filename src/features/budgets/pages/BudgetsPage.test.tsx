import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { budgetsRepository } from '../../../data-access';
import { ConfirmProvider } from '../../../shared/ui/ConfirmProvider';
import { BudgetsPage } from './BudgetsPage';

const authState = vi.hoisted(() => ({ role: 'admin' as 'admin' | 'member' }));
vi.mock('../../auth', () => ({
  useAuth: () => ({ user: { id: '1', email: 'a@b.com', role: authState.role }, cloudAccess: ['azure', 'aws'], invoiceOnly: false }),
}));

function renderPage(tab?: 'budgets' | 'integrations') {
  return render(<MemoryRouter initialEntries={[tab ? `/budgets#${tab}` : '/budgets']}><ConfirmProvider><BudgetsPage /></ConfirmProvider></MemoryRouter>);
}

function toastMessages(): { messages: string[]; stop: () => void } {
  const messages: string[] = [];
  const listener = (e: Event) => messages.push((e as CustomEvent<{ message: string }>).detail.message);
  window.addEventListener('ccm:toast', listener);
  return { messages, stop: () => window.removeEventListener('ccm:toast', listener) };
}

describe('BudgetsPage', () => {
  beforeEach(() => {
    budgetsRepository.reset();
    authState.role = 'admin';
  });

  it('splits the page into Budgets and Alert integrations tabs and renders only the active panel', async () => {
    const user = userEvent.setup();
    renderPage();
    const tabs = screen.getByRole('tablist', { name: 'Budgets and alerts sections' });
    expect(within(tabs).getAllByRole('tab').map((t) => t.textContent?.replace(/\d+$/, ''))).toEqual(['Budgets', 'Alert integrations']);
    expect(screen.getByRole('tab', { name: /^Budgets/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName(/Budgets/);
    expect(screen.getByRole('region', { name: 'Create New Budget' })).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Notification channels' })).toBeNull();

    await user.click(screen.getByRole('tab', { name: /Alert integrations/ }));
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName(/Alert integrations/);
    expect(screen.getByRole('list', { name: 'Notification channels' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Create New Budget' })).toBeNull();
    expect(screen.queryByRole('list', { name: 'Budgets' })).toBeNull();
  });

  it('opens the tab named in the URL hash', () => {
    renderPage('integrations');
    expect(screen.getByRole('tab', { name: /Alert integrations/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('list', { name: 'Notification channels' })).toBeInTheDocument();
  });

  it('keeps a half-filled budget form when you switch tabs and back', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText('Budget Name'), 'Q4 Data');
    await user.click(screen.getByRole('tab', { name: /Alert integrations/ }));
    await user.click(screen.getByRole('tab', { name: /^Budgets/ }));
    expect(screen.getByLabelText('Budget Name')).toHaveValue('Q4 Data');
  });

  it('the "Add a channel" link on a budget with no active channel opens the Alert integrations tab', async () => {
    const user = userEvent.setup();
    budgetsRepository.setChannelEnabled('channel-1', false);
    renderPage();
    await user.click(within(screen.getByRole('region', { name: 'Create New Budget' })).getByRole('link', { name: 'Add a channel' }));
    expect(screen.getByRole('tab', { name: /Alert integrations/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('lists the channels with provider, scope and recipients or webhook host', () => {
    renderPage('integrations');
    const list = screen.getByRole('list', { name: 'Notification channels' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('Email');
    expect(rows[0]).toHaveTextContent('Global alert');
    expect(rows[0]).toHaveTextContent('finance@maitsys.com, ops@maitsys.com');
    expect(rows[1]).toHaveTextContent('Microsoft Teams');
    expect(rows[1]).toHaveTextContent('Budget-based');
    expect(rows[1]).toHaveTextContent('Tied to: Azure Production');
    expect(rows[1]).toHaveTextContent('maitsys.webhook.office.com');
  });

  it('adds an email channel from the dialog, turning each address into a chip on Enter', async () => {
    const user = userEvent.setup();
    const toasts = toastMessages();
    renderPage('integrations');
    await user.click(screen.getByRole('button', { name: 'Add channel' }));
    const dialog = screen.getByRole('dialog', { name: 'Add notification channel' });

    const input = within(dialog).getByLabelText('Recipients');
    await user.type(input, 'dev@maitsys.com{Enter}');
    await user.type(input, 'not-an-email{Enter}');
    expect(within(dialog).getByRole('alert')).toHaveTextContent('"not-an-email" is not a valid email address.');
    await user.clear(input);
    await user.type(input, 'qa@maitsys.com{Enter}');
    expect(within(dialog).getByRole('button', { name: 'Remove dev@maitsys.com' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Remove qa@maitsys.com' })).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Add channel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const added = budgetsRepository.listChannels().find((c) => c.email_addresses.includes('dev@maitsys.com'));
    expect(added).toMatchObject({ provider: 'email', alert_scope: 'global', enabled: true, email_addresses: ['dev@maitsys.com', 'qa@maitsys.com'] });
    expect(screen.getAllByRole('listitem').some((li) => li.textContent?.includes('dev@maitsys.com, qa@maitsys.com'))).toBe(true);
    expect(toasts.messages).toContain('Email channel added.');
    toasts.stop();
  });

  it('requires at least one recipient and validates the Teams webhook URL', async () => {
    const user = userEvent.setup();
    renderPage('integrations');
    await user.click(screen.getByRole('button', { name: 'Add channel' }));
    const dialog = screen.getByRole('dialog', { name: 'Add notification channel' });

    await user.click(within(dialog).getByRole('button', { name: 'Add channel' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Add at least one email address');

    await user.click(within(dialog).getByLabelText('Provider'));
    await user.click(screen.getByRole('option', { name: 'Microsoft Teams' }));
    const url = within(dialog).getByLabelText('Webhook URL');
    await user.type(url, 'https://example.com/hook');
    await user.click(within(dialog).getByRole('button', { name: 'Add channel' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('does not look like a Microsoft Teams webhook');
    expect(budgetsRepository.listChannels()).toHaveLength(3);

    await user.clear(url);
    await user.type(url, 'https://maitsys.webhook.office.com/webhookb2/abc@def/IncomingWebhook/x/y');
    await user.click(within(dialog).getByRole('button', { name: 'Add channel' }));
    expect(budgetsRepository.listChannels()).toHaveLength(4);
    expect(budgetsRepository.listChannels()[3]).toMatchObject({ provider: 'teams', alert_scope: 'global' });
  });

  it('ties a budget-based channel to chosen budgets and asks for at least one', async () => {
    const user = userEvent.setup();
    renderPage('integrations');
    await user.click(screen.getByRole('button', { name: 'Add channel' }));
    const dialog = screen.getByRole('dialog', { name: 'Add notification channel' });
    await user.type(within(dialog).getByLabelText('Recipients'), 'fin@maitsys.com{Enter}');
    await user.click(within(dialog).getByLabelText('Alert scope'));
    await user.click(screen.getByRole('option', { name: /Budget-based alert/ }));

    await user.click(within(dialog).getByRole('button', { name: 'Add channel' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Choose at least one budget.');

    await user.click(within(dialog).getByRole('checkbox', { name: 'AWS Q3 Engineering' }));
    await user.click(within(dialog).getByRole('button', { name: 'Add channel' }));
    expect(budgetsRepository.listChannels()[3]).toMatchObject({ alert_scope: 'budget_specific', budget_ids: ['budget-3'] });
  });

  it('enables and disables a channel', async () => {
    const user = userEvent.setup();
    renderPage('integrations');
    const toggle = screen.getByRole('switch', { name: 'Send alerts to Email finance@maitsys.com, ops@maitsys.com' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    await user.click(toggle);
    expect(screen.getByRole('switch', { name: 'Send alerts to Email finance@maitsys.com, ops@maitsys.com' })).toHaveAttribute('aria-checked', 'false');
    expect(budgetsRepository.listChannels()[0].enabled).toBe(false);
    // The sample data already has one paused channel; this one makes two.
    expect(screen.getAllByText('Paused')).toHaveLength(2);
  });

  it('removes a channel only after confirming, and shows "No channels added" with a call to action when none are left', async () => {
    const user = userEvent.setup();
    renderPage('integrations');
    const removeButtons = () => screen.getAllByRole('button', { name: /^Remove (Email|Microsoft Teams)/ });
    await user.click(removeButtons()[0]);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(budgetsRepository.listChannels()).toHaveLength(3);

    for (let i = 0; i < 3; i += 1) {
      await user.click(removeButtons()[0]);
      await user.click(screen.getByRole('button', { name: 'Remove channel' }));
    }
    expect(budgetsRepository.listChannels()).toHaveLength(0);
    expect(screen.getByRole('heading', { name: 'No channels added' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add your first channel' }));
    expect(screen.getByRole('dialog', { name: 'Add notification channel' })).toBeInTheDocument();
  });

  it('shows on each budget which channels will be notified', () => {
    renderPage();
    const budgets = screen.getByRole('list', { name: 'Budgets' });
    const [orgWide, azure, aws] = within(budgets).getAllByRole('listitem');
    expect(orgWide).toHaveTextContent('Notifies Email (finance@maitsys.com, ops@maitsys.com)');
    expect(azure).toHaveTextContent('Microsoft Teams (maitsys.webhook.office.com)');
    expect(azure).toHaveTextContent('Email (finance@maitsys.com, ops@maitsys.com)');
    // The AWS budget's own channel is paused, so only the global one counts.
    expect(aws).toHaveTextContent('Notifies Email (finance@maitsys.com, ops@maitsys.com)');
    expect(aws).not.toHaveTextContent('aws-owners@maitsys.com');
  });

  it('previews the channels a new budget will notify, and ties chosen budget-based channels to it', async () => {
    const user = userEvent.setup();
    const toasts = toastMessages();
    renderPage();
    const form = screen.getByRole('region', { name: 'Create New Budget' });
    expect(within(form).getByText('This budget will notify 1 channel.')).toBeInTheDocument();
    await user.click(within(form).getByRole('checkbox', { name: /Also notify Microsoft Teams/ }));
    expect(within(form).getByText('This budget will notify 2 channels.')).toBeInTheDocument();

    await user.type(within(form).getByLabelText('Budget Name'), 'Q4 Data');
    await user.type(within(form).getByLabelText('Target Amount ($)'), '9000');
    await user.click(within(form).getByRole('button', { name: 'Add Budget' }));

    const created = budgetsRepository.listBudgets().find((b) => b.name === 'Q4 Data');
    expect(created).toBeDefined();
    expect(budgetsRepository.listChannels().find((c) => c.id === 'channel-2')?.budget_ids).toContain(created?.id);
    expect(toasts.messages).toContain('Budget created. Alerts will notify 2 channels.');
    expect(screen.getByText('Q4 Data').closest('li')).toHaveTextContent('Microsoft Teams (maitsys.webhook.office.com)');
    toasts.stop();
  });

  it('says so when a new budget would notify nobody', async () => {
    budgetsRepository.setChannelEnabled('channel-1', false);
    renderPage();
    const form = screen.getByRole('region', { name: 'Create New Budget' });
    expect(within(form).getByText(/No active channel is set up/)).toBeInTheDocument();
    expect(within(form).getByRole('link', { name: 'Add a channel' })).toHaveAttribute('href', '/budgets#integrations');
  });

  it('lets a read-only member see the channels but not change them', () => {
    authState.role = 'member';
    renderPage('integrations');
    expect(screen.queryByRole('button', { name: 'Add channel' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Remove / })).not.toBeInTheDocument();
    expect(screen.getAllByRole('switch').every((s) => s.hasAttribute('disabled'))).toBe(true);
    expect(screen.getByText(/you don't have full access to manage integrations/)).toBeInTheDocument();
  });

  it('shows a read-only member the read-only notice instead of the create form', () => {
    authState.role = 'member';
    renderPage();
    expect(screen.getByText('Read-only mode')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Budget' })).not.toBeInTheDocument();
  });
});

describe('BudgetsPage: opening a form on arrival (command palette)', () => {
  const arriveAt = (url: string) => render(<MemoryRouter initialEntries={[url]}><ConfirmProvider><BudgetsPage /></ConfirmProvider></MemoryRouter>);
  beforeEach(() => {
    budgetsRepository.reset();
    authState.role = 'admin';
  });

  it('?open=new focuses the budget name', () => {
    arriveAt('/budgets?open=new');
    expect(screen.getByLabelText('Budget Name')).toHaveFocus();
  });

  it('?open=add-channel#integrations opens the Add channel dialog on the integrations tab', () => {
    arriveAt('/budgets?open=add-channel#integrations');
    expect(screen.getByRole('tab', { name: /Alert integrations/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('dialog', { name: 'Add notification channel' })).toBeInTheDocument();
  });

  it('does not open the dialog for a member who cannot manage integrations', () => {
    authState.role = 'member';
    arriveAt('/budgets?open=add-channel#integrations');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens nothing without a request', () => {
    arriveAt('/budgets#integrations');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
