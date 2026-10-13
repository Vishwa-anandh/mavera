import { useState } from 'react';
import { oneOf, useRememberedState } from '../../../shared/lib/useRememberedState';
import { AppBreadcrumb } from '../../../shared/ui/AppBreadcrumb';
import { MOCK_BTP_USERS, MOCK_BTP_ROLE_COLLECTIONS, MOCK_BTP_ROLES } from '../../../demo/sap/mockBtpSecurity';
import { UsersIcon, HierarchyIcon, LockIcon, RefreshIcon, SearchIcon } from '../../../shared/ui/icons';
import { DestinationSwitcher } from '../components/DestinationSwitcher';
import { Select } from '../../../shared/ui/Select';

const TABS = [
  { key: 'users', label: 'Users', icon: UsersIcon },
  { key: 'collections', label: 'Role Collections', icon: HierarchyIcon },
  { key: 'roles', label: 'Roles', icon: LockIcon },
] as const;

/** New addition — SAP BTP users, role collections and roles for the
 * connected destination, matching MIO's BTP Security Assessment page. */
export function BtpSecurityPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('users');
  const [statusFilter, setStatusFilter] = useRememberedState('sap', 'btp-users-status', 'All', oneOf(['All', 'Active', 'Inactive']));

  return (
    <div>
      <AppBreadcrumb items={[{ label: 'SAP Monitoring', path: '/sap/systems' }, { label: 'BTP Security Assessment' }]} />
      <div className="mv-page-heading">
        <div><h1 className="mv-title">BTP Security Assessment</h1><p className="mv-subtitle">Users, role collections & roles for the connected destination.</p></div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <DestinationSwitcher />
          <button className="mv-secondary-button"><RefreshIcon size={14} style={{ marginRight: 6 }} />Refresh</button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div className="mv-segmented">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} className={`mv-segmented-btn${tab === key ? ' is-active' : ''}`} onClick={() => setTab(key)}><Icon size={14} style={{ marginRight: 6 }} />{label}</button>
          ))}
        </div>
        {tab === 'users' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative' }}>
              <SearchIcon size={15} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--mv-text-muted)' }} />
              <input className="mv-select" style={{ paddingLeft: 32, width: 260 }} placeholder="Search by name, email, or username" />
            </div>
            <Select label="Status" hideLabel value={statusFilter} onChange={setStatusFilter} options={['All', 'Active', 'Inactive'].map((v) => ({ value: v, label: v === 'All' ? 'All Status' : v }))} style={{ width: 150 }} />
          </div>
        )}
      </div>

      {tab === 'users' && (
        <section className="mv-panel">
          <p className="mv-muted" style={{ marginBottom: 12 }}>{MOCK_BTP_USERS.length} of {MOCK_BTP_USERS.length} users</p>
          <div className="mv-table-wrap">
            <table className="mv-table">
              <thead><tr><th>Full Name</th><th>Username / Email</th><th>Groups</th><th>Status</th><th>Verified</th><th>Last Login</th><th>Created At</th></tr></thead>
              <tbody>
                {MOCK_BTP_USERS.length === 0 && <tr><td colSpan={7} className="mv-muted" style={{ textAlign: 'center', padding: 20 }}>No Users Found</td></tr>}
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
                {MOCK_BTP_ROLE_COLLECTIONS.length === 0 && <tr><td colSpan={3} className="mv-muted" style={{ textAlign: 'center', padding: 20 }}>No role collections found</td></tr>}
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
                {MOCK_BTP_ROLES.length === 0 && <tr><td colSpan={3} className="mv-muted" style={{ textAlign: 'center', padding: 20 }}>No roles found</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
