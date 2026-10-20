import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { accessRepository, auditRepository } from '../../../data-access';
import { useAuth } from '../../auth';
import { AccessContext, useAccessDirectory, type AccessContextValue } from './accessContext';
import { can as roleCan } from './permissions';
import { buildSelfMember, findRole, legacyRoleToRoleId, resolveEffectiveRoleId } from './roleResolution';

const PREVIEW_KEY = 'mavera.previewRole';

function readPreview(): string | null {
  try {
    return sessionStorage.getItem(PREVIEW_KEY);
  } catch {
    return null;
  }
}

function writePreview(roleId: string | null) {
  try {
    if (roleId) sessionStorage.setItem(PREVIEW_KEY, roleId);
    else sessionStorage.removeItem(PREVIEW_KEY);
  } catch {
    // The preview just isn't remembered across a reload.
  }
}

/**
 * Supplies the signed-in member's role to the whole app: navigation, route protection and the
 * write actions all ask `usePermission` / `<Can>`. The demo session is the organisation's Owner and
 * may preview another role (the choice lives in sessionStorage, so it ends with the session).
 */
export function AccessProvider({ children }: { children: ReactNode }) {
  const { user, isDemoSession } = useAuth();
  const { members, roles } = useAccessDirectory();
  const [storedPreview, setStoredPreview] = useState<string | null>(readPreview);

  // The signed-in user joins the directory the first time they are seen.
  const userId = user?.id;
  useEffect(() => {
    if (!user) return;
    accessRepository.ensureMember(buildSelfMember(user, isDemoSession));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the record is rebuilt from `user`, keyed by id
  }, [userId, isDemoSession]);

  const member = userId ? members.find((m) => m.userId === userId) : undefined;
  const ownRoleId = member?.roleId ?? (userId ? (isDemoSession ? 'owner' : legacyRoleToRoleId(user?.role)) : 'viewer');
  const canPreview = Boolean(isDemoSession) && ownRoleId === 'owner';
  const roleId = resolveEffectiveRoleId({ ownRoleId, previewRoleId: storedPreview, canPreview, roles });
  const currentRole = findRole(roles, roleId);
  const previewRoleId = canPreview && roleId !== ownRoleId ? roleId : null;

  // Events recorded during the session are attributed to the real person, never to a previewed role.
  const ownRole = findRole(roles, ownRoleId);
  const actorName = member?.fullName ?? user?.name ?? user?.email ?? '';
  const actorEmail = user?.email ?? '';
  const ownRoleName = ownRole?.name ?? 'Member';
  const actorKind = ownRoleId === 'owner' || ownRoleId === 'admin' ? 'admin' : 'member';
  useEffect(() => {
    auditRepository.setActor(user ? { name: actorName, email: actorEmail, kind: actorKind, role: ownRoleName } : null);
  }, [user, actorName, actorEmail, actorKind, ownRoleName]);

  const setPreviewRole = useCallback((next: string | null) => {
    const value = next && next !== 'owner' ? next : null;
    setStoredPreview(value);
    writePreview(value);
  }, []);

  const can = useCallback<AccessContextValue['can']>((module, action) => roleCan(currentRole, module, action), [currentRole]);

  const value = useMemo<AccessContextValue>(
    () => ({ roles, currentRole, ownRoleId, previewRoleId, canPreview, setPreviewRole, can, enforced: true }),
    [roles, currentRole, ownRoleId, previewRoleId, canPreview, setPreviewRole, can],
  );

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}
