import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { accessRepository, auditRepository } from '../../../data-access';
import { AccessProvider } from '../../access';
import { ConfirmProvider } from '../../../shared/ui/ConfirmProvider';
import type { AuthContextValue } from '../../auth';
import { UserManagementPage } from './UserManagementPage';

const useAuthMock = vi.fn<() => Partial<AuthContextValue>>();
vi.mock('../../auth/model/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../auth/model/AuthContext')>();
  return { ...actual, useAuth: () => useAuthMock() };
});

const owner = { id: 'dev-preview-user', email: 'demo@mavera.local', name: 'Dev Preview', role: 'admin' as const };

function auth(over: Partial<AuthContextValue> = {}): Partial<AuthContextValue> {
  return { user: owner, isDemoSession: true, cloudAccess: ['azure', 'aws'], invoiceOnly: false, maxUsers: undefined, ...over };
}

function setup(tab: 'members' | 'roles' | 'permissions' = 'members') {
  render(
    <MemoryRouter initialEntries={[`/users#${tab}`]}>
      <ConfirmProvider>
        <AccessProvider><UserManagementPage /></AccessProvider>
      </ConfirmProvider>
    </MemoryRouter>,
  );
  return userEvent.setup();
}

async function pickRole(user: ReturnType<typeof userEvent.setup>, selectName: string | RegExp, option: string, scope: HTMLElement | null = null) {
  const root = scope ? within(scope) : screen;
  await user.click(root.getByRole('button', { name: selectName }));
  await user.click(screen.getByRole('option', { name: option }));
}

/** The permissions section shows one module at a time: pick its product area, then the module. */
async function openModule(user: ReturnType<typeof userEvent.setup>, area: string, module: string) {
  await user.click(within(screen.getByRole('navigation', { name: 'Product areas' })).getByRole('button', { name: new RegExp(`^${area}`) }));
  await user.click(within(screen.getByRole('navigation', { name: /^Modules for the/ })).getByRole('button', { name: new RegExp(`^${module}`) }));
}

const rolesTable = () => screen.getByRole('table', { name: /Roles, who holds them/ });
const lastAudit = () => auditRepository.getSnapshot()[0];

beforeEach(() => {
  accessRepository.reset();
  auditRepository.reset();
  sessionStorage.clear();
  useAuthMock.mockReturnValue(auth());
});

describe('UserManagementPage: members, roles and permissions in three tabs', () => {
  it('opens on Members and switches tabs, showing only the active panel', async () => {
    const user = setup();
    expect(screen.getByRole('heading', { name: 'User Management' })).toBeInTheDocument();
    const tabs = screen.getByRole('tablist', { name: 'User management sections' });
    expect(within(tabs).getAllByRole('tab').map((t) => t.textContent?.replace(/\d+$/, ''))).toEqual(['Members', 'Roles', 'Permissions']);
    expect(screen.getByRole('tab', { name: /Members/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { level: 2, name: 'Members' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: 'Roles' })).toBeNull();

    await user.click(screen.getByRole('tab', { name: /Roles/ }));
    expect(screen.getByRole('heading', { level: 2, name: 'Roles' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: 'Members' })).toBeNull();
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName(/Roles/);

    await user.click(screen.getByRole('tab', { name: /Permissions/ }));
    expect(screen.getByRole('heading', { level: 2, name: 'Permissions' })).toBeInTheDocument();
  });

  it('moves between tabs with the arrow keys', async () => {
    const user = setup();
    screen.getByRole('tab', { name: /Members/ }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: /Roles/ })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: /Permissions/ })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: /Members/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('opens the tab named in the URL hash', () => {
    setup('permissions');
    expect(screen.getByRole('tab', { name: /Permissions/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('hides the member search on the other tabs', async () => {
    const user = setup();
    expect(screen.getByRole('searchbox', { name: 'Search members' })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /Roles/ }));
    expect(screen.queryByRole('searchbox', { name: 'Search members' })).toBeNull();
  });

  it('lists the signed-in demo user as the Owner, with role and Elevate controls locked for them', () => {
    setup();
    const row = screen.getByRole('row', { name: /Dev Preview/ });
    expect(within(row).getByText('You')).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Role for Dev Preview' })).toBeDisabled();
    expect(within(row).getByText(/Your own role can’t be changed/)).toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: /Elevate/ })).toBeNull();
    expect(within(row).getByRole('button', { name: 'Deactivate Dev Preview' })).toBeDisabled();
  });
});

describe('members', () => {
  it('changes a member’s role from the select and records before and after', async () => {
    const user = setup();
    await pickRole(user, 'Role for Marcus Chen', 'Viewer');
    expect(screen.getByRole('button', { name: 'Role for Marcus Chen' })).toHaveTextContent('Viewer');
    expect(lastAudit()).toMatchObject({ action: 'Role changed', target: 'marcus.chen@maitsys.com', changes: [{ field: 'Role', before: 'Analyst', after: 'Viewer' }] });
  });

  it('never offers the Owner role to hand out', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Role for Marcus Chen' }));
    expect(screen.getByRole('option', { name: 'Owner' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('elevates a member to Admin only after confirming', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Elevate Marcus Chen to Admin' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Elevate Marcus Chen to Admin?');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Role for Marcus Chen' })).toHaveTextContent('Analyst');
    await user.click(screen.getByRole('button', { name: 'Elevate Marcus Chen to Admin' }));
    await user.click(screen.getByRole('button', { name: 'Elevate to Admin' }));
    expect(screen.getByRole('button', { name: 'Role for Marcus Chen' })).toHaveTextContent('Admin');
    expect(lastAudit().action).toBe('Member elevated to Admin');
    expect(screen.queryByRole('button', { name: 'Elevate Marcus Chen to Admin' })).toBeNull();
  });

  it('turns alert e-mails on and off per member', async () => {
    const user = setup();
    const sw = screen.getByRole('switch', { name: 'Alert e-mails for Priya Sharma' });
    expect(sw).toHaveAttribute('aria-checked', 'false');
    await user.click(sw);
    expect(screen.getByRole('switch', { name: 'Alert e-mails for Priya Sharma' })).toHaveAttribute('aria-checked', 'true');
    expect(lastAudit()).toMatchObject({ action: 'Alerts turned on', target: 'priya.sharma@maitsys.com' });
  });

  it('deactivates and reactivates', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Deactivate Marcus Chen' }));
    expect(screen.getByRole('button', { name: 'Activate Marcus Chen' })).toBeInTheDocument();
    expect(lastAudit().action).toBe('User deactivated');
    await user.click(screen.getByRole('button', { name: 'Activate Marcus Chen' }));
    expect(lastAudit().action).toBe('User activated');
  });

  it('adds a user with a role and shows them in the table', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Add user' }));
    const dialog = screen.getByRole('dialog', { name: 'Add user' });
    await user.type(within(dialog).getByLabelText('Full name'), 'Nina Patel');
    await user.type(within(dialog).getByLabelText('Work email'), 'nina@maitsys.com');
    await pickRole(user, /^Role/, 'SAP Operator (custom)', dialog);
    await user.click(within(dialog).getByRole('button', { name: 'Add user' }));
    expect(screen.getByRole('button', { name: 'Role for Nina Patel' })).toHaveTextContent('SAP Operator');
    expect(lastAudit()).toMatchObject({ action: 'User added', target: 'nina@maitsys.com' });
  });

  it('is read-only for a role without Edit on User Management', () => {
    useAuthMock.mockReturnValue(auth({ user: { id: 'real-viewer', email: 'v@x.com', name: 'Vee', role: 'member' }, isDemoSession: false }));
    accessRepository.ensureMember({ userId: 'real-viewer', fullName: 'Vee', email: 'v@x.com', role: 'member', roleId: 'viewer', status: 'active' });
    setup();
    expect(screen.queryByRole('button', { name: 'Add user' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Role for Marcus Chen' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Elevate Marcus Chen to Admin' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Deactivate Marcus Chen' })).toBeNull();
    expect(screen.getByRole('switch', { name: 'Alert e-mails for Marcus Chen' })).toBeDisabled();
    expect(screen.queryByRole('heading', { level: 2, name: 'Roles' })).toBeNull();
  });
});

describe('roles', () => {
  it('lists built-in and custom roles with member counts', () => {
    setup('roles');
    const table = rolesTable();
    expect(within(within(table).getByRole('row', { name: /Owner/ })).getByText('System')).toBeInTheDocument();
    const auditor = within(table).getByRole('row', { name: /Cost Auditor/ });
    expect(within(auditor).getByText('Custom')).toBeInTheDocument();
    expect(within(auditor).getByRole('cell', { name: '1' })).toBeInTheDocument();
    expect(within(within(table).getByRole('row', { name: /Viewer/ })).getByRole('cell', { name: '2' })).toBeInTheDocument();
    expect(within(within(table).getByRole('row', { name: /Admin/ })).queryByRole('button', { name: /Edit role/ })).toBeNull();
  });

  it('adds a role, refusing a duplicate name, and offers to start from an existing role', async () => {
    const user = setup('roles');
    await user.click(screen.getByRole('button', { name: 'Add role' }));
    const dialog = screen.getByRole('dialog', { name: 'Add role' });
    await user.type(within(dialog).getByLabelText(/Role name/), 'analyst');
    await user.click(within(dialog).getByRole('button', { name: 'Add role' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent(/already exists/);
    await user.clear(within(dialog).getByLabelText(/Role name/));
    await user.type(within(dialog).getByLabelText(/Role name/), 'FinOps');
    await pickRole(user, /Start from/, 'Copy of Viewer', dialog);
    await user.click(within(dialog).getByRole('button', { name: 'Add role' }));
    expect(screen.queryByRole('dialog', { name: 'Add role' })).toBeNull();
    // Creating a role opens its permissions, so the matrix is the next thing you see.
    expect(screen.getByRole('tab', { name: /Permissions/ })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('tab', { name: /Roles/ }));
    const row = within(rolesTable()).getByRole('row', { name: /FinOps/ });
    expect(within(row).getByText('Custom')).toBeInTheDocument();
    expect(lastAudit().action).toBe('Role created');
    // The matrix switches to the new role, which started from the Viewer grants.
    await user.click(screen.getByRole('tab', { name: /Permissions/ }));
    expect(screen.getByRole('button', { name: 'Role' })).toHaveTextContent('FinOps');
    expect(screen.getByRole('switch', { name: 'View: Dashboard' })).toHaveAttribute('aria-checked', 'true');
  });

  it('edits a custom role’s name', async () => {
    const user = setup('roles');
    await user.click(screen.getByRole('button', { name: 'Edit role Cost Auditor' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit role' });
    await user.clear(within(dialog).getByLabelText(/Role name/));
    await user.type(within(dialog).getByLabelText(/Role name/), 'Finance Auditor');
    await user.click(within(dialog).getByRole('button', { name: 'Save role' }));
    expect(within(rolesTable()).getByRole('button', { name: 'View role details: Finance Auditor' })).toBeInTheDocument();
    expect(lastAudit()).toMatchObject({ action: 'Role edited', changes: [{ field: 'Name', before: 'Cost Auditor', after: 'Finance Auditor' }] });
  });

  it('duplicates any role, including a built-in one', async () => {
    const user = setup('roles');
    await user.click(screen.getByRole('button', { name: 'Duplicate role Analyst' }));
    await user.click(screen.getByRole('tab', { name: /Roles/ }));
    const row = within(rolesTable()).getByRole('row', { name: /Copy of Analyst/ });
    expect(within(row).getByText('Custom')).toBeInTheDocument();
    expect(within(row).getByRole('cell', { name: '0' })).toBeInTheDocument();
    expect(lastAudit().action).toBe('Role duplicated');
  });

  it('blocks deleting a role members still hold, then deletes it with confirmation once free', async () => {
    const user = setup('roles');
    await user.click(screen.getByRole('button', { name: 'Delete role Cost Auditor' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(within(rolesTable()).getByRole('button', { name: 'View role details: Cost Auditor' })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /Members/ }));
    await pickRole(user, 'Role for Priya Sharma', 'Viewer');
    await user.click(screen.getByRole('tab', { name: /Roles/ }));
    await user.click(screen.getByRole('button', { name: 'Delete role Cost Auditor' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Delete the Cost Auditor role?');
    await user.click(screen.getByRole('button', { name: 'Delete role' }));
    expect(within(rolesTable()).queryByRole('button', { name: 'View role details: Cost Auditor' })).toBeNull();
    expect(lastAudit().action).toBe('Role deleted');
  });

  it('opens a details drawer with holders and grants', async () => {
    const user = setup('roles');
    await user.click(screen.getByRole('button', { name: 'View role details: SAP Operator' }));
    const drawer = screen.getByRole('dialog');
    expect(within(drawer).getByRole('heading', { name: 'SAP Operator' })).toBeInTheDocument();
    expect(within(drawer).getByText(/Tom Wu/)).toBeInTheDocument();
    expect(within(drawer).getByText('Jobs and Dumps')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('permissions', () => {
  it('shows a built-in role read-only (reason for screen readers) with a way to duplicate it', async () => {
    const user = setup('permissions');
    expect(screen.getByRole('switch', { name: 'View: Dashboard' })).toBeDisabled();
    expect(screen.getByRole('note')).toHaveTextContent(/built-in role/);
    await user.click(screen.getByRole('button', { name: 'Duplicate as a custom role' }));
    expect(screen.getByRole('button', { name: 'Role' })).toHaveTextContent('Copy of Analyst (custom)');
    expect(screen.getByRole('switch', { name: 'View: Dashboard' })).toBeEnabled();
  });

  it('shows the legend beside the role picker', () => {
    setup('permissions');
    expect(screen.getByRole('list', { name: 'Legend' })).toHaveTextContent('Granted');
    expect(screen.getByRole('list', { name: 'Legend' })).toHaveTextContent('Owner only');
  });

  it('collects edits in an unsaved bar that can be discarded or saved', async () => {
    const user = setup('permissions');
    await pickRole(user, 'Role', 'SAP Operator (custom)');
    await openModule(user, 'Budgets, alerts', 'Budgets');
    expect(screen.queryByRole('region', { name: 'Unsaved changes' })).toBeNull();
    await user.click(screen.getByRole('switch', { name: 'Delete: Budgets' }));
    const bar = screen.getByRole('region', { name: 'Unsaved changes' });
    expect(bar).toHaveTextContent('2 unsaved changes');
    await user.click(within(bar).getByRole('button', { name: 'Discard' }));
    expect(screen.queryByRole('region', { name: 'Unsaved changes' })).toBeNull();
    expect(screen.getByRole('switch', { name: 'Delete: Budgets' })).toHaveAttribute('aria-checked', 'false');

    await user.click(screen.getByRole('switch', { name: 'Edit: Budgets' }));
    await user.click(within(screen.getByRole('region', { name: 'Unsaved changes' })).getByRole('button', { name: 'Save changes' }));
    expect(screen.queryByRole('region', { name: 'Unsaved changes' })).toBeNull();
    expect(screen.getByRole('switch', { name: 'Edit: Budgets' })).toHaveAttribute('aria-checked', 'true');
    expect(lastAudit()).toMatchObject({ action: 'Permission matrix saved', target: 'Role · SAP Operator' });
    expect(lastAudit().changes).toEqual(expect.arrayContaining([{ field: 'Budgets', before: 'No access', after: 'View, Edit' }]));
  });

  it('asks before switching roles with unsaved changes', async () => {
    const user = setup('permissions');
    await pickRole(user, 'Role', 'SAP Operator (custom)');
    await openModule(user, 'Budgets, alerts', 'Budgets');
    await user.click(screen.getByRole('switch', { name: 'Edit: Budgets' }));
    await pickRole(user, 'Role', 'Viewer');
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Discard unsaved changes?');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Role' })).toHaveTextContent('SAP Operator');
    expect(screen.getByRole('region', { name: 'Unsaved changes' })).toBeInTheDocument();
    await pickRole(user, 'Role', 'Viewer');
    await user.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(screen.getByRole('button', { name: 'Role' })).toHaveTextContent('Viewer');
    expect(screen.queryByRole('region', { name: 'Unsaved changes' })).toBeNull();
  });

  it('explains the Owner role and shows ownership transfer as Owner-only', async () => {
    const user = setup('permissions');
    await pickRole(user, 'Role', 'Owner');
    expect(screen.getByRole('note')).toHaveTextContent(/always holds every permission/);
    await openModule(user, 'Administration', 'Ownership transfer');
    expect(screen.getByRole('switch', { name: 'Edit: Ownership transfer' })).toBeDisabled();
  });
});

describe('UserManagementPage: opening a dialog on arrival (command palette)', () => {
  const arriveAt = (url: string) => render(
    <MemoryRouter initialEntries={[url]}>
      <ConfirmProvider>
        <AccessProvider><UserManagementPage /></AccessProvider>
      </ConfirmProvider>
    </MemoryRouter>,
  );

  it('?open=add-user opens the Add user dialog', () => {
    arriveAt('/users?open=add-user');
    expect(screen.getByRole('dialog', { name: 'Add user' })).toBeInTheDocument();
  });

  it('?open=add-role#roles opens the Add role dialog on the Roles tab', () => {
    arriveAt('/users?open=add-role#roles');
    expect(screen.getByRole('tab', { name: /^Roles/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('dialog', { name: 'Add role' })).toBeInTheDocument();
  });

  it('does not open Add user for a role without Create on users', () => {
    sessionStorage.setItem('mavera.previewRole', 'viewer');
    arriveAt('/users?open=add-user');
    expect(screen.queryByRole('dialog', { name: 'Add user' })).not.toBeInTheDocument();
  });
});
