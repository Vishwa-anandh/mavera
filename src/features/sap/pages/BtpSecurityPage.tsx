import { useState } from 'react';
import { oneOf, useRememberedState } from '../../../shared/lib/useRememberedState';
import { MOCK_BTP_USERS, MOCK_BTP_ROLE_COLLECTIONS, MOCK_BTP_ROLES } from '../../../demo/sap/mockBtpSecurity';
import { UsersIcon, HierarchyIcon, LockIcon, RefreshIcon } from '../../../shared/ui/icons';
import { DestinationSwitcher } from '../components/DestinationSwitcher';
import { Select } from '../../../shared/ui/Select';
import { SearchField } from '../../../shared/ui/SearchField';
import { PageHeader } from '../../../shared/ui/PageHeader';

const TABS = [
  { key: 'users', label: 'Users', icon: UsersIcon },
  { key: 'collections', label: 'Role Collections', icon: HierarchyIcon },
  { key: 'roles', label: 'Roles', icon: LockIcon },
] as const;

/** New addition — SAP BTP users, role collections and roles for the
 * connected destination, matching MIO's BTP Security Assessment page. */
export function BtpSecurityPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('users');
  const [userSearch, setUserSearch] = useState('');
  const [statusFilter, setStatusFilter] = useRememberedState('sap', 'btp-users-status', 'All', oneOf(['All', 'Active', 'Inactive']));

  return (
    <div>
      <PageHeader title="BTP Security Assessment" subtitle={<>Users, role collections & roles for the connected destination.</>}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <DestinationSwitcher />
          <button className="mv-secondary-button"><RefreshIcon size={14} style={{ marginRight: '0.375rem' }} />Refresh</button>
        </div>
      </PageHeader>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.625rem' }}>
        <div className="mv-segmented">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} className={`mv-segmented-btn${tab === key ? ' is-active' : ''}`} onClick={() => setTab(key)}><Icon size={14} style={{ marginRight: '0.375rem' }} />{label}</button>
          ))}
        </div>
        {tab === 'users' && (
          <div className="mv-filter-bar" role="search" aria-label="Filter BTP users" style={{ marginBottom: 0 }}>
            <SearchField label="Search BTP users" placeholder="Search by name, email, or username" value={userSearch} onChange={setUserSearch} />
            <Select label="Status" hideLabel value={statusFilter} onChange={setStatusFilter} options={['All', 'Active', 'Inactive'].map((v) => ({ value: v, label: v === 'All' ? 'All Status' : v }))} style={{ width: '9.375rem' }} />
          </div>
        )}
      </div>

      {tab === 'users' && (
        <section className="mv-panel">
          <p className="mv-muted" style={{ marginBottom: '0.75rem' }}>{MOCK_BTP_USERS.length} of {MOCK_BTP_USERS.length} users</p>
          <div className="mv-table-wrap">
            <table className="mv-table">
              <thead><tr><th>Full Name</th><th>Username / Email</th><th>Groups</th><th>Status</th><th>Verified</th><th>Last Login</th><th>Created At</th></tr></thead>
              <tbody>
                {MOCK_BTP_USERS.length === 0 && <tr><td colSpan={7} className="mv-muted" style={{ textAlign: 'center', padding: '1.25rem' }}>No Users Found</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {tab === 'collections' && (
        <section className="mv-panel">
          <div className="mv-table-wrap">
            <table className="mv-table">
              <thead><tr><th>Role Collection</th><th className="mv-num">Roles</th><th className="mv-num">Assigned Users</th></tr></thead>
              <tbody>
                {MOCK_BTP_ROLE_COLLECTIONS.length === 0 && <tr><td colSpan={3} className="mv-muted" style={{ textAlign: 'center', padding: '1.25rem' }}>No role collections found</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {tab === 'roles' && (
        <section className="mv-panel">
          <div className="mv-table-wrap">
            <table className="mv-table">
              <thead><tr><th>Role</th><th>Description</th><th>Scope</th></tr></thead>
              <tbody>
                {MOCK_BTP_ROLES.length === 0 && <tr><td colSpan={3} className="mv-muted" style={{ textAlign: 'center', padding: '1.25rem' }}>No roles found</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
