import { useRef, useState, type FormEvent } from 'react';
import { FilterChips } from '../../../../shared/ui/FilterChips';
import { fireToast } from '../../../../shared/lib/toastEvents';
import { useRememberedState } from '../../../../shared/lib/useRememberedState';
import { PlusIcon } from '../../../../shared/ui/icons';
import { DEFAULT_INVITE_ROLE_ID, useInviteMember } from '../../../users';
import { useContinueHandler, type RegisterContinue } from '../../model/useContinueHandler';
import { FormCard, SetupField } from '../FormCard';

/** Step 2: add the people who use Mavera, several in a row. Reuses the logic of the Add user dialog (users feature). */
export function InviteStep({ register, currentUserId }: { register: RegisterContinue; currentUserId?: string }) {
  const { members, roles, seats, invite } = useInviteMember();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [roleId, setRoleId] = useRememberedState<string>('users', 'add-user-role', DEFAULT_INVITE_ROLE_ID, (value) => roles.some((role) => role.id === value));
  const chosenRole = roles.find((role) => role.id === roleId) ?? roles.find((role) => role.id === DEFAULT_INVITE_ROLE_ID) ?? roles[0];
  const inputWrap = useRef<HTMLDivElement>(null);

  const add = (): boolean => {
    const result = invite(email, chosenRole?.id ?? DEFAULT_INVITE_ROLE_ID);
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    setError(undefined);
    setEmail('');
    fireToast({ type: 'success', message: `${result.member.fullName} was added as ${chosenRole?.name ?? 'a member'}.` });
    inputWrap.current?.querySelector<HTMLElement>('input')?.focus();
    return true;
  };

  // Continue adds a person who was typed but not yet added; an empty box simply moves on.
  useContinueHandler(register, () => (email.trim() ? add() : true));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    add();
  };

  const team = [...members].sort((a, b) => (a.userId === currentUserId ? -1 : b.userId === currentUserId ? 1 : a.fullName.localeCompare(b.fullName)));
  const seatsText = seats.available === null ? 'Your plan has no seat limit.' : `${seats.available} of ${seats.limit} seat${seats.limit === 1 ? '' : 's'} available.`;

  return (
    <div className="mv-setup-stack">
      <FormCard title="Invite people" description={`Add each person by work email and pick what they can do. ${seatsText}`}>
        <form className="mv-setup-invite" onSubmit={submit} noValidate aria-label="Invite a person">
          <div ref={inputWrap} className="mv-setup-invite-email">
            <SetupField label="Work email" type="email" autoFocus value={email} error={error} onChange={(value) => { setEmail(value); setError(undefined); }} placeholder="name@company.com" help="Press Enter to add, then type the next one." autoComplete="off" />
          </div>
          <div className="mv-field mv-setup-field">
            <span>Role</span>
            <FilterChips label="Role" chips={roles.map((role) => ({ value: role.id, label: role.kind === 'custom' ? `${role.name} (custom)` : role.name }))} value={chosenRole?.id ?? DEFAULT_INVITE_ROLE_ID} onChange={setRoleId} />
            {chosenRole?.description && <span className="mv-field-help">{chosenRole.description}</span>}
          </div>
          <div>
            <button type="submit" className="mv-secondary-button" disabled={seats.full}><PlusIcon size={15} style={{ marginRight: '0.375rem' }} />Add person</button>
          </div>
        </form>
      </FormCard>

      <FormCard title="Your team" description={`${members.length} ${members.length === 1 ? 'person' : 'people'} in your organisation.`}>
        <ul className="mv-setup-list" aria-label="Members">
          {team.map((member) => (
            <li key={member.userId} className="mv-setup-list-row">
              <span className="mv-avatar" aria-hidden>{member.fullName.slice(0, 1).toUpperCase()}</span>
              <span className="mv-setup-list-text"><strong>{member.fullName}{member.userId === currentUserId ? ' (you)' : ''}</strong><span className="mv-muted">{member.email}</span></span>
              <span className="mv-status mv-status--neutral">{roles.find((role) => role.id === (member.roleId ?? member.role))?.name ?? (member.roleId === 'owner' || member.role === 'owner' ? 'Owner' : member.role)}</span>
            </li>
          ))}
        </ul>
      </FormCard>
    </div>
  );
}
