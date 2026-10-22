import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { accessRepository, budgetsRepository, organisationProfileRepository, sapAdminRepository, workspaceRepository } from '../../../data-access';
import { ConfirmProvider } from '../../../shared/ui/ConfirmProvider';
import { AccessProvider } from '../../access';
import type { AuthContextValue } from '../../auth';
import { closeConnectDialog } from '../../workspace';
import { SetupPage } from './SetupPage';

const useAuthMock = vi.fn<() => Partial<AuthContextValue>>();
vi.mock('../../auth/model/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../auth/model/AuthContext')>();
  return { ...actual, useAuth: () => useAuthMock() };
});

// The dashboard's data hook would call the (absent) API; the budget step only needs a spend forecast to suggest a limit from.
vi.mock('../../dashboard', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../dashboard')>();
  return { ...actual, useDashboardData: () => ({ summary: { data: { totals: { forecast: 17_400 }, monthly: [{ key: '2026-08', total: 1 }] }, loading: false, error: null } }) };
});

const owner = { id: 'demo-new-org-user', email: 'nora@northwind.example', name: 'Nora Newman', orgName: 'Northwind (new organisation)', role: 'admin' as const };
const ALL = { cloudCost: true, sapMonitoring: true };

function auth(over: Partial<AuthContextValue> = {}): Partial<AuthContextValue> {
  return {
    user: owner, loading: false, isAuthenticated: true, isDemoSession: true, modules: ALL, cloudAccess: ['azure', 'aws', 'btp', 'gcp'],
    invoiceOnly: false, accountLimits: { azure: 3, aws: 3, btp: 3 }, maxUsers: undefined, logout: vi.fn().mockResolvedValue(undefined), ...over,
  };
}

function Where() {
  const { pathname, hash } = useLocation();
  return <p data-testid="where">{pathname}{hash}</p>;
}

function setup(entry = '/setup', over: Partial<AuthContextValue> = {}) {
  useAuthMock.mockReturnValue(auth(over));
  render(
    <MemoryRouter initialEntries={[entry]}>
      <ConfirmProvider>
        <AccessProvider>
          <Routes>
            <Route path="/setup" element={<SetupPage />} />
            <Route path="*" element={<Where />} />
          </Routes>
        </AccessProvider>
      </ConfirmProvider>
    </MemoryRouter>,
  );
  return userEvent.setup();
}

const heading = () => screen.getByRole('heading', { level: 1 });
const rail = () => within(screen.getByRole('navigation', { name: 'Setup steps' }));

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  workspaceRepository.setProfile('empty');
  organisationProfileRepository.reset();
});
afterEach(() => {
  act(() => { closeConnectDialog(); workspaceRepository.setProfile('populated'); });
});

describe('SetupPage rail and progress', () => {
  it('groups the steps under Platform, Cloud Cost, SAP Monitoring and Finish, with the first step open', () => {
    setup();
    const groups = rail().getAllByRole('region').map((region) => region.getAttribute('aria-label'));
    expect(groups).toEqual(['Platform', 'Cloud Cost', 'SAP Monitoring', 'Finish']);
    for (const title of ['Company profile', 'Invite users', 'Notifications', 'Connect cloud accounts', 'First budget', 'SAP connection', 'Review']) {
      expect(rail().getByRole('button', { name: new RegExp(`^${title}`) })).toBeInTheDocument();
    }
    expect(rail().getByRole('button', { name: /^Company profile/ })).toHaveAttribute('aria-current', 'step');
    expect(heading()).toHaveTextContent('Company profile');
    expect(screen.getByText('Step 1 of 7 · Platform')).toBeInTheDocument();
  });

  it('shows the count, the percentage and about a minute per open step', () => {
    setup();
    expect(screen.getByText('0/6 · 0% · ~6 min left')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Setup progress' })).toHaveAttribute('aria-valuenow', '0');
  });

  it('derives completion from the stores: an account connected elsewhere completes its step', () => {
    workspaceRepository.addConnectedAccount('azure', { name: 'Prod', subscriptionId: 's', tenantId: 't', clientId: 'c' });
    setup('/setup#cloud');
    expect(rail().getByRole('button', { name: /^Connect cloud accounts/ })).toHaveTextContent('(complete)');
    expect(screen.getByText('1/6 · 17% · ~5 min left')).toBeInTheDocument();
    expect(screen.getByText('Complete')).toBeInTheDocument();
  });

  it('leaves out the group of a module the organisation does not subscribe to', () => {
    setup('/setup', { modules: { cloudCost: true, sapMonitoring: false } });
    expect(rail().getAllByRole('region').map((region) => region.getAttribute('aria-label'))).toEqual(['Platform', 'Cloud Cost', 'Finish']);
    expect(screen.getByText('0/5 · 0% · ~5 min left')).toBeInTheDocument();
  });
});

describe('SetupPage navigation', () => {
  it('opens the step named in the URL hash and moves with the rail, Previous and Next', async () => {
    const user = setup('/setup#invite');
    expect(heading()).toHaveTextContent('Invite users');
    await user.click(screen.getByRole('button', { name: /^Next: Notifications/ }));
    expect(heading()).toHaveTextContent('Notifications');
    await user.click(screen.getByRole('button', { name: /Previous/ }));
    expect(heading()).toHaveTextContent('Invite users');
    await user.click(rail().getByRole('button', { name: /^First budget/ }));
    expect(heading()).toHaveTextContent('First budget');
  });

  it('moves focus to the step heading when the step changes', async () => {
    const user = setup('/setup#profile');
    await user.click(rail().getByRole('button', { name: /^Notifications/ }));
    expect(heading()).toHaveFocus();
  });

  it('lands a bare /setup on the first step that is still open', async () => {
    organisationProfileRepository.save({ name: 'Northwind', phone: '', website: '', address: '', about: '', logoDataUrl: null });
    setup('/setup');
    await waitFor(() => expect(heading()).toHaveTextContent('Invite users'));
  });

  it('remembers "Skip for now" per person and goes to the dashboard', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Skip for now' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/');
    expect(JSON.parse(localStorage.getItem('mv-setup:demo-new-org-user') ?? '{}')).toMatchObject({ skipped: true });
  });

  it('has no theme switch in the header', () => {
    setup();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });
});

describe('SetupPage company profile', () => {
  it('counts characters, rejects an empty name and keeps the step', async () => {
    const user = setup();
    expect(screen.getByText('28/80')).toBeInTheDocument();
    await user.clear(screen.getByLabelText(/Company name/));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Enter your company name.')).toBeInTheDocument();
    expect(heading()).toHaveTextContent('Company profile');
    expect(organisationProfileRepository.get().savedAt).toBeNull();
  });

  it('shows a counter and an error for a field over its limit', async () => {
    const user = setup();
    await user.type(screen.getByLabelText(/Phone/), 'abc');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText(/phone number with 7 to 15 digits/)).toBeInTheDocument();
  });

  it('saves to the organisation, completes the step and moves on', async () => {
    const user = setup();
    await user.clear(screen.getByLabelText(/Company name/));
    await user.type(screen.getByLabelText(/Company name/), 'Northwind Traders');
    await user.type(screen.getByLabelText(/Website/), 'northwind.com');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(organisationProfileRepository.get()).toMatchObject({ name: 'Northwind Traders', website: 'https://northwind.com' });
    expect(heading()).toHaveTextContent('Invite users');
    expect(rail().getByRole('button', { name: /^Company profile/ })).toHaveTextContent('(complete)');
    expect(screen.getByText('Northwind Traders')).toBeInTheDocument();
  });

  it('saves when Enter is pressed in a field', async () => {
    const user = setup();
    await user.type(screen.getByLabelText(/Phone/), '+1 555 010 0199{Enter}');
    expect(organisationProfileRepository.get().savedAt).not.toBeNull();
    expect(heading()).toHaveTextContent('Invite users');
  });
});

describe('SetupPage steps', () => {
  it('adds several people by email and role', async () => {
    const user = setup('/setup#invite');
    await user.type(screen.getByLabelText('Work email'), 'nina.patel@northwind.example{Enter}');
    await user.type(screen.getByLabelText('Work email'), 'omar@northwind.example');
    await user.click(screen.getByRole('button', { name: 'Analyst' }));
    await user.click(screen.getByRole('button', { name: /Add person/ }));
    const members = accessRepository.getSnapshot().members;
    expect(members.map((m) => m.email)).toEqual(expect.arrayContaining(['nina.patel@northwind.example', 'omar@northwind.example']));
    expect(members.find((m) => m.email === 'omar@northwind.example')?.roleId).toBe('analyst');
    expect(within(screen.getByRole('list', { name: 'Members' })).getByText('Nina Patel')).toBeInTheDocument();
    expect(rail().getByRole('button', { name: /^Invite users/ })).toHaveTextContent('(complete)');
  });

  it('Continue adds the person typed in the box, and reports a bad address instead of moving on', async () => {
    const user = setup('/setup#invite');
    await user.type(screen.getByLabelText('Work email'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    expect(heading()).toHaveTextContent('Invite users');
    await user.clear(screen.getByLabelText('Work email'));
    await user.type(screen.getByLabelText('Work email'), 'li@northwind.example');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(heading()).toHaveTextContent('Notifications');
    expect(accessRepository.getSnapshot().members.some((m) => m.email === 'li@northwind.example')).toBe(true);
  });

  it('adds your own address as an alert channel when Continue is pressed', async () => {
    const user = setup('/setup#notifications');
    expect(screen.getByText('nora@northwind.example')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(budgetsRepository.listChannels()).toHaveLength(1);
    expect(budgetsRepository.listChannels()[0].email_addresses).toEqual(['nora@northwind.example']);
    expect(heading()).toHaveTextContent('Connect cloud accounts');
  });

  it('shows each provider as connected or not, and connects everything on sample data in one click', async () => {
    workspaceRepository.addConnectedAccount('aws', { name: 'Prod', region: 'us-east-1', accessKey: 'AKIA' });
    const user = setup('/setup#cloud');
    const providers = within(screen.getByRole('list', { name: 'Cloud providers' }));
    expect(providers.getByRole('button', { name: /^AWS, 1 connected/ })).toBeInTheDocument();
    expect(providers.getByRole('button', { name: /^Azure, not connected/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Set up everything with sample data' }));
    await waitFor(() => expect(providers.getByRole('button', { name: /^Azure, 1 connected/ })).toBeInTheDocument(), { timeout: 3000 });
    expect(sapAdminRepository.destinations.count()).toBe(1);
    expect(workspaceRepository.accountCount()).toBe(4);
    expect(screen.queryByRole('button', { name: 'Set up everything with sample data' })).not.toBeInTheDocument();
  });

  it('opens the shared connect dialog for a provider and stays on the wizard after connecting', async () => {
    const user = setup('/setup#cloud');
    await user.click(screen.getByRole('button', { name: /^Azure, not connected/ }));
    const dialog = await screen.findByRole('dialog', { name: /Connect Azure account/ });
    await user.click(within(dialog).getByRole('button', { name: 'Use sample credentials' }));
    await user.click(within(dialog).getByRole('button', { name: 'Connect' }));
    await waitFor(() => expect(workspaceRepository.accountCount()).toBe(1), { timeout: 3000 });
    expect(heading()).toHaveTextContent('Connect cloud accounts');
    expect(screen.getByRole('button', { name: /^Azure, 1 connected/ })).toBeInTheDocument();
  });

  it('suggests a first budget from the connected spend and creates it on Continue', async () => {
    workspaceRepository.addConnectedAccount('azure', { name: 'Prod', subscriptionId: 's', tenantId: 't', clientId: 'c' });
    const user = setup('/setup#budget');
    expect(screen.getByLabelText(/Monthly limit/)).toHaveValue('19500');
    expect(screen.getByLabelText(/Budget name/)).toHaveValue('Monthly cloud budget');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(budgetsRepository.listBudgets()).toHaveLength(1);
    expect(heading()).toHaveTextContent('SAP connection');
  });

  it('validates the budget form and keeps the step', async () => {
    const user = setup('/setup#budget');
    await user.clear(screen.getByLabelText(/Monthly limit/));
    await user.type(screen.getByLabelText(/Monthly limit/), '0');
    await user.click(screen.getByRole('button', { name: 'Create budget' }));
    expect(screen.getByText('Enter a monthly limit above zero.')).toBeInTheDocument();
    expect(budgetsRepository.listBudgets()).toHaveLength(0);
  });

  it('lists what is done and what is left on the review, and finishes at the dashboard', async () => {
    organisationProfileRepository.save({ name: 'Northwind', phone: '', website: '', address: '', about: '', logoDataUrl: null });
    const user = setup('/setup#review');
    const summary = within(screen.getByRole('list', { name: 'Setup summary' }));
    expect(summary.getByText('Company profile').closest('li')).toHaveTextContent('Done');
    expect(summary.getByRole('button', { name: /Start Connect cloud accounts/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Go to dashboard' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/');
  });
});

describe('SetupPage access', () => {
  it('is for owners and administrators: a viewer is told so', () => {
    setup('/setup', { user: { ...owner, id: 'demo-viewer-user', role: 'member', demoRoleId: 'viewer' } });
    expect(screen.getByRole('heading', { name: 'Setup is for owners and administrators' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Setup steps' })).not.toBeInTheDocument();
  });

  it('sends someone who is not signed in to the login page', () => {
    setup('/setup', { user: null, isAuthenticated: false });
    expect(screen.getByTestId('where')).toHaveTextContent('/login');
  });
});

describe('SetupPage at compact widths', () => {
  afterEach(() => { Reflect.deleteProperty(window, 'matchMedia'); });

  it('replaces the rail with a stepper and opens the step list in a drawer', async () => {
    window.matchMedia = ((query: string) => ({ matches: true, media: query, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, onchange: null, dispatchEvent: () => false })) as typeof window.matchMedia;
    const user = setup('/setup#profile');
    expect(screen.queryByRole('navigation', { name: 'Setup steps' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Invite users/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show all steps' }));
    const drawer = screen.getByRole('dialog', { name: 'Setup steps' });
    await user.click(within(drawer).getByRole('button', { name: /^Notifications/ }));
    expect(heading()).toHaveTextContent('Notifications');
    expect(screen.queryByRole('dialog', { name: 'Setup steps' })).not.toBeInTheDocument();
  });
});
