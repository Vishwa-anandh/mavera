import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';
import { api, TOKEN_KEY } from '../data-access';

vi.mock('../data-access/rest/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../data-access/rest/client')>();
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
      // Real backend shapes (reference HomePage.jsx data load).
      if (url === '/summary/dashboard') return Promise.resolve({ data: { totals: {}, accounts: {}, monthly: [] } });
      if (url === '/recommendations') return Promise.resolve({ data: { data: [], summary: null } });
      if (url === '/smart-alerts') return Promise.resolve({ data: { alerts: [], summary: {} } });
      if (url === '/insights/msp-savings') return Promise.resolve({ data: { totalSpend: 0, totalSavings: 0 } });
      if (url === '/invoices') return Promise.resolve({ data: { data: [] } });
      return Promise.resolve({ data: [] });
    });

    render(<App />);

    expect(await screen.findByRole('img', { name: 'Mavera' })).toBeInTheDocument();
    // The dashboard's one h1 is the hero headline, not the literal word
    // "Dashboard" (that still appears in the nav link).
    // Pages load on demand: a skeleton stands in until the dashboard's code arrives.
    expect(await screen.findByRole('heading', { level: 1 }, { timeout: 8000 })).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Loading page' })).not.toBeInTheDocument();
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
  });

  it('redirects /admin/login to the normal login page — there is no separate Super Admin login page', async () => {
    window.history.pushState({}, '', '/admin/login');
    render(<App />);
    expect(await screen.findByText('Sign in to Mavera')).toBeInTheDocument();
  });

  it('redirects an unauthenticated visitor from /admin/dashboard to the normal login page', async () => {
    window.history.pushState({}, '', '/admin/dashboard');
    render(<App />);
    expect(await screen.findByText('Sign in to Mavera')).toBeInTheDocument();
  });
});
