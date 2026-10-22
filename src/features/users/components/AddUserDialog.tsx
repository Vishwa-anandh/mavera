import { useRef, useState, type FormEvent } from 'react';
import { useModalOverlay } from '../../../shared/ui/useOverlay';
import { FilterChips } from '../../../shared/ui/FilterChips';
import { useRememberedState } from '../../../shared/lib/useRememberedState';
import type { CloudProvider } from '../../../shared/types/auth';
import { can, roleIdToLegacyRole, systemRoles, type AccessRole } from '../../access';
import {
  nameFromEmail,
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
  /** Called with the new member. `addAnother` is true when the dialog should stay open for the next person. */
  onAdd: (member: OrgMember, options: { addAnother: boolean }) => void;
}

/** The least-privileged built-in role: what a new member gets until someone picks another. */
const DEFAULT_ROLE_ID = 'viewer';

/** The providers whose cost data a role may view: the starting point for a new member's "Can view" ticks. */
function providersViewableBy(role: AccessRole | undefined, providers: AddUserDialogProps['providers']): Set<CloudProvider> {
  return new Set(providers.filter((provider) => can(role, `provider.${provider.id}`, 'VIEW')).map((provider) => provider.id));
}

/**
 * Adds a member to the organisation while a seat is free. New members start Active. The e-mail address is
 * the only thing that has to be typed: the name is taken from it when left blank, the role is one click on a
 * chip (the last one used is remembered for the session), the "Can view" ticks start from what the role may
 * see, and "Add another user" keeps the dialog open for the next person.
 */
export function AddUserDialog({ members, seats, providers, roles, onCancel, onAdd }: AddUserDialogProps) {
  const panelRef = useModalOverlay<HTMLElement>(onCancel);
  const emailRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const assignable = (roles ?? systemRoles()).filter((item) => item.id !== 'owner');
  const [rememberedRoleId, setRoleId] = useRememberedState<string>('users', 'add-user-role', DEFAULT_ROLE_ID, (value) => assignable.some((item) => item.id === value));
  const selectedRole = assignable.find((item) => item.id === rememberedRoleId) ?? assignable.find((item) => item.id === DEFAULT_ROLE_ID) ?? assignable[0];
  const roleId = selectedRole?.id ?? DEFAULT_ROLE_ID;
  const privilegedRole = roleIdToLegacyRole(roleId) !== 'member';
  // Until the person changes a tick, access follows the role; choosing another role starts over from that role.
  const [manualAccess, setManualAccess] = useState<Set<CloudProvider> | null>(null);
  const access = manualAccess ?? providersViewableBy(selectedRole, providers);
  const [addAnother, setAddAnother] = useState(false);
  const [errors, setErrors] = useState<NewMemberErrors>({});

  const chooseRole = (id: string) => {
    setRoleId(id);
    setManualAccess(null);
  };

  const toggleProvider = (id: CloudProvider) => {
    const next = new Set(access);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setManualAccess(next);
  };

  const derivedName = nameFromEmail(email);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (seats.full) return;
    const found = validateNewMember({ fullName, email, roleId }, members);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const canView = (id: CloudProvider) => privilegedRole || access.has(id);
    const member: OrgMember = {
      userId: `user-${Date.now().toString(36)}-${members.length}`,
      fullName: fullName.trim() || derivedName,
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
    onAdd(member, { addAnother });
    if (addAnother) {
      setFullName('');
      setEmail('');
      setErrors({});
      emailRef.current?.focus();
    }
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
            Work email
            <input
              ref={emailRef}
              type="email"
              value={email}
              autoComplete="off"
              data-autofocus
              data-tour="add-user-email"
              aria-invalid={errors.email ? true : undefined}
              onChange={(e) => setEmail(e.target.value)}
            />
            {errors.email && <span className="mv-field-error" role="alert">{errors.email}</span>}
          </label>

          <label className="mv-field">
            <span>Full name <span className="mv-muted">(optional)</span></span>
            <input
              type="text"
              value={fullName}
              autoComplete="off"
              placeholder={derivedName || 'Taken from the e-mail address'}
              data-tour="add-user-name"
              aria-invalid={errors.fullName ? true : undefined}
              onChange={(e) => setFullName(e.target.value)}
            />
            {errors.fullName && <span className="mv-field-error" role="alert">{errors.fullName}</span>}
          </label>

          <div className="mv-field">
            <span>Role</span>
            <FilterChips
              label="Role"
              chips={assignable.map((item) => ({ value: item.id, label: item.kind === 'custom' ? `${item.name} (custom)` : item.name }))}
              value={roleId}
              onChange={chooseRole}
            />
            {selectedRole?.description && <span className="mv-field-help">{selectedRole.description}</span>}
          </div>

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

          <label className="mv-checkbox">
            <input type="checkbox" checked={addAnother} onChange={(e) => setAddAnother(e.target.checked)} />
            Add another user after this one
          </label>

          <div className="mv-dialog-actions">
            <button type="button" className="mv-secondary-button" onClick={onCancel}>{addAnother ? 'Done' : 'Cancel'}</button>
            <button type="submit" className="mv-primary-button" data-tour="add-user-submit" disabled={seats.full}>Add user</button>
          </div>
        </form>
      </section>
    </div>
  );
}
