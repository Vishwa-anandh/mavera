import { useMemo, useState } from 'react';
import { ShieldIcon, UsersIcon } from '../../../shared/ui/icons';
import { ClickableRow, RowChevronCell, RowOpenButton } from '../../../shared/ui/ClickableRow';
import { StatusTag } from '../../../shared/ui/StatusTag';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { Pagination } from '../../../shared/ui/Pagination';
import { usePagination } from '../../../shared/ui/usePagination';
import { useConfirm } from '../../../shared/ui/ConfirmProvider';
import { fireToast } from '../../../shared/lib/toastEvents';
import { usePermission, type AccessRole } from '../../access';
import { directoryActions } from '../model/directoryActions';
import type { ProviderGroup } from '../model/providerGroups';
import { MemberDetailsDrawer } from './MemberDetailsDrawer';
import { isMemberPrivileged, memberRoleId, sortMembers, type OrgMember, type SeatSummary } from '../model/userManagementTypes';


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
 * The members table: user, email, role and status, one row each. Opening a row shows the member's
 * drawer, which holds everything that can be changed (role, per-provider access, alert e-mails,
 * Elevate / Activate / Deactivate). Every control that changes something needs Edit on User
 * Management; without it the drawer reads as plain facts.
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
  const [openId, setOpenId] = useState<string | null>(null);
  const paging = usePagination(filtered, 10, searchTerm);

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

  const open = members.find((member) => member.userId === openId);

  return (
    <>
      <div className="mv-table-wrap">
        <table className="mv-table mv-table--stack mv-members-table">
          <caption className="mv-sr-only">Members of your organisation, with their email, role and status. Open a member to change their role, access and alerts.</caption>
          <thead>
            <tr>
              <th scope="col">User</th>
              <th scope="col">Email</th>
              <th scope="col">Role</th>
              <th scope="col">Status</th>
              <th scope="col" aria-hidden="true" />
            </tr>
          </thead>
          <tbody>
            {paging.pageItems.map((member) => {
              const privileged = isMemberPrivileged(member);
              const isSelf = member.userId === currentUserId;
              return (
                <ClickableRow key={member.userId} onOpen={() => setOpenId(member.userId)}>
                  <td className="mv-stack-title">
                    <div className="mv-member-cell">
                      <span className="mv-member-avatar" aria-hidden>{member.fullName.charAt(0).toUpperCase()}</span>
                      <div className="mv-member-name">
                        <RowOpenButton onOpen={() => setOpenId(member.userId)}><strong>{member.fullName}</strong></RowOpenButton>
                        {privileged && <ShieldIcon size={12} style={{ color: 'var(--mv-primary)' }} aria-label="Administrator" />}
                        {isSelf && <span className="mv-status mv-status--neutral mv-you-badge">You</span>}
                      </div>
                    </div>
                  </td>
                  <td data-label="Email" className="mv-muted mv-member-email">{member.email}</td>
                  <td data-label="Role">{roleName(memberRoleId(member))}</td>
                  <td data-label="Status"><StatusTag tone={member.status === 'active' ? 'success' : 'danger'}>{member.status === 'active' ? 'Active' : 'Inactive'}</StatusTag></td>
                  <RowChevronCell />
                </ClickableRow>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination {...paging} noun={`member${filtered.length !== 1 ? 's' : ''}`} />
      {open && (
        <MemberDetailsDrawer
          member={open}
          roles={roles}
          isSelf={open.userId === currentUserId}
          canEdit={canEdit}
          seats={seats}
          visibleProviders={visibleProviders}
          showInvoiceColumn={showInvoiceColumn}
          onClose={() => setOpenId(null)}
          onChangeRole={(roleId) => changeRole(open, roleId)}
          onElevate={() => void elevate(open)}
          onToggleStatus={() => toggleStatus(open)}
          onSetAlerts={(enabled) => setAlerts(open, enabled)}
          onSetProviderAccess={(patch, label, before, after) => directoryActions.setProviderAccess(open.userId, patch, label, before, after)}
        />
      )}
    </>
  );
}
