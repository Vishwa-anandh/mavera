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
import { PermissionMatrix } from './PermissionMatrix';
import { PreviewBanner } from './PreviewBanner';
import { PreviewRoleMenu } from './PreviewRoleMenu';
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

describe('PermissionMatrix', () => {
  function Harness({ roleId = 'role-x', readOnly = false, initial = {} as PermissionMatrixValue }) {
    const [value, setValue] = useState(initial);
    return <PermissionMatrix roleId={roleId} roleName="Test role" value={value} onChange={setValue} readOnly={readOnly} />;
  }

  it('toggles a cell, turning View on with it, and exposes switch semantics', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const edit = screen.getByRole('switch', { name: 'Edit: Budgets' });
    expect(edit).toHaveAttribute('aria-checked', 'false');
    await user.click(edit);
    expect(screen.getByRole('switch', { name: 'Edit: Budgets' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('switch', { name: 'View: Budgets' })).toHaveAttribute('aria-checked', 'true');
  });

  it('shows not-applicable and restricted cells as dashed images, not switches', () => {
    render(<Harness />);
    expect(screen.getByRole('img', { name: 'Delete: Cost Overview: not applicable' })).toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Delete: Cost Overview' })).toBeNull();
    expect(screen.getByRole('img', { name: /Edit: Ownership transfer: only the Owner role/ })).toBeInTheDocument();
  });

  it('selects all in a row and all in a column, and clears them again', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Grant all actions on Budgets' }));
    for (const action of ['View', 'Create', 'Edit', 'Delete']) {
      expect(screen.getByRole('switch', { name: `${action}: Budgets` })).toHaveAttribute('aria-checked', 'true');
    }
    await user.click(screen.getByRole('button', { name: 'Remove all actions on Budgets' }));
    expect(screen.getByRole('switch', { name: 'View: Budgets' })).toHaveAttribute('aria-checked', 'false');

    await user.click(screen.getByRole('button', { name: 'Grant Export on every module' }));
    expect(screen.getByRole('switch', { name: 'Export: Cost Analytics' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: 'Remove Export on every module' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('is read-only for system roles: switches are disabled and no select-all controls appear', () => {
    render(<Harness roleId="viewer" readOnly initial={defaultMatrix('viewer')} />);
    expect(screen.getByRole('switch', { name: 'View: Dashboard' })).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'View: Dashboard' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.queryByRole('button', { name: /every module/ })).toBeNull();
  });

  it('describes the table for assistive technology', () => {
    render(<Harness />);
    expect(screen.getByRole('table', { name: /Permissions for the Test role role/ })).toBeInTheDocument();
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

  it('shows a friendly no-access state, never a blank page, and offers a way out', async () => {
    sessionStorage.setItem('mavera.previewRole', 'viewer');
    const user = userEvent.setup();
    renderWithAccess(
      <>
        <PreviewBanner />
        <RouteAccessGuard module="users"><p>Secret page</p></RouteAccessGuard>
      </>,
    );
    expect(screen.queryByText('Secret page')).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent('You don’t have access to this page');
    expect(screen.getByRole('alert')).toHaveTextContent('Viewer');
    expect(screen.getByRole('status')).toHaveTextContent('Previewing Mavera as Viewer');
    await user.click(screen.getAllByRole('button', { name: 'Exit preview' })[0]);
    expect(screen.getByText('Secret page')).toBeInTheDocument();
    expect(screen.queryByRole('status')).toBeNull();
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

describe('preview as role', () => {
  it('is offered only to the demo session, lists the roles and switches on click', async () => {
    const user = userEvent.setup();
    renderWithAccess(<><PreviewRoleMenu /><PreviewBanner /></>);
    const group = screen.getByRole('group', { name: /Preview as role/ });
    expect(within(group).getByRole('menuitemradio', { name: 'Owner (you)' })).toHaveAttribute('aria-checked', 'true');
    await user.click(within(group).getByRole('menuitemradio', { name: 'Analyst' }));
    expect(within(group).getByRole('menuitemradio', { name: 'Analyst' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Analyst');
  });

  it('is not available to a real (non-demo) session', () => {
    useAuthMock.mockReturnValue({ user: { id: 'real', email: 'r@x.com', role: 'owner' }, isDemoSession: false });
    renderWithAccess(<PreviewRoleMenu />);
    expect(screen.queryByRole('group')).toBeNull();
  });
});
