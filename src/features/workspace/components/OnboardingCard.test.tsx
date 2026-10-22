import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { accessRepository, budgetsRepository, sapAdminRepository, smartAlertsRepository, workspaceRepository } from '../../../data-access';
import { START_COACH_EVENT, START_PAGE_TOUR_EVENT } from '../../../shared/lib/assistantEvents';
import { closeConnectDialog, useConnectDialogRequest } from '../model/connectDialogStore';
import { OnboardingCard } from './OnboardingCard';

const ALL = { cloudCost: true, sapMonitoring: true };
const account = { name: 'Contoso Prod', subscriptionId: '11111111-2222-4333-8444-555555555555', tenantId: '66666666-7777-4888-9999-000000000000', clientId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' };

function Probe() {
  const location = useLocation();
  const dialog = useConnectDialogRequest();
  return <p data-testid="probe">{location.pathname}{location.search}{location.hash}|{dialog ? `dialog:${dialog.provider}` : 'no dialog'}</p>;
}

function renderCard(modules = ALL) {
  return render(<MemoryRouter initialEntries={['/']}><OnboardingCard modules={modules} /><Probe /></MemoryRouter>);
}
const probe = () => screen.getByTestId('probe').textContent;
const step = (title: string) => screen.getByText(title).closest('li') as HTMLElement;

beforeEach(() => {
  workspaceRepository.setProfile('empty');
  window.sessionStorage.clear();
});
afterEach(() => {
  act(() => { closeConnectDialog(); workspaceRepository.setProfile('populated'); });
});

describe('OnboardingCard', () => {
  it('lists the six steps with a reason each, and shows progress as "n of 6 done"', () => {
    renderCard();
    expect(screen.getByRole('heading', { name: 'Get started with Mavera' })).toBeInTheDocument();
    expect(screen.getByText('0 of 6 done')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: '0 of 6 steps done' })).toHaveAttribute('aria-valuenow', '0');
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(6);
    expect(items.map((li) => li.querySelector('strong')?.textContent)).toEqual([
      'Connect a cloud account', 'Connect an SAP system', 'Create a budget', 'Add alert recipients', 'Invite a teammate', 'Take the guided tour',
    ]);
    expect(screen.getByText(/Get warned before spend crosses your limit/)).toBeInTheDocument();
  });

  it('lists only the steps of the modules the organisation subscribes to', () => {
    renderCard({ cloudCost: true, sapMonitoring: false });
    expect(screen.getByText('0 of 5 done')).toBeInTheDocument();
    expect(screen.queryByText('Connect an SAP system')).not.toBeInTheDocument();
  });

  it('gives each step one primary button that goes straight to the action', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(within(step('Connect a cloud account')).getByRole('button', { name: 'Connect' }));
    expect(probe()).toBe('/|dialog:azure');
    closeConnectDialog();

    await user.click(within(step('Connect an SAP system')).getByRole('button', { name: 'Connect' }));
    expect(probe()).toBe('/|dialog:sap');

    await user.click(within(step('Create a budget')).getByRole('button', { name: 'Create budget' }));
    expect(probe()).toContain('/budgets?open=new');
  });

  it('sends the other steps to their pre-opened forms, and the tour to the page tour', async () => {
    const user = userEvent.setup();
    const onTour = vi.fn();
    window.addEventListener(START_PAGE_TOUR_EVENT, onTour);
    renderCard();

    await user.click(within(step('Take the guided tour')).getByRole('button', { name: 'Start tour' }));
    expect(onTour).toHaveBeenCalledTimes(1);
    window.removeEventListener(START_PAGE_TOUR_EVENT, onTour);
    expect(within(step('Take the guided tour')).queryByRole('button', { name: /Guide me/ })).not.toBeInTheDocument();

    await user.click(within(step('Add alert recipients')).getByRole('button', { name: 'Add recipients' }));
    expect(probe()).toContain('/budgets?open=add-channel#integrations');
  });

  it('opens the live coach for a step with "Guide me"', async () => {
    const user = userEvent.setup();
    const onCoach = vi.fn();
    window.addEventListener(START_COACH_EVENT, onCoach);
    renderCard();
    await user.click(within(step('Invite a teammate')).getByRole('button', { name: /Guide me/ }));
    await user.click(within(step('Connect a cloud account')).getByRole('button', { name: /Guide me/ }));
    window.removeEventListener(START_COACH_EVENT, onCoach);
    expect(onCoach.mock.calls.map(([event]) => (event as CustomEvent<{ flow: string }>).detail.flow)).toEqual(['invite-teammate', 'connect-azure']);
  });

  it('checks off finished steps, takes their buttons away and moves the progress on', () => {
    renderCard();
    act(() => { workspaceRepository.addConnectedAccount('azure', account); });
    expect(screen.getByText('1 of 6 done')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
    const done = step('Connect a cloud account');
    expect(done).toHaveClass('is-done');
    expect(within(done).getByText('(done)')).toBeInTheDocument();
    expect(within(done).queryByRole('button')).not.toBeInTheDocument();
    expect(within(step('Create a budget')).getByRole('button', { name: 'Create budget' })).toBeInTheDocument();
  });

  it('can be collapsed to its header and expanded again', async () => {
    const user = userEvent.setup();
    renderCard();
    const toggle = screen.getByRole('button', { name: 'Collapse the checklist' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await user.click(toggle);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.getByText('0 of 6 done')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expand the checklist' })).toHaveAttribute('aria-expanded', 'false');
    await user.click(screen.getByRole('button', { name: 'Expand the checklist' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
  });

  it('can be hidden, is remembered as hidden, and comes back when reopened', async () => {
    const user = userEvent.setup();
    renderCard();
    await user.click(screen.getByRole('button', { name: 'Hide the checklist' }));
    expect(screen.queryByRole('heading', { name: 'Get started with Mavera' })).not.toBeInTheDocument();
    expect(workspaceRepository.onboarding().dismissed).toBe(true);

    act(() => { workspaceRepository.dismissOnboarding(false); }); // "Show my checklist" and the profile menu do this
    expect(screen.getByRole('heading', { name: 'Get started with Mavera' })).toBeInTheDocument();
  });

  it('stays away from a populated organisation whose only open step is the tour, and from a finished checklist', () => {
    workspaceRepository.setProfile('populated');
    const { container, unmount } = renderCard();
    expect(workspaceRepository.onboarding().steps.filter((s) => !s.done).map((s) => s.id)).toEqual(['tour']);
    expect(container.querySelector('.mv-onboarding')).toBeNull();
    unmount();

    workspaceRepository.setProfile('empty');
    workspaceRepository.addConnectedAccount('azure', account);
    sapAdminRepository.destinations.add({ name: 'Prod', connectionType: 'ODATA', url: 'https://sap.example.com', systems: ['PRD'], timezone: 'UTC — UTC+0', client: '100', language: 'EN', username: 'svc' });
    budgetsRepository.createBudget({ name: 'Cap', target_amount: 1000, alert_threshold: 80, scope_type: 'organization', scope_value: '' });
    smartAlertsRepository.addRecipient('cost_threshold', 'finance@example.com');
    accessRepository.addMember({ userId: 'a', fullName: 'A', email: 'a@example.com', role: 'admin', roleId: 'owner', status: 'active', alertsEnabled: true, lastActiveAt: '2026-10-01T00:00:00.000Z' });
    accessRepository.addMember({ userId: 'b', fullName: 'B', email: 'b@example.com', role: 'member', roleId: 'viewer', status: 'active', alertsEnabled: true, lastActiveAt: '2026-10-01T00:00:00.000Z' });
    workspaceRepository.markTourDone();
    expect(workspaceRepository.onboarding().doneCount).toBe(6);
    const finished = renderCard();
    expect(finished.container.querySelector('.mv-onboarding')).toBeNull();
  });
});
