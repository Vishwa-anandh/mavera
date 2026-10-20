import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { auditRepository } from '../../../data-access';
import { useAccess } from '../model/accessContext';
import { moduleById } from '../model/modules';
import { AccessDenied } from './AccessDenied';

interface RouteAccessGuardProps {
  /** The module whose View permission opens this route; no module means the route is open to everyone signed in. */
  module: string | null | undefined;
  children: ReactNode;
}

/** Route-level protection: shows the "no access" state instead of the page when the role cannot VIEW its module. */
export function RouteAccessGuard({ module, children }: RouteAccessGuardProps) {
  const { can, previewRoleId, currentRole } = useAccess();
  const { pathname } = useLocation();
  const definition = module ? moduleById(module) : undefined;
  const allowed = !definition || can(definition.id, 'VIEW');

  // A refused page is worth a line in the audit trail (not while previewing: that isn't a real attempt).
  useEffect(() => {
    if (allowed || previewRoleId || !definition) return;
    auditRepository.append({
      action: 'Access denied',
      target: definition.label,
      module: 'Access control',
      result: 'denied',
      detail: `${currentRole?.name ?? 'This role'} does not have View on ${definition.label} (${pathname}).`,
      source: 'Web',
    });
  }, [allowed, previewRoleId, definition, currentRole?.name, pathname]);

  return allowed ? <>{children}</> : <AccessDenied module={module ?? undefined} />;
}
