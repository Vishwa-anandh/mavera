import { DetailDrawer, DetailList } from '../../../shared/ui/DetailDrawer';
import { relativeTime } from '../../../shared/lib/relativeTime';
import {
  ACTION_LABELS,
  MODULE_GROUPS,
  countGrants,
  modulesInGroup,
  totalGrantable,
  type AccessRole,
  type ModuleId,
} from '../../access';
import type { OrgMember } from '../model/userManagementTypes';

interface RoleDetailsDrawerProps {
  role: AccessRole;
  holders: OrgMember[];
  canEditPermissions: boolean;
  canDuplicate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onClose: () => void;
  onEditPermissions: () => void;
  onEditDetails: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

/** Everything about one role: who holds it and, group by group, what it can do. */
export function RoleDetailsDrawer({ role, holders, canEditPermissions, canDuplicate, canEdit, canDelete, onClose, onEditPermissions, onEditDetails, onDuplicate, onDelete }: RoleDetailsDrawerProps) {
  const { grants } = countGrants(role.permissions);
  const total = totalGrantable(role.id);
  return (
    <DetailDrawer
      title={role.name}
      subtitle={<span className={`mv-status ${role.kind === 'system' ? 'mv-status--info' : 'mv-status--neutral'}`}>{role.kind === 'system' ? 'System role' : 'Custom role'}</span>}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="mv-secondary-button" onClick={onEditPermissions}>{role.kind === 'system' || !canEditPermissions ? 'View permissions' : 'Edit permissions'}</button>
          {canDuplicate && <button type="button" className="mv-secondary-button" onClick={onDuplicate}>Duplicate</button>}
          {role.kind === 'custom' && canEdit && <button type="button" className="mv-secondary-button" onClick={onEditDetails}>Edit details</button>}
          {role.kind === 'custom' && canDelete && (
            <button type="button" className="mv-secondary-button mv-row-action--danger" aria-disabled={holders.length > 0 || undefined} onClick={onDelete}>Delete</button>
          )}
        </>
      }
    >
      {role.description && <p className="mv-role-description">{role.description}</p>}
      {role.kind === 'system' && (
        <p className="mv-muted">
          {role.id === 'owner' ? 'The Owner can’t be edited or removed.' : 'System roles can’t be edited. Duplicate this role to make a custom version.'}
        </p>
      )}
      {role.kind === 'custom' && holders.length > 0 && canDelete && (
        <p className="mv-muted" role="note">Reassign the {holders.length} member{holders.length === 1 ? '' : 's'} below before deleting this role.</p>
      )}

      <h3 className="mv-detail-heading">Summary</h3>
      <DetailList
        items={[
          { label: 'Permissions', value: `${grants} of ${total}` },
          { label: 'Members', value: holders.length },
          { label: 'Last edited', value: role.updatedAt ? `${relativeTime(new Date(role.updatedAt))} by ${role.updatedBy ?? 'unknown'}` : 'Built in' },
        ]}
      />

      <h3 className="mv-detail-heading">Members with this role</h3>
      {holders.length === 0 ? (
        <p className="mv-muted">Nobody holds this role yet.</p>
      ) : (
        <ul className="mv-role-holders">
          {holders.map((member) => (
            <li key={member.userId}>
              <strong>{member.fullName}</strong>
              <span className="mv-muted"> · {member.email}{member.status === 'inactive' ? ' · inactive' : ''}</span>
            </li>
          ))}
        </ul>
      )}

      <h3 className="mv-detail-heading">What it can do</h3>
      {grants === 0 ? (
        <p className="mv-muted">This role has no permissions yet, so its members can sign in but can’t open any page.</p>
      ) : (
        MODULE_GROUPS.map((group) => {
          const rows = modulesInGroup(group.id).filter((module) => (role.permissions[module.id as ModuleId] ?? []).length > 0);
          if (rows.length === 0) return null;
          return (
            <section key={group.id} className="mv-role-group" aria-label={group.label}>
              <h4>{group.label}</h4>
              <dl className="mv-detail-list">
                {rows.map((module) => (
                  <div key={module.id}>
                    <dt>{module.label}</dt>
                    <dd>{(role.permissions[module.id as ModuleId] ?? []).map((action) => ACTION_LABELS[action]).join(', ')}</dd>
                  </div>
                ))}
              </dl>
            </section>
          );
        })
      )}
    </DetailDrawer>
  );
}
