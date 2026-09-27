import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';
import { api, TOKEN_KEY } from './api';

vi.mock('./api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api')>();
  return { ...actual, api: { ...actual.api, get: vi.fn(), post: vi.fn() } };
});

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.history.pushState({}, '', '/');
    vi.mocked(api.get).mockReset();
  });

  it('redirects an unauthenticated visitor from / to the login page', async () => {
    render(<App />);
    expect(await screen.findByText('Sign in to Mavera')).toBeInTheDocument();
  });

  it('renders the 404 page for an unknown route', async () => {
    window.history.pushState({}, '', '/this-route-does-not-exist');
    render(<App />);
    expect(await screen.findByText("Sorry, this page doesn't exist.")).toBeInTheDocument();
  });

  it('renders the authenticated dashboard shell at / once /auth/me resolves', async () => {
    localStorage.setItem(TOKEN_KEY, 'valid-token');
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/auth/me') return Promise.resolve({ data: { id: '1', email: 'a@b.com', role: 'member' } });
      return Promise.resolve({ data: [] });
    });

    render(<App />);

    expect(await screen.findByText('MAVERA')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
