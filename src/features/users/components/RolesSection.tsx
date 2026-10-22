import { useState } from 'react';
import { useConfirm } from '../../../shared/ui/ConfirmProvider';
import { relativeTime } from '../../../shared/lib/relativeTime';
import { fireToast } from '../../../shared/lib/toastEvents';
import { countGrants, totalGrantable, usePermission, type AccessRole } from '../../access';
import { directoryActions } from '../model/directoryActions';
import { countMembersByRole, memberRoleId, type OrgMember } from '../model/userManagementTypes';
import { RoleDetailsDrawer } from './RoleDetailsDrawer';
import { RoleDialog, type RoleDialogValue } from './RoleDialog';

interface RolesSectionProps {
  roles: AccessRole[];
  members: OrgMember[];
  /** Points the Permissions section at a role and brings it into view. */
  onEditPermissions: (roleId: string) => void;
}

/**
 * The roles table: name, description, system or custom, how many members hold it, how much it
 * grants and when it was last edited, with Permissions, Edit, Duplicate and Delete (adding a role is the
 * page's job, so it can be done from the Permissions tab too). Deleting a role that
 * members still hold is refused with the reason.
 */
export function RolesSection({ roles, members, onEditPermissions }: RolesSectionProps) {
  const confirm = useConfirm();
  const canCreate = usePermission('roles', 'CREATE');
  const canEdit = usePermission('roles', 'EDIT');
  const canDelete = usePermission('roles', 'DELETE');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);

  const counts = countMembersByRole(members);
  const editing = roles.find((role) => role.id === editingId);
  const details = roles.find((role) => role.id === detailsId);

  const saveDetails = (value: RoleDialogValue) => {
    if (!editing) return;
    directoryActions.updateRoleDetails(editing.id, value);
    setEditingId(null);
    fireToast({ type: 'success', message: `Role “${value.name}” was updated.` });
  };

  const duplicate = (role: AccessRole) => {
    const id = directoryActions.duplicateRole(role.id);
    if (!id) return;
    setDetailsId(null);
    fireToast({ type: 'success', message: `${role.name} was duplicated. Its permissions are open in the matrix.` });
    onEditPermissions(id);
  };

  const remove = async (role: AccessRole) => {
    const heldBy = counts[role.id] ?? 0;
    if (heldBy > 0) {
      fireToast({ type: 'warning', message: `“${role.name}” can’t be deleted while ${heldBy} member${heldBy === 1 ? ' holds' : 's hold'} it. Change their role first.` });
      return;
    }
    const ok = await confirm({ title: `Delete the ${role.name} role?`, description: 'This removes the role and its permissions. Nobody currently holds it.', variant: 'delete', okText: 'Delete role' });
    if (!ok) return;
    const result = directoryActions.deleteRole(role.id);
    if (!result.ok) return;
    setDetailsId(null);
    fireToast({ type: 'success', message: `Role “${role.name}” was deleted.` });
  };

  return (
    <>
      <div className="mv-table-wrap">
        <table className="mv-table mv-table--stack mv-roles-table">
          <caption className="mv-sr-only">Roles, who holds them and what they grant</caption>
          <thead>
            <tr>
              <th scope="col">Role</th>
              <th scope="col">Description</th>
              <th scope="col" className="mv-num">Members</th>
              <th scope="col" className="mv-num">Permissions</th>
              <th scope="col">Last edited</th>
              <th scope="col" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => {
              const held = counts[role.id] ?? 0;
              const { grants } = countGrants(role.permissions);
              return (
                <tr key={role.id}>
                  <td className="mv-stack-title">
                    <button type="button" className="mv-link-button" onClick={() => setDetailsId(role.id)} aria-label={`View role details: ${role.name}`}>{role.name}</button>
                    <span className={`mv-status mv-role-kind ${role.kind === 'system' ? 'mv-status--info' : 'mv-status--neutral'}`}>{role.kind === 'system' ? 'System' : 'Custom'}</span>
                  </td>
                  <td data-label="Description" className="mv-muted mv-role-desc"><span>{role.description || '—'}</span></td>
                  <td data-label="Members" className="mv-num">{held}</td>
                  <td data-label="Permissions" className="mv-num"><span>{grants} <span className="mv-muted">of {totalGrantable(role.id)}</span></span></td>
                  <td data-label="Last edited" className="mv-muted mv-cell-nowrap">{role.updatedAt ? relativeTime(new Date(role.updatedAt)) : 'Built in'}</td>
                  <td className="mv-stack-actions">
                    <div className="mv-row-actions">
                      <button type="button" className="mv-quiet-button" aria-label={`${role.kind === 'custom' && canEdit ? 'Edit' : 'View'} permissions of ${role.name}`} onClick={() => onEditPermissions(role.id)}>
                        Permissions
                      </button>
                      {canEdit && role.kind === 'custom' && (
                        <button type="button" className="mv-quiet-button" aria-label={`Edit role ${role.name}`} onClick={() => setEditingId(role.id)}>Edit</button>
                      )}
                      {canCreate && (
                        <button type="button" className="mv-quiet-button" aria-label={`Duplicate role ${role.name}`} onClick={() => duplicate(role)}>Duplicate</button>
                      )}
                      {canDelete && role.kind === 'custom' && (
                        <button
                          type="button"
                          className="mv-quiet-button mv-row-action--danger"
                          aria-label={`Delete role ${role.name}`}
                          aria-disabled={held > 0 || undefined}
                          title={held > 0 ? `${held} member${held === 1 ? '' : 's'} still hold${held === 1 ? 's' : ''} this role` : undefined}
                          onClick={() => void remove(role)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && <RoleDialog role={editing} roles={roles} onCancel={() => setEditingId(null)} onSave={saveDetails} />}
      {details && (
        <RoleDetailsDrawer
          role={details}
          holders={members.filter((member) => memberRoleId(member) === details.id)}
          canEditPermissions={canEdit}
          canDuplicate={canCreate}
          canEdit={canEdit}
          canDelete={canDelete}
          onClose={() => setDetailsId(null)}
          onEditPermissions={() => {
            setDetailsId(null);
            onEditPermissions(details.id);
          }}
          onEditDetails={() => {
            setDetailsId(null);
            setEditingId(details.id);
          }}
          onDuplicate={() => duplicate(details)}
          onDelete={() => void remove(details)}
        />
      )}
    </>
  );
}
