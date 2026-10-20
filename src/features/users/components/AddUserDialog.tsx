import { useState, type FormEvent } from 'react';
import { useModalOverlay } from '../../../shared/ui/useOverlay';
import { Select } from '../../../shared/ui/Select';
import type { CloudProvider } from '../../../shared/types/auth';
import { roleIdToLegacyRole, systemRoles, type AccessRole } from '../../access';
import {
  validateNewMember,
  type NewMemberErrors,
  type OrgMember,
  type SeatSummary,
} from '../model/userManagementTypes';

export interface AddUserDialogProps {
  members: OrgMember[];
  seats: SeatSummary;
  /** Providers the organisation subscribes to; the new member can be given view access to any of them. */
  providers: Array<{ id: CloudProvider; label: string }>;
  /** Roles the new member can hold; defaults to the built-in roles. The Owner role is never offered. */
  roles?: AccessRole[];
  onCancel: () => void;
  onAdd: (member: OrgMember) => void;
}

const DEFAULT_ROLE_ID = 'viewer';

/**
 * Adds a member to the organisation while a seat is free. New members start
 * Active; a member's cloud access is view-only until changed in the table.
 */
export function AddUserDialog({ members, seats, providers, roles, onCancel, onAdd }: AddUserDialogProps) {
  const panelRef = useModalOverlay<HTMLElement>(onCancel);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const assignable = (roles ?? systemRoles()).filter((item) => item.id !== 'owner');
  const [roleId, setRoleId] = useState<string>(DEFAULT_ROLE_ID);
  const selectedRole = assignable.find((item) => item.id === roleId);
  const privilegedRole = roleIdToLegacyRole(roleId) !== 'member';
  const [access, setAccess] = useState<Set<CloudProvider>>(() => new Set());
  const [errors, setErrors] = useState<NewMemberErrors>({});

  const toggleProvider = (id: CloudProvider) =>
    setAccess((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (seats.full) return;
    const found = validateNewMember({ fullName, email, roleId }, members);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const canView = (id: CloudProvider) => privilegedRole || access.has(id);
    const member: OrgMember = {
      userId: `user-${Date.now().toString(36)}`,
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      role: roleIdToLegacyRole(roleId),
      roleId,
      status: 'active',
      alertsEnabled: true,
      canViewAzure: canView('azure'),
      canViewAws: canView('aws'),
      canViewBtp: canView('btp'),
      canViewGcp: canView('gcp'),
    };
    onAdd(member);
  };

  return (
    <div className="mv-dialog-backdrop" onClick={onCancel}>
      <section
        ref={panelRef}
        className="mv-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-user-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mv-panel-title" id="add-user-title">Add user</h2>
        <p className="mv-subtitle">
          {seats.available === null
            ? 'Your plan has no seat limit.'
            : `${seats.available} of ${seats.limit} seat${seats.limit === 1 ? '' : 's'} available — this member will use one.`}
        </p>

        <form className="mv-form-stack" onSubmit={submit} noValidate>
          <label className="mv-field">
            Full name
            <input
              type="text"
              value={fullName}
              autoComplete="off"
              data-autofocus
              aria-invalid={errors.fullName ? true : undefined}
              onChange={(e) => setFullName(e.target.value)}
            />
            {errors.fullName && <span className="mv-field-error" role="alert">{errors.fullName}</span>}
          </label>

          <label className="mv-field">
            Work email
            <input
              type="email"
              value={email}
              autoComplete="off"
              aria-invalid={errors.email ? true : undefined}
              onChange={(e) => setEmail(e.target.value)}
            />
            {errors.email && <span className="mv-field-error" role="alert">{errors.email}</span>}
          </label>

          <Select
            label="Role"
            value={roleId}
            onChange={setRoleId}
            options={assignable.map((item) => ({ value: item.id, label: item.kind === 'custom' ? `${item.name} (custom)` : item.name }))}
            helpText={selectedRole?.description}
          />

          {!privilegedRole && providers.length > 0 && (
            <fieldset className="mv-checkbox-group">
              <legend>Can view</legend>
              {providers.map((provider) => (
                <label key={provider.id} className="mv-checkbox">
                  <input type="checkbox" checked={access.has(provider.id)} onChange={() => toggleProvider(provider.id)} />
                  {provider.label}
                </label>
              ))}
            </fieldset>
          )}

          <div className="mv-dialog-actions">
            <button type="button" className="mv-secondary-button" onClick={onCancel}>Cancel</button>
            <button type="submit" className="mv-primary-button" disabled={seats.full}>Add user</button>
          </div>
        </form>
      </section>
    </div>
  );
}
