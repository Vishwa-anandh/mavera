import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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

  it('offers Light, Dark and System themes and remembers the choice', async () => {
    const { user } = setup();
    const group = screen.getByRole('radiogroup', { name: /Theme/ });
    expect(within(group).getAllByRole('radio').map((r) => r.textContent)).toEqual(['Light', 'Dark', 'System']);
    await user.click(within(group).getByRole('radio', { name: 'System' }));
    expect(within(group).getByRole('radio', { name: 'System' })).toHaveAttribute('aria-checked', 'true');
    expect(localStorage.getItem('mavera.theme')).toBe('system');
    await user.click(within(group).getByRole('radio', { name: 'Light' }));
    expect(localStorage.getItem('mavera.theme')).toBe('light');
  });

  it('switches table density and notes that motion follows the device', async () => {
    const { user } = setup();
    const group = screen.getByRole('radiogroup', { name: /Density/ });
    await user.click(within(group).getByRole('radio', { name: 'Compact' }));
    expect(within(group).getByRole('radio', { name: 'Compact' })).toHaveAttribute('aria-checked', 'true');
    expect(document.documentElement.dataset.density).toBe('compact');
    await user.click(within(group).getByRole('radio', { name: 'Comfortable' }));
    expect(screen.getByText(/reduced-motion setting/)).toBeInTheDocument();
  });

  describe('biometric sign-in', () => {
    afterEach(() => {
      delete (window as { PublicKeyCredential?: unknown }).PublicKeyCredential;
    });

    it('says it is not available on this device when WebAuthn is missing, and the switch is off and disabled', () => {
      setup();
      const sw = screen.getByRole('switch', { name: /Biometric sign-in/ });
      expect(sw).toBeDisabled();
      expect(sw).toHaveAttribute('aria-checked', 'false');
      expect(screen.getByText(/Not available on this device/)).toBeInTheDocument();
    });

    it('stores the preference locally when available, and is honest that it is a prototype', async () => {
      (window as { PublicKeyCredential?: unknown }).PublicKeyCredential = { isUserVerifyingPlatformAuthenticatorAvailable: () => Promise.resolve(true) };
      const { user } = setup();
      const sw = await screen.findByRole('switch', { name: /Biometric sign-in/ });
      expect(sw).toBeEnabled();
      expect(screen.getByText(/prototype capability/)).toHaveTextContent(/does not register a passkey/);
      await user.click(sw);
      expect(screen.getByRole('switch', { name: /Biometric sign-in/ })).toHaveAttribute('aria-checked', 'true');
      expect(localStorage.getItem('mavera.biometric.1')).toBe('on');
    });

    it('treats a device whose authenticator probe says no as unavailable', async () => {
      (window as { PublicKeyCredential?: unknown }).PublicKeyCredential = { isUserVerifyingPlatformAuthenticatorAvailable: () => Promise.resolve(false) };
      setup();
      await screen.findByText(/Not available on this device/);
      expect(screen.getByRole('switch', { name: /Biometric sign-in/ })).toBeDisabled();
    });
  });
});
