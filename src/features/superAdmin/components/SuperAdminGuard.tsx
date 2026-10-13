import { Navigate, Outlet } from 'react-router-dom';
import { useSuperAdminAuth } from '../model/SuperAdminAuthContext';

/** Gates every /admin/* route behind its own sa_token — entirely independent
 * of the org-level AuthContext / AppShell guard. There's no dedicated Super
 * Admin login page; an unauthenticated visitor goes to the normal /login
 * form, which already routes Super Admin credentials into this portal. */
export function SuperAdminGuard() {
  const { isAuthenticated } = useSuperAdminAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
