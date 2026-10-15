import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddUserDialog } from './AddUserDialog';
import type { OrgMember, SeatSummary } from '../model/userManagementTypes';

const existing: OrgMember[] = [
  { userId: 'u1', fullName: 'Existing One', email: 'taken@x.com', role: 'member', status: 'active' },
];
const open: SeatSummary = { limit: 5, used: 1, available: 4, full: false };
const providers = [{ id: 'azure' as const, label: 'Azure' }, { id: 'aws' as const, label: 'AWS' }];

function setup(seats: SeatSummary = open) {
  const onAdd = vi.fn();
  const onCancel = vi.fn();
  render(<AddUserDialog members={existing} seats={seats} providers={providers} onAdd={onAdd} onCancel={onCancel} />);
  return { onAdd, onCancel, user: userEvent.setup() };
}

describe('AddUserDialog', () => {
  it('says how many seats remain', () => {
    setup();
    expect(screen.getByText(/4 of 5 seats available/)).toBeInTheDocument();
  });

  it('adds an active member with only the ticked providers viewable', async () => {
    const { user, onAdd } = setup();
    await user.type(screen.getByLabelText('Full name'), '  Nina Patel ');
    await user.type(screen.getByLabelText('Work email'), 'Nina@X.com');
    await user.click(screen.getByLabelText('AWS'));
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
  });

  it('shows validation errors and does not add on bad input', async () => {
    const { user, onAdd } = setup();
    await user.type(screen.getByLabelText('Work email'), 'taken@x.com');
    await user.click(screen.getByRole('button', { name: 'Add user' }));
    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByText(/Enter the member/)).toBeInTheDocument();
    expect(screen.getByText(/already a member/)).toBeInTheDocument();
  });

  it('cannot submit when no seat is free', () => {
    setup({ limit: 1, used: 1, available: 0, full: true });
    expect(screen.getByRole('button', { name: 'Add user' })).toBeDisabled();
  });
});
