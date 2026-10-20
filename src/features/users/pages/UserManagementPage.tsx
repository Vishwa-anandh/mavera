import { useCallback, useEffect, useRef, useState } from 'react';
import { accessRepository } from '../../../data-access';
import { useAuth } from '../../auth';
import { Can, buildSelfMember, useAccessDirectory, usePermission } from '../../access';
import { SearchIcon, PlusIcon } from '../../../shared/ui/icons';
import { useConfirm } from '../../../shared/ui/ConfirmProvider';
import { TabBar } from '../../../shared/ui/TabBar';
import { useHashTab } from '../../../shared/lib/useHashTab';
import { fireToast } from '../../../shared/lib/toastEvents';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { alertRecipients, seatSummary, type OrgMember } from '../model/userManagementTypes';
import { directoryActions } from '../model/directoryActions';
import { AddUserDialog } from '../components/AddUserDialog';
import { MembersSection } from '../components/MembersSection';
import { PROVIDER_GROUPS } from '../model/providerGroups';
import { PermissionsSection } from '../components/PermissionsSection';
import { RolesSection } from '../components/RolesSection';

const DEFAULT_PERMISSIONS_ROLE = 'analyst';

type UsersTab = 'members' | 'roles' | 'permissions';
const TABS: UsersTab[] = ['members', 'roles', 'permissions'];

/**
 * One page for people and what they may do, in three tabs (the owner asked for tabs here): the members
 * (role, cloud access, alerts, status), the roles (system and custom), and the permission matrix for the
 * role you pick. The active tab lives in the URL hash (#members, #roles, #permissions) so it can be linked to.
 * Provider columns are derived from the org's own `cloudAccess` (the same subscription source of truth the
 * Subscription page edits). Data lives in the in-memory access directory (data-access).
 */
export function UserManagementPage() {
  const { user, isDemoSession, cloudAccess, invoiceOnly, maxUsers } = useAuth();
  const confirm = useConfirm();
  const { members, roles } = useAccessDirectory();
  const canCreateUser = usePermission('users', 'CREATE');
  const canViewRoles = usePermission('roles', 'VIEW');
  const canCreateRole = usePermission('roles', 'CREATE');
  const [searchTerm, setSearchTerm] = useState('');
  const [adding, setAdding] = useState(false);
  const [addingRole, setAddingRole] = useState(false);
  const [permissionsRoleId, setPermissionsRoleId] = useState(DEFAULT_PERMISSIONS_ROLE);
  const dirtyRef = useRef(false);
  const [hashTab, showTab] = useHashTab(TABS);
  const tab: UsersTab = hashTab === 'members' || canViewRoles ? hashTab : 'members';

  // The signed-in user is always in the directory (the access provider adds them too; this covers isolated renders).
  useEffect(() => {
    if (user) accessRepository.ensureMember(buildSelfMember(user, isDemoSession));
  }, [user, isDemoSession]);

  const visibleProviders = PROVIDER_GROUPS.filter((p) => cloudAccess.includes(p.id));
  const showInvoiceColumn = invoiceOnly;
  const seats = seatSummary(members, maxUsers);

  const addMember = (member: OrgMember) => {
    directoryActions.addMember(member);
    setAdding(false);
    fireToast({ type: 'success', message: `${member.fullName} was added to your organisation.` });
  };

  const onDirtyChange = useCallback((dirty: boolean) => {
    dirtyRef.current = dirty;
  }, []);

  /** Switches the matrix to another role, asking first when edits to the current one would be lost. */
  const selectRole = useCallback(
    async (roleId: string, scroll = false) => {
      if (roleId !== permissionsRoleId && dirtyRef.current) {
        const ok = await confirm({ title: 'Discard unsaved changes?', description: 'You have unsaved permission changes. Switching roles discards them.', okText: 'Discard changes', variant: 'warning' });
        if (!ok) return;
        dirtyRef.current = false;
      }
      setPermissionsRoleId(roleId);
      if (scroll) showTab('permissions');
    },
    [confirm, permissionsRoleId, showTab],
  );

  const duplicateFromMatrix = (roleId: string) => {
    const id = directoryActions.duplicateRole(roleId);
    if (!id) return;
    fireToast({ type: 'success', message: 'Role duplicated. You can edit the copy below.' });
    void selectRole(id);
  };

  const recipients = alertRecipients(members);

  return (
    <div className="mv-users-page">
      <PageHeader title="User Management" subtitle="Manage your organisation’s members, their roles and what each role can do.">
        <div className="mv-heading-actions">
          {tab === 'members' && (
            <label className="mv-filter-search mv-heading-search">
              <SearchIcon size={16} />
              <input type="search" aria-label="Search members" placeholder="Search members…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </label>
          )}
          <Can module="users" action="CREATE">
            <button type="button" className="mv-primary-button" disabled={seats.full} onClick={() => setAdding(true)}>
              <PlusIcon size={16} style={{ marginRight: '0.375rem' }} />
              Add user
            </button>
          </Can>
        </div>
      </PageHeader>

      <p className="mv-muted mv-scope-note">
        {seats.limit === null
          ? `${seats.used} active member${seats.used === 1 ? '' : 's'} · no seat limit`
          : seats.full
            ? `All ${seats.limit} seats are in use — deactivate a member, or ask Maitsys to add seats, to add another user.`
            : `${seats.used} of ${seats.limit} seats used · ${seats.available} available`}
        {' '}· {recipients} receive{recipients === 1 ? 's' : ''} alert e-mails
        {(visibleProviders.length > 0 || showInvoiceColumn) && (
          <> · Showing: {[...visibleProviders.map((p) => p.label), showInvoiceColumn && 'Invoice'].filter(Boolean).join(' · ')}</>
        )}
      </p>
      {canViewRoles && (
        <TabBar
          idPrefix="users"
          label="User management sections"
          activeId={tab}
          onChange={(id) => showTab(id as UsersTab)}
          items={[{ id: 'members', label: 'Members', count: members.length }, { id: 'roles', label: 'Roles', count: roles.length }, { id: 'permissions', label: 'Permissions' }]}
        />
      )}

      {tab === 'members' && (
      <section id="users-panel-members" role={canViewRoles ? 'tabpanel' : undefined} aria-labelledby={canViewRoles ? 'users-tab-members' : 'members-title'} className="mv-users-section">
        <div className="mv-section-head">
          <h2 className="mv-section-title" id="members-title">Members</h2>
          <p className="mv-muted">Everyone in your organisation, their role and the cloud accounts they can reach.</p>
        </div>
        <div className="mv-panel mv-panel--table">
          <MembersSection
            members={members}
            roles={roles}
            currentUserId={user?.id}
            searchTerm={searchTerm}
            onClearSearch={() => setSearchTerm('')}
            onAddUser={() => setAdding(true)}
            seats={seats}
            visibleProviders={visibleProviders}
            showInvoiceColumn={showInvoiceColumn}
          />
        </div>
      </section>
      )}

      {canViewRoles && tab === 'roles' && (
        <section id="users-panel-roles" role="tabpanel" aria-labelledby="users-tab-roles" className="mv-users-section">
          <div className="mv-section-head">
            <div>
              <h2 className="mv-section-title" id="roles-title">Roles</h2>
              <p className="mv-muted">Four built-in roles, plus any you create. A role decides which pages a member sees and what they can change.</p>
            </div>
            {canCreateRole && (
              <button type="button" className="mv-secondary-button" onClick={() => setAddingRole(true)}>
                <PlusIcon size={16} style={{ marginRight: '0.375rem' }} />
                Add role
              </button>
            )}
          </div>
          <div className="mv-panel mv-panel--table">
            <RolesSection
              roles={roles}
              members={members}
              onEditPermissions={(roleId) => void selectRole(roleId, true)}
              adding={addingRole}
              onCloseAdd={() => setAddingRole(false)}
            />
          </div>
        </section>
      )}

      {canViewRoles && tab === 'permissions' && (
        <section id="users-panel-permissions" role="tabpanel" aria-labelledby="users-tab-permissions" className="mv-users-section">
          <div className="mv-section-head">
            <div>
              <h2 className="mv-section-title" id="permissions-title">Permissions</h2>
              <p className="mv-muted">Choose a role to see, and for custom roles change, what it can do in each part of Mavera.</p>
            </div>
          </div>
          <div className="mv-panel">
            <PermissionsSection
              roles={roles}
              selectedRoleId={permissionsRoleId}
              onSelectRole={(roleId) => void selectRole(roleId)}
              onDirtyChange={onDirtyChange}
              onDuplicate={duplicateFromMatrix}
            />
          </div>
        </section>
      )}

      {adding && canCreateUser && (
        <AddUserDialog members={members} seats={seats} providers={visibleProviders} roles={roles} onCancel={() => setAdding(false)} onAdd={addMember} />
      )}
    </div>
  );
}
