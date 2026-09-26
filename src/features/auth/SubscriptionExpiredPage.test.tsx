import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import { SubscriptionExpiredPage } from './SubscriptionExpiredPage';
import { TOKEN_KEY } from '../../api';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  return { ...actual, default: { ...actual.default, get: vi.fn() } };
});

describe('SubscriptionExpiredPage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    navigateMock.mockReset();
    vi.mocked(axios.get).mockReset();
  });

  it('shows the cached plan name from sessionStorage', () => {
    sessionStorage.setItem('ccm_expired_sub', JSON.stringify({ plan: 'Professional' }));
    render(
      <MemoryRouter>
        <SubscriptionExpiredPage />
      </MemoryRouter>,
    );
    expect(
      screen.getByText('Your Professional plan needs to be renewed to keep monitoring your cloud costs.'),
    ).toBeInTheDocument();
  });

  it('does not call /auth/me when there is no stored token', () => {
    render(
      <MemoryRouter>
        <SubscriptionExpiredPage />
      </MemoryRouter>,
    );
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('navigates to / when a background /auth/me check succeeds (subscription renewed)', async () => {
    localStorage.setItem(TOKEN_KEY, 'still-valid-token');
    vi.mocked(axios.get).mockResolvedValue({ data: {} });

    render(
      <MemoryRouter>
        <SubscriptionExpiredPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/'));
  });

  it('stays on the page when the background /auth/me check still fails', async () => {
    localStorage.setItem(TOKEN_KEY, 'expired-token');
    vi.mocked(axios.get).mockRejectedValue(new Error('still 403'));

    render(
      <MemoryRouter>
        <SubscriptionExpiredPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(axios.get).toHaveBeenCalled());
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
