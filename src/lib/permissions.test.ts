import { describe, it, expect } from 'vitest';
import { derivePermissions, isPrivileged } from './permissions';
import type { User } from '../types/auth';

const baseUser: User = { id: '1', email: 'a@b.com', role: 'member' };

describe('permissions', () => {
  it('isPrivileged is true only for admin/owner roles', () => {
    expect(isPrivileged({ ...baseUser, role: 'admin' })).toBe(true);
    expect(isPrivileged({ ...baseUser, role: 'owner' })).toBe(true);
    expect(isPrivileged({ ...baseUser, role: 'member' })).toBe(false);
    expect(isPrivileged(null)).toBe(false);
  });

  it('a member with no canView* flags sees every cloud as inaccessible, without crashing', () => {
    const result = derivePermissions(baseUser, ['azure', 'aws'], false);
    expect(result.azure.canView).toBe(false);
    expect(result.aws.canView).toBe(false);
    expect(result.btp.canView).toBe(false);
    expect(result.gcp.canView).toBe(false);
  });

  it('handles a null user without throwing', () => {
    expect(() => derivePermissions(null, [], false)).not.toThrow();
    const result = derivePermissions(null, [], false);
    expect(result.isPrivileged).toBe(false);
    expect(result.azure.canView).toBe(false);
  });

  it('admins/owners bypass canView*/readOnly flags entirely', () => {
    const admin: User = { ...baseUser, role: 'admin', azureReadOnly: true };
    const result = derivePermissions(admin, [], false);
    expect(result.azure.canView).toBe(true);
    expect(result.azure.readOnly).toBe(false);
    expect(result.azure.canWrite).toBe(true);
  });

  it('a read-only member can view but not write', () => {
    const readOnlyMember: User = { ...baseUser, canViewAzure: true, azureReadOnly: true };
    const result = derivePermissions(readOnlyMember, ['azure'], false);
    expect(result.azure.canView).toBe(true);
    expect(result.azure.readOnly).toBe(true);
    expect(result.azure.canWrite).toBe(false);
  });

  it('allowConnect requires org access, view permission, and either write access or privilege', () => {
    const writer: User = { ...baseUser, canViewAzure: true };
    const result = derivePermissions(writer, ['azure'], false);
    expect(result.azure.allowConnect).toBe(true);

    const readOnly: User = { ...baseUser, canViewAzure: true, azureReadOnly: true };
    const readOnlyResult = derivePermissions(readOnly, ['azure'], false);
    expect(readOnlyResult.azure.allowConnect).toBe(false);

    const noOrgAccess: User = { ...baseUser, canViewAzure: true };
    const noOrgAccessResult = derivePermissions(noOrgAccess, [], false);
    expect(noOrgAccessResult.azure.allowConnect).toBe(false);
  });

  it('canConnectCloud is false for a pure invoice-only org, true for a hybrid org', () => {
    const invoiceOnlyResult = derivePermissions(baseUser, [], true);
    expect(invoiceOnlyResult.canConnectCloud).toBe(false);
    expect(invoiceOnlyResult.isHybridOrg).toBe(false);

    const hybridResult = derivePermissions(baseUser, ['azure'], true);
    expect(hybridResult.canConnectCloud).toBe(true);
    expect(hybridResult.isHybridOrg).toBe(true);
  });
});
