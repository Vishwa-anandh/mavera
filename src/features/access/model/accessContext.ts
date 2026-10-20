import { createContext, useContext, useMemo, useSyncExternalStore } from 'react';
import { accessRepository, type AccessSnapshot } from '../../../data-access';
import type { ModuleId, PermissionAction } from './modules';
import { systemRoles, type AccessRole } from './permissions';
import { allRoles } from './roleResolution';

export interface AccessContextValue {
  /** Every role: the built-in four, then custom roles. */
  roles: AccessRole[];
  /** The role currently in force (the previewed role while previewing). */
  currentRole: AccessRole | undefined;
  /** The signed-in member's own role id, ignoring any preview. */
  ownRoleId: string;
  /** Set only while a demo session is previewing another role. */
  previewRoleId: string | null;
  /** Demo sessions only: may switch to another role to see the app as they would. */
  canPreview: boolean;
  setPreviewRole: (roleId: string | null) => void;
  can: (module: ModuleId | string, action: PermissionAction) => boolean;
  /** False outside an AccessProvider, where everything is allowed; true wherever roles are really in force. */
  enforced: boolean;
}

/**
 * Outside an AccessProvider (isolated component tests, the login screens) everything is allowed;
 * the provider is mounted for the whole signed-in app. UI visibility is never the security
 * boundary: the API enforces permissions on its own.
 */
const OPEN: AccessContextValue = {
  roles: systemRoles(),
  currentRole: undefined,
  ownRoleId: 'owner',
  previewRoleId: null,
  canPreview: false,
  setPreviewRole: () => {},
  can: () => true,
  enforced: false,
};

export const AccessContext = createContext<AccessContextValue>(OPEN);

export function useAccess(): AccessContextValue {
  return useContext(AccessContext);
}

/** Can the signed-in member (or the previewed role) do `action` on `module`? */
export function usePermission(module: ModuleId, action: PermissionAction): boolean {
  return useContext(AccessContext).can(module, action);
}

/** Members and custom roles, live: re-renders when either changes. */
export function useAccessDirectory(): AccessSnapshot & { roles: AccessRole[] } {
  const snapshot = useSyncExternalStore(accessRepository.subscribe, accessRepository.getSnapshot, accessRepository.getSnapshot);
  const roles = useMemo(() => allRoles(snapshot.customRoles), [snapshot.customRoles]);
  return { customRoles: snapshot.customRoles, members: snapshot.members, roles };
}
