import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { workspaceRepository } from '../../../data-access';
import { AccessProvider } from '../../access';
import type { AuthContextValue } from '../../auth';
import { SetupRedirect } from './SetupRedirect';

const useAuthMock = vi.fn<() => Partial<AuthContextValue>>();
vi.mock('../../auth/model/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../auth/model/AuthContext')>();
  return { ...actual, useAuth: () => useAuthMock() };
});

const newOrgUser = { id: 'demo-new-org-user', email: 'new@mavera.local', name: 'Nora Newman', role: 'admin' as const };
const ALL = { cloudCost: true, sapMonitoring: true };

function Where() {
  const { pathname } = useLocation();
  return <p data-testid="where">{pathname}</p>;
}

function visit(user: Partial<AuthContextValue>['user'] = newOrgUser) {
  useAuthMock.mockReturnValue({ user, loading: false, isAuthenticated: true, isDemoSession: true, modules: ALL, cloudAccess: ['azure'], accountLimits: {} } as Partial<AuthContextValue>);
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AccessProvider>
        <Routes>
          <Route path="/" element={<SetupRedirect><p>Dashboard</p></SetupRedirect>} />
          <Route path="/setup" element={<Where />} />
        </Routes>
      </AccessProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => localStorage.clear());
afterEach(() => act(() => workspaceRepository.setProfile('populated')));

describe('SetupRedirect', () => {
  it('sends the owner of a brand-new organisation to /setup once, then leaves them alone', () => {
    workspaceRepository.setProfile('empty');
    const first = visit();
    expect(screen.getByTestId('where')).toHaveTextContent('/setup');
    expect(JSON.parse(localStorage.getItem('mv-setup:demo-new-org-user') ?? '{}')).toMatchObject({ redirected: true });
    first.unmount();
    visit();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('does not send someone who skipped the setup', () => {
    workspaceRepository.setProfile('empty');
    localStorage.setItem('mv-setup:demo-new-org-user', JSON.stringify({ redirected: false, skipped: true, visited: [] }));
    visit();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('leaves populated organisations alone', () => {
    workspaceRepository.setProfile('populated');
    visit({ id: 'dev-preview-user', email: 'demo@mavera.local', role: 'admin' });
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('leaves other roles of a new organisation alone', () => {
    workspaceRepository.setProfile('empty');
    visit({ ...newOrgUser, id: 'demo-viewer-user', role: 'member', demoRoleId: 'viewer' });
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
