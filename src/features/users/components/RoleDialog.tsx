import { useState, type FormEvent } from 'react';
import { useModalOverlay } from '../../../shared/ui/useOverlay';
import { Select } from '../../../shared/ui/Select';
import { ROLE_DESCRIPTION_MAX, ROLE_NAME_MAX, validateRoleForm, type AccessRole, type RoleFormErrors } from '../../access';

export interface RoleDialogValue {
  name: string;
  description: string;
  /** Create only: the role whose permissions the new role starts from; empty for none. */
  copyFrom: string;
}

interface RoleDialogProps {
  /** The custom role being edited; omit to create a new one. */
  role?: AccessRole;
  /** Every role, for the duplicate-name check and the "start from" choice. */
  roles: AccessRole[];
  onCancel: () => void;
  onSave: (value: RoleDialogValue) => void;
}

const NOTHING = '';

/** Name and description for a custom role; a new role may start from a copy of an existing one's permissions. */
export function RoleDialog({ role, roles, onCancel, onSave }: RoleDialogProps) {
  const panelRef = useModalOverlay<HTMLElement>(onCancel);
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [copyFrom, setCopyFrom] = useState(NOTHING);
  const [errors, setErrors] = useState<RoleFormErrors>({});
  const editing = Boolean(role);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const found = validateRoleForm({ name, description }, roles, role?.id);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onSave({ name: name.trim(), description: description.trim(), copyFrom });
  };

  return (
    <div className="mv-dialog-backdrop" onClick={onCancel}>
      <section ref={panelRef} className="mv-dialog" role="dialog" aria-modal="true" aria-labelledby="role-dialog-title" onClick={(e) => e.stopPropagation()}>
        <h2 className="mv-panel-title" id="role-dialog-title">{editing ? 'Edit role' : 'Add role'}</h2>
        <p className="mv-subtitle">
          {editing ? 'Rename the role or change its description. Permissions are edited in the matrix below.' : 'Name the role, then set what it can do in the permission matrix.'}
        </p>
        <form className="mv-form-stack" onSubmit={submit} noValidate>
          <label className="mv-field">
            Role name
            <input
              type="text"
              value={name}
              maxLength={ROLE_NAME_MAX}
              autoComplete="off"
              data-autofocus
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? 'role-name-error' : undefined}
              onChange={(e) => setName(e.target.value)}
            />
            {errors.name && <span className="mv-field-error" id="role-name-error" role="alert">{errors.name}</span>}
          </label>
          <label className="mv-field">
            <span>Description <span className="mv-muted">(optional)</span></span>
            <input
              type="text"
              value={description}
              maxLength={ROLE_DESCRIPTION_MAX}
              autoComplete="off"
              aria-invalid={errors.description ? true : undefined}
              aria-describedby={errors.description ? 'role-description-error' : undefined}
              onChange={(e) => setDescription(e.target.value)}
            />
            {errors.description && <span className="mv-field-error" id="role-description-error" role="alert">{errors.description}</span>}
          </label>
          {!editing && (
            <Select
              label="Start from"
              value={copyFrom}
              onChange={setCopyFrom}
              options={[{ value: NOTHING, label: 'Nothing (no access)' }, ...roles.map((item) => ({ value: item.id, label: `Copy of ${item.name}` }))]}
              helpText="You can change every permission afterwards."
            />
          )}
          <div className="mv-dialog-actions">
            <button type="button" className="mv-secondary-button" onClick={onCancel}>Cancel</button>
            <button type="submit" className="mv-primary-button">{editing ? 'Save role' : 'Add role'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
