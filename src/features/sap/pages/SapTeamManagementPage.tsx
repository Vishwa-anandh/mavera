import { useState } from 'react';
import { AppBreadcrumb } from '../../../shared/ui/AppBreadcrumb';
import { MOCK_SAP_TEAM, type SapTeamMember } from '../../../demo/sap/mockTeamManagement';
import { RefreshIcon, ChevronLeftIcon, ChevronRightIcon } from '../../../shared/ui/icons';
import { DestinationSwitcher } from '../components/DestinationSwitcher';

const PAGE_SIZE = 8;

/** New addition — this module's own access/notification roster, matching
 * MIO's Team Management page (distinct from the org-wide /users page). */
export function SapTeamManagementPage() {
  const [members, setMembers] = useState<SapTeamMember[]>(MOCK_SAP_TEAM);
  const [page, setPage] = useState(1);
  const activeCount = members.filter((m) => m.status === 'Active').length;
  const pageCount = Math.max(1, Math.ceil(members.length / PAGE_SIZE));
  const pageRows = members.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const [accessChangeFor, setAccessChangeFor] = useState<SapTeamMember | null>(null);

  const toggleAlerts = (id: string) => setMembers((cur) => cur.map((m) => (m.id === id ? { ...m, priorityAlerts: !m.priorityAlerts } : m)));
  const toggleStatus = (id: string) => setMembers((cur) => cur.map((m) => (m.id === id ? { ...m, status: m.status === 'Active' ? 'Inactive' : 'Active' } : m)));
  const remove = (id: string) => setMembers((cur) => cur.filter((m) => m.id !== id));
  const setAccess = (id: string, access: SapTeamMember['access']) => {
    setMembers((cur) => cur.map((m) => (m.id === id ? { ...m, access } : m)));
    const member = members.find((m) => m.id === id);
    if (member) setAccessChangeFor({ ...member, access });
  };

  return (
    <div>
      <AppBreadcrumb items={[{ label: 'SAP Monitoring', path: '/sap/systems' }, { label: 'Team Management' }]} />
      <div className="mv-page-heading">
        <div><h1 className="mv-title">Team Management</h1><p className="mv-subtitle">{members.length} Members · {activeCount} Active</p></div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <DestinationSwitcher />
          <button className="mv-icon-button" aria-label="Refresh"><RefreshIcon size={16} /></button>
        </div>
      </div>

      <section className="mv-panel">
        <div className="mv-table-wrap">
          <table className="mv-table">
            <thead><tr><th>Member</th><th>Role</th><th>Access</th><th>Alerts</th><th>Status</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {pageRows.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="mv-avatar">{m.name.slice(0, 1)}</span>
                      <div><strong>{m.name}</strong><div className="mv-muted" style={{ fontSize: 12 }}>{m.email}</div></div>
                    </div>
                  </td>
                  <td><span className={`mv-status ${m.role === 'ADMIN' ? 'mv-status--success' : 'mv-status--neutral'}`}>{m.role}</span></td>
                  <td><span className={m.access === 'Read Only' ? 'mv-muted' : ''}>{m.access}</span></td>
                  <td>
                    {m.role === 'ADMIN' ? (
                      <span className="mv-status mv-status--warning">Priority</span>
                    ) : (
                      <button type="button" className="mv-toggle" role="switch" aria-checked={m.priorityAlerts} aria-label={`Priority alerts for ${m.name}`} onClick={() => toggleAlerts(m.id)} />
                    )}
                  </td>
                  <td><span className={`mv-status ${m.status === 'Active' ? 'mv-status--success' : 'mv-status--danger'}`}>{m.status}</span></td>
                  <td style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    {m.role !== 'ADMIN' && (
                      <>
                        {m.access === 'Read Only'
                          ? <button className="mv-quiet-button" onClick={() => setAccess(m.id, 'Read & Write')}>Elevate</button>
                          : <button className="mv-quiet-button" onClick={() => setAccess(m.id, 'Read Only')}>Read Only</button>}
                        <button className="mv-quiet-button" onClick={() => toggleStatus(m.id)}>{m.status === 'Active' ? 'Deactivate' : 'Activate'}</button>
                        <button className="mv-quiet-button" style={{ color: 'var(--mv-danger)' }} onClick={() => remove(m.id)}>Remove</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pageCount > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <span className="mv-muted" style={{ fontSize: 13 }}>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, members.length)} of {members.length}</span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button className="mv-icon-button" aria-label="Previous page" disabled={page === 1} onClick={() => setPage((p) => p - 1)}><ChevronLeftIcon size={16} /></button>
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                <button key={n} className={n === page ? 'mv-primary-button' : 'mv-quiet-button'} style={{ minWidth: 34, padding: '0 8px' }} onClick={() => setPage(n)}>{n}</button>
              ))}
              <button className="mv-icon-button" aria-label="Next page" disabled={page === pageCount} onClick={() => setPage((p) => p + 1)}><ChevronRightIcon size={16} /></button>
            </div>
          </div>
        )}
      </section>

      {accessChangeFor && (
        <div className="mv-dialog-backdrop" onClick={() => setAccessChangeFor(null)}>
          <section className="mv-dialog" role="dialog" aria-modal="true" aria-label="Access updated" onClick={(e) => e.stopPropagation()}>
            <div className="mv-success">
              <h3>Access updated</h3>
              <p>{accessChangeFor.name} now has {accessChangeFor.access} access.</p>
              <button className="mv-primary-button" onClick={() => setAccessChangeFor(null)}>Done</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
