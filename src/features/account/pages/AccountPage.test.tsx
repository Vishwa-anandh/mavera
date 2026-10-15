import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AccountPage } from './AccountPage';
import { ThemeProvider } from '../../../shared/theme/ThemeProvider';
import type { AuthContextValue } from '../../auth';

const useAuthMock = vi.fn<() => Partial<AuthContextValue>>();
vi.mock('../../auth/model/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../auth/model/AuthContext')>();
  return { ...actual, useAuth: () => useAuthMock() };
});

function setup(changePassword = vi.fn().mockResolvedValue(undefined)) {
  useAuthMock.mockReturnValue({
    user: { id: '1', email: 'priya@acme.com', name: 'Priya Shah', orgName: 'Acme', role: 'admin' },
    modules: { cloudCost: true, sapMonitoring: true },
    planType: 'premium',
    changePassword,
  });
  render(<ThemeProvider><MemoryRouter><AccountPage /></MemoryRouter></ThemeProvider>);
  return { changePassword, user: userEvent.setup() };
}

describe('AccountPage', () => {
  it('shows identity, organisation and role as read-only text', () => {
    setup();
    expect(screen.getByText('Priya Shah')).toBeInTheDocument();
    expect(screen.getByText('Administrator')).toBeInTheDocument();
    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('SAP Monitoring, Cloud Cost Monitoring')).toBeInTheDocument();
  });

  it('validates the new password before calling the backend', async () => {
    const { changePassword, user } = setup();
    await user.type(screen.getByLabelText('Current password'), 'OldPassword1');
    await user.type(screen.getByLabelText('New password'), 'NewPassword1');
    await user.type(screen.getByLabelText('Confirm new password'), 'Different1');
    await user.click(screen.getByRole('button', { name: 'Change password' }));
    expect(screen.getByRole('alert')).toHaveTextContent('The new passwords don’t match.');
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('changes the password and confirms inline', async () => {
    const { changePassword, user } = setup();
    await user.type(screen.getByLabelText('Current password'), 'OldPassword1');
    await user.type(screen.getByLabelText('New password'), 'NewPassword1');
    await user.type(screen.getByLabelText('Confirm new password'), 'NewPassword1');
    await user.click(screen.getByRole('button', { name: 'Change password' }));
    expect(changePassword).toHaveBeenCalledWith('OldPassword1', 'NewPassword1');
    expect(await screen.findByRole('status')).toHaveTextContent('Password changed');
  });

  it('shows the backend’s error text when the change is refused', async () => {
    const { user } = setup(vi.fn().mockRejectedValue({ response: { data: { error: 'Your current password is incorrect.' } } }));
    await user.type(screen.getByLabelText('Current password'), 'Wrong1234');
    await user.type(screen.getByLabelText('New password'), 'NewPassword1');
    await user.type(screen.getByLabelText('Confirm new password'), 'NewPassword1');
    await user.click(screen.getByRole('button', { name: 'Change password' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Your current password is incorrect.');
  });

  it('switches appearance immediately', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(screen.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true');
  });
});
