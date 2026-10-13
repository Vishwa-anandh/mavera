import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ForgotPasswordPage } from './ForgotPasswordPage';

const postMock = vi.fn();

vi.mock('../../../data-access/rest/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../data-access/rest/client')>();
  return { ...actual, api: { ...actual.api, post: (...args: unknown[]) => postMock(...args) } };
});

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it('submits the email and shows a confirmation message', async () => {
    postMock.mockResolvedValue({ data: {} });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    );
    await user.type(screen.getByLabelText('Email'), 'person@maitsys.com');
    await user.click(screen.getByRole('button', { name: 'Send reset instructions' }));

    expect(postMock).toHaveBeenCalledWith('/auth/forgot-password', { email: 'person@maitsys.com' });
    expect(
      await screen.findByText("If that email exists, we've sent password reset instructions."),
    ).toBeInTheDocument();
  });

  it('shows an error message when the request fails', async () => {
    postMock.mockRejectedValue(new Error('network down'));
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    );
    await user.type(screen.getByLabelText('Email'), 'person@maitsys.com');
    await user.click(screen.getByRole('button', { name: 'Send reset instructions' }));

    expect(await screen.findByText('We could not process that request. Please try again.')).toBeInTheDocument();
  });
});
