import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { systemRoles } from '../../access';
import { AddUserDialog, type AddUserDialogProps } from './AddUserDialog';
import type { OrgMember, SeatSummary } from '../model/userManagementTypes';

const existing: OrgMember[] = [
  { userId: 'u1', fullName: 'Existing One', email: 'taken@x.com', role: 'member', status: 'active' },
];
const open: SeatSummary = { limit: 5, used: 1, available: 4, full: false };
const providers = [{ id: 'azure' as const, label: 'Azure' }, { id: 'aws' as const, label: 'AWS' }];

function setup(seats: SeatSummary = open, extra: Partial<AddUserDialogProps> = {}) {
  const onAdd = vi.fn();
  const onCancel = vi.fn();
  render(<AddUserDialog members={existing} seats={seats} providers={providers} onAdd={onAdd} onCancel={onCancel} {...extra} />);
  return { onAdd, onCancel, user: userEvent.setup() };
}

const roleChips = () => within(screen.getByRole('group', { name: 'Role' }));

beforeEach(() => sessionStorage.clear());

describe('AddUserDialog', () => {
  it('says how many seats remain', () => {
    setup();
    expect(screen.getByText(/4 of 5 seats available/)).toBeInTheDocument();
  });

  it('adds an active member with only the ticked providers viewable', async () => {
    const { user, onAdd } = setup();
    await user.type(screen.getByLabelText(/Full name/), '  Nina Patel ');
    await user.type(screen.getByLabelText('Work email'), 'Nina@X.com');
    // The Viewer role may see both providers, so both start ticked; untick Azure.
    expect(screen.getByLabelText('Azure')).toBeChecked();
    expect(screen.getByLabelText('AWS')).toBeChecked();
    await user.click(screen.getByLabelText('Azure'));
    await user.click(screen.getByRole('button', { name: 'Add user' }));
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd.mock.calls[0][0]).toMatchObject({
      fullName: 'Nina Patel',
      email: 'nina@x.com',
      role: 'member',
      status: 'active',
      canViewAzure: false,
      canViewAws: true,
    });
    expect(onAdd.mock.calls[0][1]).toEqual({ addAnother: false });
  });

  it('needs only an e-mail address: the name is taken from it, and the e-mail field has the focus', async () => {
    const { user, onAdd } = setup();
    expect(screen.getByLabelText('Work email')).toHaveFocus();
    expect(screen.getByLabelText(/Full name/)).toHaveAttribute('placeholder', 'Taken from the e-mail address');
    await user.keyboard('priya.sharma@x.com');
    expect(screen.getByLabelText(/Full name/)).toHaveAttribute('placeholder', 'Priya Sharma');
    await user.keyboard('{Enter}');
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd.mock.calls[0][0]).toMatchObject({ fullName: 'Priya Sharma', email: 'priya.sharma@x.com', roleId: 'viewer' });
  });

  it('starts the “Can view” ticks from what the role may see, and starts over when the role changes', async () => {
    const custom = { id: 'role-ops', name: 'Ops', description: '', kind: 'custom' as const, permissions: { 'provider.aws': ['VIEW' as const] }, updatedAt: null, updatedBy: null };
    const { user, onAdd } = setup(open, { roles: [...systemRoles(), custom] });
    await user.click(roleChips().getByRole('button', { name: 'Ops (custom)' }));
    expect(screen.getByLabelText('Azure')).not.toBeChecked();
    expect(screen.getByLabelText('AWS')).toBeChecked();
    await user.click(screen.getByLabelText('Azure'));
    await user.click(roleChips().getByRole('button', { name: 'Analyst' }));
    expect(screen.getByLabelText('Azure')).toBeChecked();
    expect(screen.getByLabelText('AWS')).toBeChecked();
    await user.click(roleChips().getByRole('button', { name: 'Ops (custom)' }));
    await user.type(screen.getByLabelText('Work email'), 'ops@x.com');
    await user.click(screen.getByRole('button', { name: 'Add user' }));
    expect(onAdd.mock.calls[0][0]).toMatchObject({ roleId: 'role-ops', canViewAzure: false, canViewAws: true });
  });

  it('remembers the last role for the next time the dialog opens', async () => {
    const first = setup();
    await first.user.click(roleChips().getByRole('button', { name: 'Analyst' }));
    expect(roleChips().getByRole('button', { name: 'Analyst' })).toHaveAttribute('aria-pressed', 'true');
    document.body.innerHTML = '';
    setup();
    expect(roleChips().getByRole('button', { name: 'Analyst' })).toHaveAttribute('aria-pressed', 'true');
    expect(roleChips().getByRole('button', { name: 'Viewer' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('ignores a remembered role that is no longer offered', () => {
    sessionStorage.setItem('mv-remembered:users:add-user-role', JSON.stringify('role-deleted'));
    setup();
    expect(roleChips().getByRole('button', { name: 'Viewer' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps the dialog open for the next person when “Add another user” is on, clearing the e-mail and name but keeping the role', async () => {
    const { user, onAdd } = setup();
    await user.click(roleChips().getByRole('button', { name: 'Analyst' }));
    await user.click(screen.getByLabelText('Add another user after this one'));
    await user.type(screen.getByLabelText('Work email'), 'one@x.com');
    await user.keyboard('{Enter}');
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd.mock.calls[0][1]).toEqual({ addAnother: true });
    expect(screen.getByLabelText('Work email')).toHaveValue('');
    expect(screen.getByLabelText('Work email')).toHaveFocus();
    expect(roleChips().getByRole('button', { name: 'Analyst' })).toHaveAttribute('aria-pressed', 'true');
    await user.keyboard('two@x.com{Enter}');
    expect(onAdd).toHaveBeenCalledTimes(2);
    expect(onAdd.mock.calls[1][0]).toMatchObject({ email: 'two@x.com', roleId: 'analyst' });
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
  });

  it('shows validation errors and does not add on bad input', async () => {
    const { user, onAdd } = setup();
    await user.click(screen.getByRole('button', { name: 'Add user' }));
    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByText(/Enter a work email/)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Work email/), 'taken@x.com');
    await user.click(screen.getByRole('button', { name: 'Add user' }));
    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByText(/already a member/)).toBeInTheDocument();
  });

  it('cannot submit when no seat is free', () => {
    setup({ limit: 1, used: 1, available: 0, full: true });
    expect(screen.getByRole('button', { name: 'Add user' })).toBeDisabled();
  });

  it('defaults to the least-privileged built-in role and never offers Owner', () => {
    setup();
    expect(roleChips().getByRole('button', { name: 'Viewer' })).toHaveAttribute('aria-pressed', 'true');
    expect(roleChips().queryByRole('button', { name: 'Owner' })).toBeNull();
    expect(roleChips().getAllByRole('button').map((chip) => chip.textContent)).toEqual(['Admin', 'Analyst', 'Viewer']);
  });

  it('adds the member with the chosen role id and the matching legacy role; Admin needs no provider ticks', async () => {
    const { user, onAdd } = setup();
    await user.type(screen.getByLabelText(/Full name/), 'Ana Gomez');
    await user.type(screen.getByLabelText('Work email'), 'ana@x.com');
    await user.click(roleChips().getByRole('button', { name: 'Admin' }));
    expect(screen.queryByRole('group', { name: 'Can view' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Add user' }));
    expect(onAdd.mock.calls[0][0]).toMatchObject({ roleId: 'admin', role: 'admin', canViewAzure: true, canViewAws: true, alertsEnabled: true });
  });
});
