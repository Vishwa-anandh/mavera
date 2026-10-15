import { useState, type FormEvent } from 'react';
import { useModalOverlay } from '../../../shared/ui/useOverlay';
import { Select } from '../../../shared/ui/Select';
import type { CloudProvider } from '../../../shared/types/auth';
import {
  validateNewMember,
  type MemberRole,
  type NewMemberErrors,
  type OrgMember,
  type SeatSummary,
} from '../model/userManagementTypes';

export interface AddUserDialogProps {
  members: OrgMember[];
  seats: SeatSummary;
  /** Providers the organisation subscribes to; the new member can be given view access to any of them. */
  providers: Array<{ id: CloudProvider; label: string }>;
  onCancel: () => void;
  onAdd: (member: OrgMember) => void;
}

const ROLE_OPTIONS: Array<{ value: Exclude<MemberRole, 'owner'>; label: string }> = [
  { value: 'member', label: 'Member' },
  { value: 'admin', label: 'Admin — full access to everything' },
];

/**
 * Adds a member to the organisation while a seat is free. New members start
 * Active; a member's cloud access is view-only until changed in the table.
 */
export function AddUserDialog({ members, seats, providers, onCancel, onAdd }: AddUserDialogProps) {
  const panelRef = useModalOverlay<HTMLElement>(onCancel);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Exclude<MemberRole, 'owner'>>('member');
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
    const found = validateNewMember({ fullName, email, role }, members);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const canView = (id: CloudProvider) => role === 'admin' || access.has(id);
    const member: OrgMember = {
      userId: `user-${Date.now().toString(36)}`,
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      role,
      status: 'active',
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

          <Select label="Role" value={role} onChange={setRole} options={ROLE_OPTIONS} />

          {role === 'member' && providers.length > 0 && (
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
