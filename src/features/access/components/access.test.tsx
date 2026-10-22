import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { useState } from 'react';
import { accessRepository, auditRepository } from '../../../data-access';
import type { AuthContextValue } from '../../auth';
import { AccessProvider } from '../model/AccessProvider';
import { useAccess } from '../model/accessContext';
import { Can } from './Can';
import { PermissionExplorer } from './PermissionExplorer';
import { RouteAccessGuard } from './RouteAccessGuard';
import { defaultMatrix, type PermissionMatrix as PermissionMatrixValue } from '../model/permissions';

const useAuthMock = vi.fn<() => Partial<AuthContextValue>>();
vi.mock('../../auth/model/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../auth/model/AuthContext')>();
  return { ...actual, useAuth: () => useAuthMock() };
});

const demoUser = { id: 'dev-preview-user', email: 'demo@mavera.local', name: 'Dev Preview', role: 'admin' as const };

function renderWithAccess(ui: React.ReactNode) {
  return render(
    <MemoryRouter>
      <AccessProvider>{ui}</AccessProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  accessRepository.reset();
  auditRepository.reset();
  sessionStorage.clear();
  useAuthMock.mockReturnValue({ user: demoUser, isDemoSession: true });
});

describe('PermissionExplorer', () => {
  function Harness({ roleId = 'role-x', readOnly = false, initial = {} as PermissionMatrixValue }) {
    const [value, setValue] = useState(initial);
    return <PermissionExplorer roleId={roleId} roleName="Test role" value={value} onChange={setValue} readOnly={readOnly} />;
  }
  /** Picks the product area that holds the module (when it is not already open), then the module. */
  const open = async (user: ReturnType<typeof userEvent.setup>, module: string, area?: string) => {
    if (area) await user.click(within(screen.getByRole('navigation', { name: 'Product areas' })).getByRole('button', { name: new RegExp(`^${area}`) }));
    await user.click(within(screen.getByRole('navigation', { name: /Modules for the Test role role/ })).getByRole('button', { name: new RegExp(`^${module}`) }));
  };

  it('shows product areas, then their modules, then the chosen module’s switches', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByRole('heading', { level: 3, name: 'Dashboard' })).toBeInTheDocument();
    await open(user, 'Budgets', 'Cloud Cost');
    expect(screen.getByRole('heading', { level: 3, name: 'Budgets' })).toBeInTheDocument();
    for (const action of ['View', 'Create', 'Edit', 'Delete']) expect(screen.getByRole('switch', { name: `${action}: Budgets` })).toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'View: Dashboard' })).toBeNull();
  });

  it('toggles a switch, turning View on with it, and shows the grant count beside the module', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await open(user, 'Budgets', 'Cloud Cost');
    const edit = screen.getByRole('switch', { name: 'Edit: Budgets' });
    expect(edit).toHaveAttribute('aria-checked', 'false');
    await user.click(edit);
    expect(screen.getByRole('switch', { name: 'Edit: Budgets' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('switch', { name: 'View: Budgets' })).toHaveAttribute('aria-checked', 'true');
    expect(within(screen.getByRole('navigation', { name: /Modules for the Test role role/ })).getByRole('button', { name: /^Budgets/ })).toHaveTextContent('2/4');
  });

  it('shows not-applicable and restricted actions as dashed images, not switches', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await open(user, 'Cost Overview', 'Cloud Cost');
    expect(screen.getByRole('img', { name: 'Delete: Cost Overview: not applicable' })).toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Delete: Cost Overview' })).toBeNull();
    await open(user, 'Ownership transfer', 'Administration');
    expect(screen.getByRole('img', { name: /Edit: Ownership transfer: not applicable/ })).toBeInTheDocument();
  });

  it('grants every action on a module, and clears them again', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await open(user, 'Budgets', 'Cloud Cost');
    await user.click(screen.getByRole('button', { name: 'Grant all actions on Budgets' }));
    for (const action of ['View', 'Create', 'Edit', 'Delete']) {
      expect(screen.getByRole('switch', { name: `${action}: Budgets` })).toHaveAttribute('aria-checked', 'true');
    }
    await user.click(screen.getByRole('button', { name: 'Remove all actions on Budgets' }));
    expect(screen.getByRole('switch', { name: 'View: Budgets' })).toHaveAttribute('aria-checked', 'false');
  });

  it('can be told which module to show, and reports the module the user picks', async () => {
    const user = userEvent.setup();
    const picked: string[] = [];
    render(<PermissionExplorer roleId="role-x" roleName="Test role" value={{}} selectedModuleId="budgets" onSelectModule={(id) => picked.push(id)} />);
    expect(screen.getByRole('heading', { level: 3, name: 'Budgets' })).toBeInTheDocument();
    await user.click(within(screen.getByRole('navigation', { name: /Modules for the Test role role/ })).getByRole('button', { name: /^Smart Alerts/ }));
    expect(picked).toEqual(['smartAlerts']);
    // Controlled: the parent decides, so the heading stays until it passes a new module.
    expect(screen.getByRole('heading', { level: 3, name: 'Budgets' })).toBeInTheDocument();
  });

  it('is read-only for system roles: switches are disabled and no grant-all control appears', () => {
    render(<Harness roleId="viewer" readOnly initial={defaultMatrix('viewer')} />);
    expect(screen.getByRole('switch', { name: 'View: Dashboard' })).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'View: Dashboard' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.queryByRole('button', { name: /Grant all|Remove all/ })).toBeNull();
  });
});

describe('Can and RouteAccessGuard', () => {
  it('renders children for the Owner and a fallback once a role without the permission is previewed', async () => {
    const user = userEvent.setup();
    function Switch() {
      const { setPreviewRole } = useAccess();
      return <button onClick={() => setPreviewRole('viewer')}>Preview viewer</button>;
    }
    renderWithAccess(
      <>
        <Switch />
        <Can module="users" action="CREATE" fallback={<span>No add</span>}>
          <span>Add user</span>
        </Can>
      </>,
    );
    expect(screen.getByText('Add user')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Preview viewer' }));
    expect(screen.getByText('No add')).toBeInTheDocument();
    expect(screen.queryByText('Add user')).toBeNull();
  });

  it('shows a friendly no-access state, never a blank page, with a way back to the dashboard', () => {
    useAuthMock.mockReturnValue({ user: { ...demoUser, demoRoleId: 'viewer' }, isDemoSession: true });
    accessRepository.ensureMember({ userId: demoUser.id, fullName: 'Dev', email: demoUser.email, role: 'member', roleId: 'viewer', status: 'active' });
    renderWithAccess(<RouteAccessGuard module="users"><p>Secret page</p></RouteAccessGuard>);
    expect(screen.queryByText('Secret page')).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent('You don’t have access to this page');
    expect(screen.getByRole('alert')).toHaveTextContent('Viewer');
    expect(screen.getByRole('link', { name: 'Go to dashboard' })).toHaveAttribute('href', '/');
  });

  it('opens routes with no module to everyone and records a real refusal in the audit trail', () => {
    useAuthMock.mockReturnValue({ user: { id: 'u-viewer', email: 'v@x.com', role: 'member' }, isDemoSession: false });
    accessRepository.ensureMember({ userId: 'u-viewer', fullName: 'V', email: 'v@x.com', role: 'member', roleId: 'viewer', status: 'active' });
    const before = auditRepository.getSnapshot().length;
    renderWithAccess(
      <>
        <RouteAccessGuard module={undefined}><p>Open page</p></RouteAccessGuard>
        <RouteAccessGuard module="audit"><p>Audit page</p></RouteAccessGuard>
      </>,
    );
    expect(screen.getByText('Open page')).toBeInTheDocument();
    expect(screen.queryByText('Audit page')).toBeNull();
    expect(auditRepository.getSnapshot().length).toBeGreaterThan(before);
    expect(auditRepository.getSnapshot()[0]).toMatchObject({ action: 'Access denied', result: 'denied' });
  });
});
