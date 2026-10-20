import { Fragment, useMemo } from 'react';
import { CheckIcon, PersonXIcon, ShieldIcon, UsersIcon } from '../../../shared/ui/icons';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { Pagination } from '../../../shared/ui/Pagination';
import { Select } from '../../../shared/ui/Select';
import { Tooltip } from '../../../shared/ui/Tooltip';
import { usePagination } from '../../../shared/ui/usePagination';
import { useConfirm } from '../../../shared/ui/ConfirmProvider';
import { fireToast } from '../../../shared/lib/toastEvents';
import { usePermission, type AccessRole } from '../../access';
import { directoryActions } from '../model/directoryActions';
import type { ProviderGroup } from '../model/providerGroups';
import { isMemberPrivileged, memberRoleId, sortMembers, type OrgMember, type SeatSummary } from '../model/userManagementTypes';


function Toggle({ checked, onChange, disabled, label }: { checked: boolean; onChange: (value: boolean) => void; disabled?: boolean; label: string }) {
  return <button type="button" className="mv-toggle" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)} />;
}

function StatusBadge({ status }: { status: OrgMember['status'] }) {
  return <span className={`mv-status ${status === 'active' ? 'mv-status--success' : 'mv-status--danger'}`}>{status === 'active' ? 'Active' : 'Inactive'}</span>;
}

const cellLabel = (text: string) => <span className="mv-muted mv-cell-caption">{text}</span>;

/** View-access cell: always-on and disabled for admins/owners, otherwise a plain on/off toggle. */
function ViewCell({ privileged, readOnly, checked, name, provider, onToggle }: { privileged: boolean; readOnly: boolean; checked: boolean; name: string; provider: string; onToggle: (value: boolean) => void }) {
  return (
    <td className="mv-cell-center mv-cell-divided">
      <div className="mv-cell-stack">
        <Toggle checked={privileged || checked} disabled={privileged || readOnly} onChange={onToggle} label={`${provider} view access for ${name}`} />
        {cellLabel(privileged ? 'Always On' : checked ? 'On' : 'Off')}
      </div>
    </td>
  );
}

/** Full-access cell: a dash when the member can't view this provider at all (nothing to grant read-only vs. full on). */
function AccessCell({ privileged, readOnly, canView, isReadOnly, name, provider, onToggle }: { privileged: boolean; readOnly: boolean; canView: boolean; isReadOnly: boolean; name: string; provider: string; onToggle: (value: boolean) => void }) {
  if (!privileged && !canView) {
    return <td className="mv-cell-center"><span className="mv-muted">—</span></td>;
  }
  const isFullAccess = privileged || !isReadOnly;
  return (
    <td className="mv-cell-center">
      <div className="mv-cell-stack">
        <Toggle checked={isFullAccess} disabled={privileged || readOnly} onChange={onToggle} label={`${provider} full access for ${name}`} />
        {cellLabel(isFullAccess ? 'Full' : 'Read Only')}
      </div>
    </td>
  );
}

interface MembersSectionProps {
  members: OrgMember[];
  roles: AccessRole[];
  currentUserId: string | undefined;
  searchTerm: string;
  onClearSearch: () => void;
  onAddUser: () => void;
  seats: SeatSummary;
  visibleProviders: ProviderGroup[];
  showInvoiceColumn: boolean;
}

/**
 * The members table: role (a select), per-provider view and full access, the alert e-mail switch,
 * status, and the Elevate / Activate / Deactivate actions. Every control that changes something
 * needs Edit on User Management; without it the table reads as plain facts.
 */
export function MembersSection({ members, roles, currentUserId, searchTerm, onClearSearch, onAddUser, seats, visibleProviders, showInvoiceColumn }: MembersSectionProps) {
  const confirm = useConfirm();
  const canEdit = usePermission('users', 'EDIT');
  const canCreate = usePermission('users', 'CREATE');

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const base = term ? members.filter((m) => m.fullName.toLowerCase().includes(term) || m.email.toLowerCase().includes(term)) : members;
    return sortMembers(base, currentUserId);
  }, [members, searchTerm, currentUserId]);
  const paging = usePagination(filtered, 10, searchTerm);

  /** Owner is shown for the Owner but can't be handed out from here (ownership transfer is its own action). */
  const optionsFor = (current: string) =>
    roles.map((role) => ({ value: role.id, label: role.kind === 'custom' ? `${role.name} (custom)` : role.name, disabled: role.id === 'owner' && current !== 'owner' }));
  const roleName = (id: string) => roles.find((role) => role.id === id)?.name ?? id;

  const changeRole = (member: OrgMember, roleId: string) => {
    if (roleId === memberRoleId(member)) return;
    directoryActions.setMemberRole(member.userId, roleId);
    fireToast({ type: 'success', message: `${member.fullName} is now ${roleName(roleId)}.` });
  };

  const elevate = async (member: OrgMember) => {
    const ok = await confirm({
      title: `Elevate ${member.fullName} to Admin?`,
      description: 'Admins can manage members, roles and every part of the product except ownership transfer and the subscription. You can change their role again at any time.',
      okText: 'Elevate to Admin',
    });
    if (!ok) return;
    directoryActions.setMemberRole(member.userId, 'admin', 'Member elevated to Admin');
    fireToast({ type: 'success', message: `${member.fullName} is now an Admin.` });
  };

  const toggleStatus = (member: OrgMember) => {
    const next = member.status === 'active' ? 'inactive' : 'active';
    directoryActions.setMemberStatus(member.userId, next);
    fireToast({ type: 'success', message: next === 'active' ? `${member.fullName} was activated.` : `${member.fullName} was deactivated.` });
  };

  const setAlerts = (member: OrgMember, enabled: boolean) => {
    directoryActions.setMemberAlerts(member.userId, enabled);
    fireToast({ type: 'success', message: `Alert e-mails ${enabled ? 'on' : 'off'} for ${member.fullName}.` });
  };

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={<UsersIcon size={28} />}
        heading="No members found"
        explanation={searchTerm ? `Nobody matches “${searchTerm}”. Check the spelling or search by email.` : 'Add your first member to share access.'}
        actionLabel={searchTerm ? 'Clear search' : canCreate ? 'Add user' : undefined}
        onAction={searchTerm ? onClearSearch : canCreate ? onAddUser : undefined}
      />
    );
  }

  return (
    <>
      <div className="mv-table-wrap">
        <table className="mv-table mv-members-table">
          <caption className="mv-sr-only">Members of your organisation, with their role, cloud access, alert e-mails and status</caption>
          <thead>
            <tr>
              <th />
              <th />
              {visibleProviders.map((p) => (
                <th key={p.id} colSpan={2} scope="colgroup" className="mv-cell-center mv-cell-divided">
                  <span className="mv-provider-head">
                    <span aria-hidden className="mv-provider-dot" style={{ background: p.dot }} />
                    {p.label}
                  </span>
                </th>
              ))}
              {showInvoiceColumn && <th className="mv-cell-center mv-cell-divided"><span className="mv-provider-head">Invoice</span></th>}
              <th className="mv-cell-divided" />
              <th className="mv-cell-divided" />
            </tr>
            <tr>
              <th scope="col" style={{ textAlign: 'left' }}>User</th>
              <th scope="col" className="mv-cell-divided">Role</th>
              {visibleProviders.map((p) => (
                <Fragment key={p.id}>
                  <th scope="col" className="mv-cell-center mv-cell-divided">View</th>
                  <th scope="col" className="mv-cell-center">Full Access</th>
                </Fragment>
              ))}
              {showInvoiceColumn && <th scope="col" className="mv-cell-center mv-cell-divided">View</th>}
              <th scope="col" className="mv-cell-center mv-cell-divided">Alerts</th>
              <th scope="col" className="mv-cell-center mv-cell-divided">Status &amp; actions</th>
            </tr>
          </thead>
          <tbody>
            {paging.pageItems.map((member) => {
              const privileged = isMemberPrivileged(member);
              const isSelf = member.userId === currentUserId;
              const roleId = memberRoleId(member);
              const isOwner = roleId === 'owner';
              const roleLocked = !canEdit || isSelf || isOwner;
              const statusBlocked = isSelf || isOwner || (member.status === 'inactive' && seats.full);
              return (
                <tr key={member.userId}>
                  <td>
                    <div className="mv-member-cell">
                      <span className="mv-member-avatar" aria-hidden>{member.fullName.charAt(0).toUpperCase()}</span>
                      <div className="mv-member-text">
                        <div className="mv-member-name">
                          <strong>{member.fullName}</strong>
                          {privileged && <ShieldIcon size={12} style={{ color: 'var(--mv-primary)' }} aria-label="Administrator" />}
                          {isSelf && <span className="mv-status mv-status--neutral mv-you-badge">You</span>}
                        </div>
                        <p className="mv-muted mv-member-email">{member.email}</p>
                      </div>
                    </div>
                  </td>

                  <td className="mv-cell-divided mv-member-role">
                    <Select
                      label={`Role for ${member.fullName}`}
                      hideLabel
                      value={roleId}
                      options={optionsFor(roleId)}
                      disabled={roleLocked}
                      onChange={(value) => changeRole(member, value)}
                    />
                    {isSelf ? (
                      <span className="mv-muted mv-cell-caption">Your own role can’t be changed here</span>
                    ) : isOwner ? (
                      <span className="mv-muted mv-cell-caption">The Owner can’t be changed</span>
                    ) : null}
                  </td>

                  {visibleProviders.map((p) => {
                    const viewKey = `canView${p.id[0].toUpperCase()}${p.id.slice(1)}` as keyof OrgMember;
                    const readOnlyKey = `${p.id}ReadOnly` as keyof OrgMember;
                    // BTP quirk from the reference app: undefined means viewable for BTP, but NOT viewable for every other provider.
                    const checked = p.id === 'btp' ? member.canViewBtp !== false : Boolean(member[viewKey]);
                    const isReadOnly = Boolean(member[readOnlyKey]);
                    return (
                      <Fragment key={p.id}>
                        <ViewCell
                          privileged={privileged}
                          readOnly={!canEdit}
                          checked={checked}
                          name={member.fullName}
                          provider={p.label}
                          onToggle={(value) =>
                            directoryActions.setProviderAccess(member.userId, { [viewKey]: value } as Partial<OrgMember>, `${p.label} view`, checked ? 'On' : 'Off', value ? 'On' : 'Off')
                          }
                        />
                        <AccessCell
                          privileged={privileged}
                          readOnly={!canEdit}
                          canView={checked}
                          isReadOnly={isReadOnly}
                          name={member.fullName}
                          provider={p.label}
                          onToggle={(value) =>
                            directoryActions.setProviderAccess(member.userId, { [readOnlyKey]: !value } as Partial<OrgMember>, `${p.label} access`, isReadOnly ? 'Read only' : 'Full', value ? 'Full' : 'Read only')
                          }
                        />
                      </Fragment>
                    );
                  })}

                  {showInvoiceColumn && <ViewCell privileged={privileged} readOnly checked name={member.fullName} provider="Invoice" onToggle={() => {}} />}

                  <td className="mv-cell-center mv-cell-divided">
                    <div className="mv-cell-stack">
                      <Toggle
                        checked={Boolean(member.alertsEnabled)}
                        disabled={!canEdit}
                        onChange={(value) => setAlerts(member, value)}
                        label={`Alert e-mails for ${member.fullName}`}
                      />
                      {cellLabel(member.alertsEnabled ? 'On' : 'Off')}
                    </div>
                  </td>

                  <td className="mv-cell-divided">
                    <div className="mv-cell-stack mv-status-actions">
                      <StatusBadge status={member.status} />
                      {canEdit && !privileged && !isSelf && (
                        <button type="button" className="mv-icon-button mv-row-action" onClick={() => void elevate(member)} aria-label={`Elevate ${member.fullName} to Admin`}>
                          <ShieldIcon size={13} />
                          Elevate
                        </button>
                      )}
                      {canEdit && (() => {
                        const button = (
                          <button
                            type="button"
                            className={`mv-icon-button mv-row-action ${member.status === 'active' ? 'mv-row-action--danger' : 'mv-row-action--success'}`}
                            disabled={statusBlocked}
                            aria-label={`${member.status === 'active' ? 'Deactivate' : 'Activate'} ${member.fullName}`}
                            onClick={() => toggleStatus(member)}
                          >
                            {member.status === 'active' ? <PersonXIcon size={14} /> : <CheckIcon size={12} />}
                            {member.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                        );
                        // Disabled controls don't reliably receive focus/hover for a tooltip to attach to, so the explanation is adjacent text instead (MAVERA_DESIGN_SYSTEM.md §10.1).
                        if (isSelf) return <>{button}<span className="mv-muted mv-cell-caption">Cannot deactivate yourself</span></>;
                        if (isOwner) return <>{button}<span className="mv-muted mv-cell-caption">The Owner can’t be deactivated</span></>;
                        return <Tooltip content={member.status === 'active' ? 'Deactivate user' : 'Activate user'}>{button}</Tooltip>;
                      })()}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination {...paging} noun={`member${filtered.length !== 1 ? 's' : ''}`} />
    </>
  );
}
