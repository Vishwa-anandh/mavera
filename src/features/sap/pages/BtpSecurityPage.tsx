import { useEffect, useRef, useState } from 'react';
import { oneOf, useRememberedState } from '../../../shared/lib/useRememberedState';
import { useHashTab } from '../../../shared/lib/useHashTab';
import { fireToast } from '../../../shared/lib/toastEvents';
import { activityRepository } from '../../../data-access';
import { SapConnectionGate } from '../components/SapConnectionGate';
import { LockIcon, RefreshIcon } from '../../../shared/ui/icons';
import { DestinationSwitcher } from '../components/DestinationSwitcher';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { FilterBar } from '../../../shared/ui/FilterBar';
import { Select } from '../../../shared/ui/Select';
import { SearchField } from '../../../shared/ui/SearchField';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { TabBar, tabPanelProps } from '../../../shared/ui/TabBar';

type BtpTab = 'users' | 'collections' | 'roles';
const TABS: BtpTab[] = ['users', 'collections', 'roles'];

const STATUS_OPTIONS = ['All', 'Active', 'Inactive'] as const;

/** Time it takes the (demo) assessment to come back, so Refresh visibly does something. */
const REFRESH_MS = 600;

/**
 * SAP BTP users, role collections and roles for the connected destination (MIO's BTP Security Assessment page).
 * Three tabs (`#users`, `#collections`, `#roles`; the last one used is remembered). Refresh reads the assessment
 * again and says what came back, so it is never a button that does nothing. A destination with nothing to list
 * says so instead of showing an empty table.
 */
function BtpSecurityPageContent() {
  const [snapshot, setSnapshot] = useState(() => activityRepository.getBtpSecurity());
  const { users, roleCollections, roles } = snapshot;
  const [tab, setTab] = useHashTab(TABS, TABS[0], { remember: 'sap-btp-security' });
  const [userSearch, setUserSearch] = useState('');
  const [statusFilter, setStatusFilter] = useRememberedState<(typeof STATUS_OPTIONS)[number]>('sap', 'btp-users-status', 'All', oneOf(STATUS_OPTIONS));
  const [refreshing, setRefreshing] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const refresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    timer.current = window.setTimeout(() => {
      const next = activityRepository.getBtpSecurity();
      setSnapshot(next);
      setRefreshing(false);
      const total = next.users.length + next.roleCollections.length + next.roles.length;
      fireToast({
        type: total > 0 ? 'success' : 'info',
        message: total > 0
          ? `BTP security refreshed: ${next.users.length} users, ${next.roleCollections.length} role collections, ${next.roles.length} roles.`
          : 'BTP security refreshed. This destination returned no users, role collections or roles.',
      });
    }, REFRESH_MS);
  };

  const query = userSearch.trim().toLowerCase();
  const visibleUsers = users.filter((u) =>
    (statusFilter === 'All' || u.status === statusFilter)
    && (query === '' || [u.fullName, u.usernameEmail].some((text) => text.toLowerCase().includes(query))));

  const empty = (what: string) => (
    <EmptyState
      icon={<LockIcon size={28} />}
      heading={`No ${what} found`}
      explanation={`The connected destination returned no ${what}. Refresh to read them again.`}
      actionLabel={refreshing ? 'Refreshing…' : 'Refresh'}
      onAction={refresh}
    />
  );

  return (
    <div>
      <PageHeader title="BTP Security Assessment" subtitle="Users, role collections & roles for the connected destination.">
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <DestinationSwitcher />
          <button type="button" className="mv-secondary-button" onClick={refresh} disabled={refreshing} aria-busy={refreshing}>
            <RefreshIcon size={14} style={{ marginRight: '0.375rem' }} />{refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </PageHeader>

      <TabBar
        idPrefix="btp-security"
        label="BTP security sections"
        activeId={tab}
        onChange={(id) => setTab(id as BtpTab)}
        items={[
          { id: 'users', label: 'Users', count: users.length },
          { id: 'collections', label: 'Role Collections', count: roleCollections.length },
          { id: 'roles', label: 'Roles', count: roles.length },
        ]}
      />

      {tab === 'users' && (
        <section className="mv-panel" {...tabPanelProps('btp-security', 'users')}>
          <FilterBar label="Filter BTP users">
            <SearchField label="Search BTP users" placeholder="Search by name, email, or username" value={userSearch} onChange={setUserSearch} />
            <Select label="Status" hideLabel value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS.map((v) => ({ value: v, label: v === 'All' ? 'All Status' : v }))} style={{ width: '9.375rem' }} />
          </FilterBar>
          {users.length === 0 ? empty('users') : (
            <>
              <p className="mv-muted" style={{ margin: '0.75rem 0' }}>{visibleUsers.length} of {users.length} users</p>
              <div className="mv-table-wrap">
                <table className="mv-table mv-table--stack">
                  <thead><tr><th>Full Name</th><th>Username / Email</th><th>Groups</th><th>Status</th><th>Verified</th><th>Last Login</th><th>Created At</th></tr></thead>
                  <tbody>
                    {visibleUsers.length === 0 && <tr><td colSpan={7} className="mv-muted" style={{ textAlign: 'center', padding: '1.25rem' }}>No users match these filters</td></tr>}
                    {visibleUsers.map((u) => (
                      <tr key={u.usernameEmail}>
                        <td data-label="Full Name" className="mv-stack-title"><strong>{u.fullName}</strong></td>
                        <td data-label="Username / Email">{u.usernameEmail}</td>
                        <td data-label="Groups">{u.groups.join(', ') || '—'}</td>
                        <td data-label="Status"><span className={`mv-status mv-status--${u.status === 'Active' ? 'success' : 'neutral'}`}>{u.status}</span></td>
                        <td data-label="Verified">{u.verified ? 'Yes' : 'No'}</td>
                        <td data-label="Last Login" className="mv-date">{u.lastLogin ?? 'Never'}</td>
                        <td data-label="Created At" className="mv-date">{u.createdAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}
      {tab === 'collections' && (
        <section className="mv-panel" {...tabPanelProps('btp-security', 'collections')}>
          {roleCollections.length === 0 ? empty('role collections') : (
            <div className="mv-table-wrap">
              <table className="mv-table mv-table--stack">
                <thead><tr><th>Role Collection</th><th className="mv-num">Roles</th><th className="mv-num">Assigned Users</th></tr></thead>
                <tbody>
                  {roleCollections.map((c) => (
                    <tr key={c.name}>
                      <td data-label="Role Collection" className="mv-stack-title"><strong>{c.name}</strong></td>
                      <td data-label="Roles" className="mv-num">{c.roles}</td>
                      <td data-label="Assigned Users" className="mv-num">{c.assignedUsers}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
      {tab === 'roles' && (
        <section className="mv-panel" {...tabPanelProps('btp-security', 'roles')}>
          {roles.length === 0 ? empty('roles') : (
            <div className="mv-table-wrap">
              <table className="mv-table mv-table--stack">
                <thead><tr><th>Role</th><th>Description</th><th>Scope</th></tr></thead>
                <tbody>
                  {roles.map((r) => (
                    <tr key={r.name}>
                      <td data-label="Role" className="mv-stack-title"><strong>{r.name}</strong></td>
                      <td data-label="Description">{r.description}</td>
                      <td data-label="Scope">{r.scope}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export function BtpSecurityPage() {
  return (
    <SapConnectionGate title="BTP Security Assessment" subtitle="Users, role collections & roles for the connected destination." willShow="BTP users, role collections and roles">
      <BtpSecurityPageContent />
    </SapConnectionGate>
  );
}
