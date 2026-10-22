import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth, DEMO_PASSWORD, DEMO_EMAIL, DEMO_NEW_ORG_EMAIL } from './AuthContext';
import { DEMO_ACCOUNTS, demoAccountFor } from './demoAccounts';
import { budgetsRepository, getWorkspaceProfile, setWorkspaceProfile, workspaceRepository } from '../../../data-access';

vi.mock('../../../data-access/rest/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../data-access/rest/client')>();
  return { ...actual, api: { get: vi.fn(), post: vi.fn().mockResolvedValue({ data: {} }) } };
});

function Consumer() {
  const { user, isAuthenticated, isDemoSession, modules, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="authed">{String(isAuthenticated)}</span>
      <span data-testid="org">{user?.orgName ?? 'none'}</span>
      <span data-testid="role">{user?.demoRoleId ?? 'owner'}</span>
      <span data-testid="demo">{String(isDemoSession)}</span>
      <span data-testid="modules">{`${modules.cloudCost}/${modules.sapMonitoring}`}</span>
      <button onClick={() => void login(DEMO_NEW_ORG_EMAIL, DEMO_PASSWORD)}>new-org</button>
      <button onClick={() => void login(DEMO_EMAIL, DEMO_PASSWORD)}>sign-in-owner</button>
      <button onClick={() => void logout()}>logout</button>
    </div>
  );
}

describe('the "New organisation" demo account', () => {
  beforeEach(() => setWorkspaceProfile('populated'));
  afterEach(() => setWorkspaceProfile('populated'));

  it('is listed with every module subscribed, the Owner role and an empty workspace', () => {
    const account = demoAccountFor('NEW@mavera.local');
    expect(account).toBeDefined();
    expect(DEMO_ACCOUNTS.map((a) => a.label)).toContain('New organisation');
    expect(account).toMatchObject({ label: 'New organisation', email: 'new@mavera.local', workspace: 'empty' });
    expect(account?.user).toMatchObject({ orgName: 'Northwind (new organisation)', modules: { cloudCost: true, sapMonitoring: true }, role: 'admin' });
    expect(account?.user.demoRoleId).toBeUndefined();
    // No demo account other than this one starts empty.
    expect(DEMO_ACCOUNTS.filter((a) => a.workspace === 'empty')).toHaveLength(1);
  });

  it('signs in locally and starts the organisation with nothing connected', async () => {
    const user = userEvent.setup();
    render(<AuthProvider><Consumer /></AuthProvider>);
    await user.click(screen.getByText('new-org'));
    await waitFor(() => expect(screen.getByTestId('authed')).toHaveTextContent('true'));
    expect(screen.getByTestId('org')).toHaveTextContent('Northwind (new organisation)');
    expect(screen.getByTestId('role')).toHaveTextContent('owner');
    expect(screen.getByTestId('demo')).toHaveTextContent('true');
    expect(screen.getByTestId('modules')).toHaveTextContent('true/true');
    expect(getWorkspaceProfile()).toBe('empty');
    expect(workspaceRepository.accountCount()).toBe(0);
    expect(budgetsRepository.listBudgets()).toEqual([]);
  });

  it('never lets one demo login see another\'s changes, and a sign-out returns to the sample organisation', async () => {
    const user = userEvent.setup();
    render(<AuthProvider><Consumer /></AuthProvider>);
    await user.click(screen.getByText('new-org'));
    await waitFor(() => expect(screen.getByTestId('authed')).toHaveTextContent('true'));
    workspaceRepository.addConnectedAccount('azure', { name: 'Mine', subscriptionId: 's', tenantId: 't', clientId: 'c' });
    expect(workspaceRepository.accountCount('azure')).toBe(1);

    await user.click(screen.getByText('sign-in-owner'));
    await waitFor(() => expect(screen.getByTestId('org')).toHaveTextContent('Maitsys Demo Org'));
    expect(getWorkspaceProfile()).toBe('populated');
    expect(workspaceRepository.listAccounts('azure').map((a) => a.name)).not.toContain('Mine');
    expect(workspaceRepository.accountCount('azure')).toBe(2);

    await user.click(screen.getByText('new-org'));
    await waitFor(() => expect(screen.getByTestId('org')).toHaveTextContent('Northwind (new organisation)'));
    expect(workspaceRepository.accountCount()).toBe(0);

    await user.click(screen.getByText('logout'));
    await waitFor(() => expect(screen.getByTestId('authed')).toHaveTextContent('false'));
    expect(getWorkspaceProfile()).toBe('populated');
    expect(workspaceRepository.accountCount('azure')).toBe(2);
  });
});
