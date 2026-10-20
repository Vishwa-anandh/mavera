import { useEffect, useMemo, useState } from 'react';
import { Select } from '../../../shared/ui/Select';
import { fireToast } from '../../../shared/lib/toastEvents';
import {
  PermissionMatrix,
  PermissionMatrixLegend,
  countGrants,
  describeChange,
  diffMatrices,
  summarizeDiff,
  totalGrantable,
  usePermission,
  type AccessRole,
  type PermissionMatrixValue,
} from '../../access';
import { directoryActions } from '../model/directoryActions';

interface PermissionsSectionProps {
  roles: AccessRole[];
  selectedRoleId: string;
  /** Asks the page to switch roles (it confirms first when there are unsaved changes). */
  onSelectRole: (roleId: string) => void;
  /** Tells the page whether there are unsaved changes, so it can guard role switches. */
  onDirtyChange: (dirty: boolean) => void;
  onDuplicate: (roleId: string) => void;
}

/**
 * Pick a role and edit its permission matrix. Built-in roles are read-only (with the reason and a
 * way to make an editable copy); custom roles collect edits into a draft that is saved or
 * discarded from a bar that appears as soon as something changes.
 */
export function PermissionsSection({ roles, selectedRoleId, onSelectRole, onDirtyChange, onDuplicate }: PermissionsSectionProps) {
  const canEditRoles = usePermission('roles', 'EDIT');
  const canCreateRoles = usePermission('roles', 'CREATE');
  const role = roles.find((item) => item.id === selectedRoleId) ?? roles[0];
  const [draft, setDraft] = useState<{ roleId: string; matrix: PermissionMatrixValue } | null>(null);

  const activeDraft = draft && draft.roleId === role.id ? draft.matrix : null;
  const value = activeDraft ?? role.permissions;
  const changes = useMemo(() => (activeDraft ? diffMatrices(role.permissions, activeDraft) : []), [activeDraft, role.permissions]);
  const dirty = changes.length > 0;
  const editable = role.kind === 'custom' && canEditRoles;
  const { grants } = countGrants(value);

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  const readOnlyReason =
    role.id === 'owner'
      ? 'The Owner always holds every permission and can’t be edited or removed.'
      : role.kind === 'system'
        ? `${role.name} is a built-in role, so its permissions can’t be changed. Duplicate it to make a custom role you can edit.`
        : !canEditRoles
          ? 'You can see this role’s permissions but your own role doesn’t include Edit on Roles and permissions.'
          : null;

  const save = () => {
    if (!activeDraft) return;
    const count = directoryActions.saveRolePermissions(role.id, activeDraft);
    setDraft(null);
    fireToast({ type: 'success', message: `Permissions saved for ${role.name}: ${count} change${count === 1 ? '' : 's'}.` });
  };

  return (
    <div className="mv-permissions">
      <div className="mv-permissions-pick">
        <Select
          label="Role"
          value={role.id}
          onChange={onSelectRole}
          options={roles.map((item) => ({ value: item.id, label: item.kind === 'custom' ? `${item.name} (custom)` : item.name }))}
        />
        <p className="mv-permissions-summary" aria-live="polite">
          <strong>{role.name}</strong>
          <span className={`mv-status ${role.kind === 'system' ? 'mv-status--info' : 'mv-status--neutral'}`}>{role.kind === 'system' ? 'System' : 'Custom'}</span>
          <span className="mv-muted">{grants} of {totalGrantable(role.id)} permissions</span>
        </p>
      </div>

      {readOnlyReason && (
        <div className="mv-notice mv-permissions-note" role="note">
          {readOnlyReason}
          {role.kind === 'system' && role.id !== 'owner' && canCreateRoles && (
            <> <button type="button" className="mv-link-button" onClick={() => onDuplicate(role.id)}>Duplicate as a custom role</button></>
          )}
        </div>
      )}

      <PermissionMatrixLegend />
      <p className="mv-muted mv-matrix-hint">Turning on any action also turns on View for that module; turning View off clears the rest.</p>

      <PermissionMatrix
        roleId={role.id}
        roleName={role.name}
        value={value}
        readOnly={!editable}
        onChange={(matrix) => setDraft({ roleId: role.id, matrix })}
      />

      {dirty && (
        <div className="mv-unsaved-bar" role="region" aria-label="Unsaved changes">
          <p className="mv-unsaved-text" aria-live="polite">
            <strong>{changes.length} unsaved change{changes.length === 1 ? '' : 's'}</strong>
            <span className="mv-muted"> · {summarizeDiff(changes)} · {describeChange(changes[0])}{changes.length > 1 ? ` and ${changes.length - 1} more` : ''}</span>
          </p>
          <div className="mv-unsaved-actions">
            <button type="button" className="mv-secondary-button" onClick={() => setDraft(null)}>Discard</button>
            <button type="button" className="mv-primary-button" onClick={save}>Save changes</button>
          </div>
        </div>
      )}
    </div>
  );
}
