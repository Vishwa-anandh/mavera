import type { ReactNode } from 'react';
import { usePermission } from '../model/accessContext';
import type { ModuleId, PermissionAction } from '../model/modules';

interface CanProps {
  module: ModuleId;
  action: PermissionAction;
  /** Rendered instead of the children when the role lacks the permission. Nothing by default. */
  fallback?: ReactNode;
  children: ReactNode;
}

/** Renders its children only when the current role may do `action` on `module`. */
export function Can({ module, action, fallback = null, children }: CanProps) {
  return usePermission(module, action) ? <>{children}</> : <>{fallback}</>;
}
