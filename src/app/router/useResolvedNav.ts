import { useMemo } from 'react';
import { useAuth } from '../../features/auth';
import { useAccess } from '../../features/access';
import { derivePermissions } from '../../shared/lib/permissions';
import { resolveNav, type ResolvedNavEntry } from './navConfig';

export function useResolvedNav(): ResolvedNavEntry[] {
  const { user, cloudAccess, invoiceOnly, features, modules } = useAuth();
  const { can, enforced } = useAccess();
  const permissions = useMemo(
    () => derivePermissions(user, cloudAccess, invoiceOnly),
    [user, cloudAccess, invoiceOnly],
  );
  return useMemo(
    () => resolveNav(permissions, { features, invoiceOnly, modules, canView: enforced ? (module) => can(module, 'VIEW') : undefined }),
    [permissions, features, invoiceOnly, modules, can, enforced],
  );
}
