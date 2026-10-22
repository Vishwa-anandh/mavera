import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './AppShell';
import { AccessProvider } from '../../features/access';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';
import type { AuthContextValue } from '../../features/auth';

const useAuthMock = vi.fn<() => AuthContextValue>();

vi.mock('../../features/auth/model/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../features/auth/model/AuthContext')>();
  return { ...actual, useAuth: () => useAuthMock() };
});

vi.mock('./ProfileMenu', () => ({ ProfileMenu: () => <div>Profile menu stub</div> }));

function auth(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: { id: 'demo-owner', email: 'o@b.com', role: 'owner' },
    loading: false,
    isAuthenticated: true,
    isDemoSession: true,
    invoiceOnly: true,
    cloudAccess: ['azure', 'aws', 'gcp', 'btp'],
    features: { budgets: true, smartAlerts: true, syncLogs: true, recommendations: true, cloudManagement: true, invoices: true },
    accountLimits: { azure: 3, aws: 3, btp: 3 },
    modules: { cloudCost: true, sapMonitoring: true },
    maxUsers: undefined,
    planType: 'enterprise',
    subscriptionStartsAt: undefined,
    subscriptionExpiresAt: undefined,
    subscriptionActive: true,
    subscriptionNotes: undefined,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    unlockAccount: vi.fn(),
    sendOtp: vi.fn(),
    verifyOtp: vi.fn(),
    changePassword: vi.fn(),
    ...overrides,
  };
}

function Where() {
  const { pathname, search, hash } = useLocation();
  return <div data-testid="where">{`${pathname}${search}${hash}`}</div>;
}

function renderShell(path = '/') {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <AccessProvider>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="*" element={<Where />} />
            </Route>
          </Routes>
        </AccessProvider>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

const palette = () => screen.getByRole('dialog', { name: 'Search or run a command' });
const optionNames = () => within(palette()).getAllByRole('option').map((option) => option.getAttribute('aria-label') ?? '');
const status = () => within(palette()).getByRole('status');

async function open(user: ReturnType<typeof userEvent.setup>) {
  await user.keyboard('{Control>}k{/Control}');
  return within(palette()).getByRole('combobox');
}

beforeEach(() => {
  sessionStorage.clear();
  useAuthMock.mockReturnValue(auth());
});

describe('command palette', () => {
  it('labels the header button for both jobs', () => {
    renderShell();
    expect(screen.getByRole('button', { name: 'Search or run a command (Ctrl+K)' })).toHaveAttribute('title', 'Search or run a command (Ctrl+K)');
  });

  it('opens with Ctrl+K, focuses the box, and lists suggested commands above suggested pages', async () => {
    const user = userEvent.setup();
    renderShell();
    const box = await open(user);
    expect(box).toHaveFocus();
    const groups = within(palette()).getAllByRole('group').map((group) => group.getAttribute('aria-labelledby'));
    expect(groups).toEqual(['mv-search-group-suggested-actions', 'mv-search-group-suggested-pages']);
    expect(optionNames()[0]).toBe('Command: Connect Azure subscription, Cloud Cost › Azure');
    expect(status()).toHaveTextContent('Suggested commands and pages. Type to search.');
  });

  it('puts Connect Azure first for "az", with the Azure page after it, and Enter runs the command', async () => {
    const user = userEvent.setup();
    renderShell();
    const box = await open(user);
    await user.type(box, 'az');
    const names = optionNames();
    expect(names[0]).toMatch(/^Command: Connect Azure subscription/);
    expect(names.findIndex((name) => name.startsWith('Page: Azure Subscriptions'))).toBeGreaterThan(0);
    expect(within(palette()).getAllByRole('group').map((group) => group.getAttribute('aria-labelledby'))).toEqual(['mv-search-group-actions', 'mv-search-group-pages']);
    expect(within(palette()).getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Enter}');
    // The palette closes and the shared connect dialog opens in place, on the Azure credentials.
    expect(await screen.findByRole('dialog', { name: 'Connect Azure account' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Search or run a command' })).not.toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/$/);
  });

  it('shows commands for "budget" and runs Add budget', async () => {
    const user = userEvent.setup();
    renderShell();
    const box = await open(user);
    await user.type(box, 'budget');
    expect(optionNames().slice(0, 2)).toEqual(['Command: Add budget, Cloud Cost › Budgets & Alerts', 'Command: Add notification channel, Cloud Cost › Budgets & Alerts']);
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('where')).toHaveTextContent('/budgets?open=new');
  });

  it('keeps typing a page name landing on that page', async () => {
    const user = userEvent.setup();
    renderShell();
    const box = await open(user);
    await user.type(box, 'budgets');
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/budgets$/);
  });

  it.each([
    ['connect azure', 'Connect Azure account'],
    ['connect aws', 'Connect AWS account'],
    ['connect google', 'Connect Google Cloud project'],
    ['connect btp', 'Connect SAP BTP account'],
    ['connect sap system', 'Connect SAP system'],
  ])('"%s" opens the connect dialog "%s" in place, without leaving the page', async (typed, title) => {
    const user = userEvent.setup();
    renderShell('/budgets');
    const box = await open(user);
    await user.type(box, typed);
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('dialog', { name: title })).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/budgets$/);
  });

  it.each([
    ['add budget', '/budgets?open=new'],
    ['notification channel', '/budgets?open=add-channel#integrations'],
    ['upload invoice', '/invoices?open=upload'],
    ['security notes', '/sap/security-notes?open=upload'],
    ['add user', '/users?open=add-user'],
    ['add role', '/users?open=add-role#roles'],
    ['export cost', '/cloud/analytics?open=export'],
  ])('"%s" runs its command and goes to %s', async (typed, expected) => {
    const user = userEvent.setup();
    renderShell();
    const box = await open(user);
    await user.type(box, typed);
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('where')).toHaveTextContent(expected);
  });

  it('moves with the arrow keys, wrapping around, and Esc closes and returns focus to the header button', async () => {
    const user = userEvent.setup();
    renderShell();
    const opener = screen.getByRole('button', { name: 'Search or run a command (Ctrl+K)' });
    opener.focus();
    const box = await open(user);
    const options = () => within(palette()).getAllByRole('option');
    expect(box).toHaveAttribute('aria-activedescendant', options()[0].id);
    await user.keyboard('{ArrowDown}');
    expect(options()[1]).toHaveAttribute('aria-selected', 'true');
    expect(box).toHaveAttribute('aria-activedescendant', options()[1].id);
    await user.keyboard('{ArrowUp}{ArrowUp}');
    expect(options().at(-1)).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('keeps focus inside the dialog when Tab is pressed', async () => {
    const user = userEvent.setup();
    renderShell();
    const box = await open(user);
    await user.tab();
    expect(palette()).toContainElement(document.activeElement as HTMLElement);
    await user.tab({ shift: true });
    expect(box).toHaveFocus();
  });

  it('announces how many results there are, and when there are none', async () => {
    const user = userEvent.setup();
    renderShell();
    const box = await open(user);
    await user.type(box, 'budget');
    expect(status()).toHaveTextContent(/^\d+ results: 2 commands, \d+ pages?\.$/);
    await user.clear(box);
    await user.type(box, 'zzzz');
    expect(status()).toHaveTextContent('No results for zzzz.');
    expect(within(palette()).getByText('Nothing matches “zzzz”.')).toBeInTheDocument();
  });

  it('gives every result an accessible name and marks the highlighted one with its Enter hint', async () => {
    const user = userEvent.setup();
    renderShell();
    const box = await open(user);
    await user.type(box, 'user');
    const options = within(palette()).getAllByRole('option');
    for (const option of options) expect(option).toHaveAccessibleName(/^(Command|Page): /);
    expect(within(options[0]).getByText('Run')).toBeInTheDocument();
    expect(within(options[1]).queryByText('Run')).not.toBeInTheDocument();
  });

  describe('recents', () => {
    it('shows the last five things used when the box is empty, newest first', async () => {
      const user = userEvent.setup();
      renderShell();
      for (const typed of ['add budget', 'upload invoice', 'add user', 'connect azure', 'dark', 'add role']) {
        const box = await open(user);
        await user.type(box, typed);
        await user.keyboard('{Enter}');
      }
      await open(user);
      const labelled = within(palette()).getByRole('group', { name: 'Recent' });
      const recent = within(labelled).getAllByRole('option').map((option) => option.getAttribute('aria-label'));
      expect(recent).toHaveLength(5);
      expect(recent[0]).toMatch(/^Command: Add role/);
      expect(recent[4]).toMatch(/^Command: Upload invoice/);
      expect(recent.join('|')).not.toMatch(/Add budget/);
      expect(status()).toHaveTextContent('5 recent items and suggestions. Type to search.');
    });

    it('is remembered per user, and Enter on an empty box re-runs the latest', async () => {
      const user = userEvent.setup();
      const { unmount } = renderShell();
      const box = await open(user);
      await user.type(box, 'add user');
      await user.keyboard('{Enter}');
      unmount();
      renderShell('/');
      await open(user);
      await user.keyboard('{Enter}');
      expect(screen.getByTestId('where')).toHaveTextContent('/users?open=add-user');
      expect(JSON.parse(localStorage.getItem('mavera.palette.recents.demo-owner') ?? '[]')).toEqual(['action:add-user']);
      useAuthMock.mockReturnValue(auth({ user: { id: 'someone-else', email: 'x@b.com', role: 'owner' } }));
      expect(localStorage.getItem('mavera.palette.recents.someone-else')).toBeNull();
    });
  });

  describe('gating', () => {
    it('shows a viewer no Add user (or any command that changes something)', async () => {
      sessionStorage.setItem('mavera.previewRole', 'viewer');
      const user = userEvent.setup();
      renderShell();
      const box = await open(user);
      await user.type(box, 'add');
      expect(within(palette()).queryByRole('option', { name: /Add user/ })).not.toBeInTheDocument();
      expect(within(palette()).queryByRole('option', { name: /Add budget/ })).not.toBeInTheDocument();
      await user.clear(box);
      await user.type(box, 'theme');
      expect(within(palette()).getByRole('option', { name: /Switch to dark theme/ })).toBeInTheDocument();
    });

    it('offers Add user to the owner', async () => {
      const user = userEvent.setup();
      renderShell();
      const box = await open(user);
      await user.type(box, 'add user');
      expect(within(palette()).getByRole('option', { name: /Add user/ })).toBeInTheDocument();
    });

    it('drops commands of a module the organisation is not subscribed to', async () => {
      useAuthMock.mockReturnValue(auth({ modules: { cloudCost: false, sapMonitoring: true } }));
      const user = userEvent.setup();
      renderShell();
      const box = await open(user);
      await user.type(box, 'connect');
      expect(optionNames().filter((name) => name.startsWith('Command:'))).toEqual(['Command: Connect SAP system, SAP Monitoring › System Configuration']);
    });
  });

  describe('commands that act in place', () => {
    it('switches the theme and then offers the opposite', async () => {
      const user = userEvent.setup();
      renderShell();
      const before = document.documentElement.getAttribute('data-theme');
      const box = await open(user);
      await user.type(box, 'theme');
      const label = before === 'dark' ? /Switch to light theme/ : /Switch to dark theme/;
      await user.click(within(palette()).getByRole('option', { name: label }));
      await waitFor(() => expect(document.documentElement.getAttribute('data-theme')).toBe(before === 'dark' ? 'light' : 'dark'));
      const again = await open(user);
      await user.type(again, 'theme');
      expect(within(palette()).getByRole('option', { name: before === 'dark' ? /Switch to dark theme/ : /Switch to light theme/ })).toBeInTheDocument();
    });

    it('opens the assistant', async () => {
      const user = userEvent.setup();
      renderShell();
      const box = await open(user);
      await user.type(box, 'open assistant');
      await user.keyboard('{Enter}');
      await waitFor(() => expect(screen.getByRole('region', { name: 'Mavera AI' })).toBeInTheDocument());
    });

    it('starts the tour of the current page, and offers no tour on a page without one', async () => {
      const user = userEvent.setup();
      renderShell('/budgets');
      const box = await open(user);
      await user.type(box, 'tour');
      await user.keyboard('{Enter}');
      await waitFor(() => expect(screen.getByRole('button', { name: 'Close tour' })).toBeInTheDocument());
    });

    it('does not list the tour on a page without one', async () => {
      const user = userEvent.setup();
      renderShell('/no-such-page');
      const box = await open(user);
      await user.type(box, 'tour');
      expect(within(palette()).queryByRole('option', { name: /Start tour/ })).not.toBeInTheDocument();
    });
  });
});
