import { Fragment, useMemo, useState } from 'react';
import { AppBreadcrumb } from '../../../shared/ui/AppBreadcrumb';
import { useAuth } from '../../auth';
import { SearchIcon, ShieldIcon, UsersIcon, CheckIcon, PersonXIcon } from '../../../shared/ui/icons';
import { Tooltip } from '../../../shared/ui/Tooltip';
import { MOCK_MEMBERS } from '../../../demo/users/mockMembersData';
import { isMemberPrivileged, sortMembers, type OrgMember } from '../model/userManagementTypes';
import type { CloudProvider, User } from '../../../shared/types/auth';

const PROVIDER_GROUPS: Array<{ id: CloudProvider; label: string; dot: string }> = [
  { id: 'azure', label: 'Azure', dot: '#0078D4' },
  { id: 'aws', label: 'AWS', dot: '#EC7211' },
  { id: 'btp', label: 'SAP BTP', dot: '#059669' },
  { id: 'gcp', label: 'GCP', dot: '#4285F4' },
];

function Toggle({ checked, onChange, disabled, label }: { checked: boolean; onChange: (value: boolean) => void; disabled?: boolean; label: string }) {
  return <button type="button" className="mv-toggle" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)} />;
}

function StatusBadge({ status }: { status: OrgMember['status'] }) {
  return <span className={`mv-status ${status === 'active' ? 'mv-status--success' : 'mv-status--danger'}`}>{status === 'active' ? 'Active' : 'Inactive'}</span>;
}

function cellLabel(text: string) {
  return <span className="mv-muted" style={{ fontSize: 10, fontWeight: 600 }}>{text}</span>;
}

/** View-access cell: always-on and disabled for admins/owners, otherwise a
 * plain on/off toggle. */
function ViewCell({ privileged, checked, onToggle }: { privileged: boolean; checked: boolean; onToggle: (value: boolean) => void }) {
  return (
    <td style={{ textAlign: 'center', borderLeft: '1px solid var(--mv-divider)' }}>
      <div style={{ display: 'grid', justifyItems: 'center', gap: 4 }}>
        <Toggle checked={privileged || checked} disabled={privileged} onChange={onToggle} label="Toggle view access" />
        {cellLabel(privileged ? 'Always On' : checked ? 'On' : 'Off')}
      </div>
    </td>
  );
}

/** Full-access cell: dash when the member can't view this provider at all
 * (nothing to grant read-only vs. full on). */
function AccessCell({ privileged, canView, readOnly, onToggle }: { privileged: boolean; canView: boolean; readOnly: boolean; onToggle: (value: boolean) => void }) {
  if (!privileged && !canView) {
    return <td style={{ textAlign: 'center', borderLeft: '1px solid var(--mv-divider)' }}><span className="mv-muted">—</span></td>;
  }
  const isFullAccess = privileged || !readOnly;
  return (
    <td style={{ textAlign: 'center', borderLeft: '1px solid var(--mv-divider)' }}>
      <div style={{ display: 'grid', justifyItems: 'center', gap: 4 }}>
        <Toggle checked={isFullAccess} disabled={privileged} onChange={onToggle} label="Toggle full access" />
        {cellLabel(isFullAccess ? 'Full' : 'Read Only')}
      </div>
    </td>
  );
}

function buildInitialMembers(user: User | null): OrgMember[] {
  if (!user) return MOCK_MEMBERS;
  const self: OrgMember = {
    userId: user.id,
    fullName: user.name || user.email.split('@')[0],
    email: user.email,
    role: user.role,
    status: 'active',
    canViewAzure: user.canViewAzure,
    canViewAws: user.canViewAws,
    canViewBtp: user.canViewBtp,
    canViewGcp: user.canViewGcp,
    azureReadOnly: user.azureReadOnly,
    awsReadOnly: user.awsReadOnly,
    btpReadOnly: user.btpReadOnly,
    gcpReadOnly: user.gcpReadOnly,
  };
  return [self, ...MOCK_MEMBERS];
}

/**
 * Ported from the reference CCM app's UserManagement.jsx. The reference
 * paginates members from a real backend with infinite scroll; this prototype
 * has one fixed mock roster, so it's rendered as a single list instead.
 * Provider columns are derived from the org's own `cloudAccess` (the same
 * subscription source of truth the Subscription page edits) — members of an
 * org without GCP, for instance, simply don't get a GCP column at all.
 */
export function UserManagementPage() {
  const { user, cloudAccess, invoiceOnly } = useAuth();
  const [members, setMembers] = useState<OrgMember[]>(() => buildInitialMembers(user));
  const [searchTerm, setSearchTerm] = useState('');

  const visibleProviders = PROVIDER_GROUPS.filter((p) => cloudAccess.includes(p.id));
  const showInvoiceColumn = invoiceOnly;

  const updateMember = (userId: string, updates: Partial<OrgMember>) =>
    setMembers((current) => current.map((m) => (m.userId === userId ? { ...m, ...updates } : m)));

  const toggleStatus = (userId: string, status: OrgMember['status']) =>
    updateMember(userId, { status: status === 'active' ? 'inactive' : 'active' });

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const base = term ? members.filter((m) => m.fullName.toLowerCase().includes(term) || m.email.toLowerCase().includes(term)) : members;
    return sortMembers(base, user?.id);
  }, [members, searchTerm, user?.id]);

  return (
    <div>
      <AppBreadcrumb items={[{ label: 'Administration' }, { label: 'User Management' }]} />
      <div className="mv-page-heading">
        <div>
          <h1 className="mv-title">User Management</h1>
          <p className="mv-subtitle">Manage your organisation's members and their cloud access.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--mv-border)', borderRadius: 8, padding: '0 10px', height: 36, background: 'var(--mv-surface)' }}>
          <SearchIcon size={16} style={{ color: 'var(--mv-text-muted)' }} />
          <input
            type="search"
            aria-label="Search members"
            placeholder="Search members…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: 0, outline: 'none', background: 'transparent', width: 200, fontSize: 13, color: 'var(--mv-text)' }}
          />
        </div>
      </div>

      {(visibleProviders.length > 0 || showInvoiceColumn) && (
        <p className="mv-muted" style={{ marginBottom: 12 }}>
          Showing: {[...visibleProviders.map((p) => p.label), showInvoiceColumn && 'Invoice'].filter(Boolean).join(' · ')}
        </p>
      )}

      <section className="mv-panel">
        {filtered.length === 0 ? (
          <div className="mv-empty" style={{ margin: 0 }}>
            <div className="mv-empty-icon" aria-hidden><UsersIcon size={28} /></div>
            <h2>No members found</h2>
            <p>No members match your search.</p>
          </div>
        ) : (
          <div className="mv-table-wrap">
            <table className="mv-table">
              <thead>
                <tr>
                  <th />
                  {visibleProviders.map((p) => (
                    <th key={p.id} colSpan={2} style={{ textAlign: 'center', borderLeft: '1px solid var(--mv-divider)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 12, color: 'var(--mv-text)' }}>
                        <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: p.dot, display: 'inline-block' }} />
                        {p.label}
                      </span>
                    </th>
                  ))}
                  {showInvoiceColumn && (
                    <th style={{ textAlign: 'center', borderLeft: '1px solid var(--mv-divider)' }}>
                      <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--mv-text-secondary)' }}>Invoice</span>
                    </th>
                  )}
                  <th style={{ borderLeft: '1px solid var(--mv-divider)' }} />
                </tr>
                <tr>
                  <th style={{ textAlign: 'left' }}>User</th>
                  {visibleProviders.map((p) => (
                    <Fragment key={p.id}>
                      <th style={{ textAlign: 'center', borderLeft: '1px solid var(--mv-divider)' }}>View</th>
                      <th style={{ textAlign: 'center' }}>Full Access</th>
                    </Fragment>
                  ))}
                  {showInvoiceColumn && <th style={{ textAlign: 'center', borderLeft: '1px solid var(--mv-divider)' }}>View</th>}
                  <th style={{ textAlign: 'center', borderLeft: '1px solid var(--mv-divider)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((member) => {
                  const privileged = isMemberPrivileged(member);
                  const isSelf = member.userId === user?.id;
                  return (
                    <tr key={member.userId}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--mv-selected)', color: 'var(--mv-primary)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13, flex: 'none' }}>
                            {member.fullName.charAt(0).toUpperCase()}
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <strong style={{ fontSize: 13 }}>{member.fullName}</strong>
                              {privileged && <ShieldIcon size={12} style={{ color: 'var(--mv-primary)' }} aria-label="Administrator" />}
                            </div>
                            <p className="mv-muted" style={{ margin: '1px 0 2px', fontSize: 12 }}>{member.email}</p>
                            <span className="mv-status mv-status--neutral" style={{ fontSize: 10, minHeight: 18, textTransform: 'capitalize' }}>{member.role}</span>
                          </div>
                        </div>
                      </td>

                      {visibleProviders.map((p) => {
                        const viewKey = `canView${p.id[0].toUpperCase()}${p.id.slice(1)}` as keyof OrgMember;
                        const readOnlyKey = `${p.id}ReadOnly` as keyof OrgMember;
                        // BTP quirk from the reference app: undefined means viewable
                        // for BTP, but NOT viewable for every other provider.
                        const checked = p.id === 'btp' ? member.canViewBtp !== false : Boolean(member[viewKey]);
                        return (
                          <Fragment key={p.id}>
                            <ViewCell
                              privileged={privileged}
                              checked={checked}
                              onToggle={(value) => updateMember(member.userId, { [viewKey]: value } as unknown as Partial<OrgMember>)}
                            />
                            <AccessCell
                              privileged={privileged}
                              canView={checked}
                              readOnly={Boolean(member[readOnlyKey])}
                              onToggle={(value) => updateMember(member.userId, { [readOnlyKey]: !value } as unknown as Partial<OrgMember>)}
                            />
                          </Fragment>
                        );
                      })}

                      {showInvoiceColumn && (
                        <ViewCell privileged={privileged} checked onToggle={() => {}} />
                      )}

                      <td style={{ borderLeft: '1px solid var(--mv-divider)' }}>
                        <div style={{ display: 'grid', justifyItems: 'center', gap: 6 }}>
                          <StatusBadge status={member.status} />
                          {(() => {
                            const buttonContent = (
                              <button
                                type="button"
                                className="mv-icon-button"
                                disabled={isSelf}
                                onClick={() => toggleStatus(member.userId, member.status)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, width: 'auto', padding: '0 8px', color: member.status === 'active' ? 'var(--mv-danger)' : 'var(--mv-success)' }}
                              >
                                {member.status === 'active' ? <PersonXIcon size={14} /> : <CheckIcon size={12} />}
                                {member.status === 'active' ? 'Deactivate' : 'Activate'}
                              </button>
                            );
                            // Disabled controls don't reliably receive focus/hover for a
                            // tooltip to attach to, so the explanation is adjacent text
                            // instead (MAVERA_DESIGN_SYSTEM.md §10.1).
                            return isSelf ? (
                              <>
                                {buttonContent}
                                <span className="mv-muted" style={{ fontSize: 10 }}>Cannot deactivate yourself</span>
                              </>
                            ) : (
                              <Tooltip content={member.status === 'active' ? 'Deactivate user' : 'Activate user'}>{buttonContent}</Tooltip>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="mv-muted" style={{ textAlign: 'right', marginTop: 12 }}>Showing {filtered.length} of {members.length} member{members.length !== 1 ? 's' : ''}</p>
    </div>
  );
}
