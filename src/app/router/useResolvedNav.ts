import { useMemo } from 'react';
import { useAuth } from '../../features/auth';
import { derivePermissions } from '../../shared/lib/permissions';
import { resolveNav, type ResolvedNavEntry } from './navConfig';

export function useResolvedNav(): ResolvedNavEntry[] {
  const { user, cloudAccess, invoiceOnly, features, modules } = useAuth();
  const permissions = useMemo(
    () => derivePermissions(user, cloudAccess, invoiceOnly),
    [user, cloudAccess, invoiceOnly],
  );
  return useMemo(
    () => resolveNav(permissions, { features, invoiceOnly, modules }),
    [permissions, features, invoiceOnly, modules],
  );
}
