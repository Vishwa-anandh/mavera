import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ResetPasswordPage } from './ResetPasswordPage';

const postMock = vi.fn();
const navigateMock = vi.fn();

vi.mock('../../api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api')>();
  return { ...actual, api: { ...actual.api, post: (...args: unknown[]) => postMock(...args) } };
});

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    postMock.mockReset();
    navigateMock.mockReset();
  });

  it('shows a missing-token message when no token is in the query string', () => {
    renderAt('/reset-password');
    expect(screen.getByText('This reset link is missing its token. Request a new one.')).toBeInTheDocument();
  });

  it(
    'submits the new password with the token and navigates to /login on success',
    { timeout: 15000 },
    async () => {
      postMock.mockResolvedValue({ data: {} });
      const user = userEvent.setup();

      renderAt('/reset-password?token=abc123');
      await user.type(screen.getByLabelText('New password'), 'NewSecret1!');
      await user.type(screen.getByLabelText('Confirm new password'), 'NewSecret1!');
      await user.click(screen.getByRole('button', { name: 'Reset password' }));

      expect(postMock).toHaveBeenCalledWith('/auth/reset-password', { token: 'abc123', newPassword: 'NewSecret1!' });
      expect(navigateMock).toHaveBeenCalledWith('/login');
    },
  );

  it('shows the backend `error` text when the reset fails', { timeout: 15000 }, async () => {
    postMock.mockRejectedValue({ response: { status: 400, data: { error: 'Token expired' } } });
    const user = userEvent.setup();

    renderAt('/reset-password?token=abc123');
    await user.type(screen.getByLabelText('New password'), 'NewSecret1!');
    await user.type(screen.getByLabelText('Confirm new password'), 'NewSecret1!');
    await user.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(await screen.findByText('Token expired')).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('shows a mismatch error before submitting', { timeout: 15000 }, async () => {
    const user = userEvent.setup();

    renderAt('/reset-password?token=abc123');
    await user.type(screen.getByLabelText('New password'), 'NewSecret1!');
    await user.type(screen.getByLabelText('Confirm new password'), 'different');
    await user.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
    expect(postMock).not.toHaveBeenCalled();
  });
});
