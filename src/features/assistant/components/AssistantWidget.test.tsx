import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { workspaceRepository } from '../../../data-access';
import { requestCoachFlow, requestShowChecklist } from '../../../shared/lib/assistantEvents';
import { closeConnectDialog, useConnectDialogRequest } from '../../workspace/model/connectDialogStore';
import type { AuthContextValue } from '../../auth';
import { AssistantWidget } from './AssistantWidget';

const useAuthMock = vi.fn<() => Pick<AuthContextValue, 'modules' | 'user'>>();
vi.mock('../../auth/model/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../auth/model/AuthContext')>();
  return { ...actual, useAuth: () => useAuthMock() };
});

const ALL = { cloudCost: true, sapMonitoring: true };

function Probe() {
  const location = useLocation();
  const navigate = useNavigate();
  const dialog = useConnectDialogRequest();
  return (
    <>
      <p data-testid="probe">{location.pathname}{location.search}{location.hash}|{dialog ? `dialog:${dialog.provider}` : 'no dialog'}</p>
      <button type="button" onClick={() => navigate('/users')}>go to users</button>
    </>
  );
}

function renderWidget(path = '/') {
  return render(<MemoryRouter initialEntries={[path]}><AssistantWidget /><Probe /></MemoryRouter>);
}
const probe = () => screen.getByTestId('probe').textContent;

beforeEach(() => {
  window.localStorage.clear();
  window.matchMedia = ((query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
  HTMLElement.prototype.scrollIntoView = vi.fn();
  workspaceRepository.setProfile('empty');
  useAuthMock.mockReturnValue({ modules: ALL, user: { id: 'new-user', email: 'new@mavera.local', name: 'Nora Newman', role: 'owner' } as never });
});
afterEach(() => {
  act(() => { closeConnectDialog(); workspaceRepository.setProfile('populated'); });
  vi.restoreAllMocks();
});

describe('AssistantWidget getting started', () => {
  it('starts a live guide on request, goes to the page its first step names, and keeps the guide there', async () => {
    const user = userEvent.setup();
    renderWidget('/');
    act(() => requestCoachFlow('create-budget'));

    expect(await screen.findByRole('dialog', { name: 'Create a budget' })).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    expect(probe()).toContain('/budgets?open=new');

    // a live guide follows the person; a page tour would have been closed by this
    await user.click(screen.getByRole('button', { name: 'go to users' }));
    expect(screen.getByRole('dialog', { name: 'Create a budget' })).toBeInTheDocument();
  });

  it('opens the shared connect dialog for a connect guide', async () => {
    renderWidget('/');
    act(() => requestCoachFlow('connect-aws'));
    expect(await screen.findByRole('dialog', { name: 'Connect AWS' })).toBeInTheDocument();
    expect(probe()).toBe('/|dialog:aws');
  });

  it('ignores a request for a guide of a module the organisation lacks, and for an unknown guide', () => {
    useAuthMock.mockReturnValue({ modules: { cloudCost: true, sapMonitoring: false }, user: { id: 'u', email: 'a@b.c', role: 'owner' } as never });
    renderWidget('/');
    act(() => { requestCoachFlow('connect-sap'); requestCoachFlow('nonsense'); });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('starts a guide from a typed request and shows the chat answer with it', async () => {
    const user = userEvent.setup();
    renderWidget('/');
    await user.click(screen.getByRole('button', { name: 'Open AI Assistant' }));
    await user.type(screen.getByLabelText('Ask the AI Assistant'), 'help me connect azure{Enter}');
    expect(await screen.findByRole('dialog', { name: 'Connect Azure' })).toBeInTheDocument();
    expect(probe()).toBe('/|dialog:azure');
    // the chat closed to make room for the guide, and reopening shows what was said
    await user.click(screen.getByRole('button', { name: 'Open AI Assistant' }));
    expect(screen.getByText(/Starting the live guide: Connect Azure/)).toBeInTheDocument();
  });

  it('brings a hidden checklist back and goes to the dashboard when asked to show it', () => {
    workspaceRepository.dismissOnboarding();
    renderWidget('/budgets');
    act(() => requestShowChecklist());
    expect(workspaceRepository.onboarding().dismissed).toBe(false);
    expect(probe()).toBe('/|no dialog');
  });

  it('lists the getting-started flows in the Tour picker, even on a page with no tour of its own', async () => {
    const user = userEvent.setup();
    renderWidget('/no-such-page');
    await user.click(screen.getByRole('button', { name: 'Open AI Assistant' }));
    await user.click(screen.getByRole('button', { name: 'Tour' }));
    expect(screen.getByRole('heading', { name: 'Getting started' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Invite a teammate/ }));
    expect(await screen.findByRole('dialog', { name: 'Invite a teammate' })).toBeInTheDocument();
    expect(probe()).toContain('/users?open=add-user');
  });
});

describe('AssistantWidget first-visit welcome', () => {
  it('welcomes a new organisation once, offers the checklist without running it, and starts the first step on request', async () => {
    const user = userEvent.setup();
    renderWidget('/');
    await user.click(screen.getByRole('button', { name: 'Open AI Assistant' }));
    expect(screen.getByText(/Welcome to Mavera, Nora\./)).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Connect Azure' })).not.toBeInTheDocument(); // no auto-run
    expect(screen.getByRole('button', { name: 'Set me up' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Start the checklist' }));
    expect(await screen.findByRole('dialog', { name: 'Connect Azure' })).toBeInTheDocument();
  });

  it('is gone for good once put off', async () => {
    const user = userEvent.setup();
    renderWidget('/');
    await user.click(screen.getByRole('button', { name: 'Open AI Assistant' }));
    await user.click(screen.getByRole('button', { name: 'Not now' }));
    expect(screen.queryByText(/Welcome to Mavera/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show my checklist' })).toBeInTheDocument();
  });

  it('is not shown on the next visit', async () => {
    const user = userEvent.setup();
    renderWidget('/').unmount();
    renderWidget('/');
    await user.click(screen.getByRole('button', { name: 'Open AI Assistant' }));
    expect(screen.queryByText(/Welcome to Mavera/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Set me up' })).toBeInTheDocument(); // the setup chips stay while there is something to set up
  });

  it('is not shown to an organisation that is already set up, which gets no setup chips either', async () => {
    const user = userEvent.setup();
    workspaceRepository.setProfile('populated');
    renderWidget('/');
    await user.click(screen.getByRole('button', { name: 'Open AI Assistant' }));
    expect(screen.queryByText(/Welcome to Mavera/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Set me up' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'System health' })).toBeInTheDocument();
  });
});
