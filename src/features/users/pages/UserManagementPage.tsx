import { Fragment, useMemo, useState } from 'react';
import { useAuth } from '../../auth';
import { SearchIcon, ShieldIcon, UsersIcon, CheckIcon, PersonXIcon, PlusIcon } from '../../../shared/ui/icons';
import { Tooltip } from '../../../shared/ui/Tooltip';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { Pagination } from '../../../shared/ui/Pagination';
import { usePagination } from '../../../shared/ui/usePagination';
import { MOCK_MEMBERS } from '../../../demo/users/mockMembersData';
import { isMemberPrivileged, seatSummary, sortMembers, type OrgMember } from '../model/userManagementTypes';
import { AddUserDialog } from '../components/AddUserDialog';
import { fireToast } from '../../../shared/lib/toastEvents';
import type { CloudProvider, User } from '../../../shared/types/auth';
import { PageHeader } from '../../../shared/ui/PageHeader';

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
  return <span className="mv-muted" style={{ fontSize: '0.625rem', fontWeight: 600 }}>{text}</span>;
}

/** View-access cell: always-on and disabled for admins/owners, otherwise a
 * plain on/off toggle. */
function ViewCell({ privileged, checked, onToggle }: { privileged: boolean; checked: boolean; onToggle: (value: boolean) => void }) {
  return (
    <td style={{ textAlign: 'center', borderLeft: '1px solid var(--mv-divider)' }}>
      <div style={{ display: 'grid', justifyItems: 'center', gap: '0.25rem' }}>
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
      <div style={{ display: 'grid', justifyItems: 'center', gap: '0.25rem' }}>
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
  const { user, cloudAccess, invoiceOnly, maxUsers } = useAuth();
  const [members, setMembers] = useState<OrgMember[]>(() => buildInitialMembers(user));
  const [searchTerm, setSearchTerm] = useState('');
  const [adding, setAdding] = useState(false);

  const visibleProviders = PROVIDER_GROUPS.filter((p) => cloudAccess.includes(p.id));
  const showInvoiceColumn = invoiceOnly;

  const seats = seatSummary(members, maxUsers);

  const addMember = (member: OrgMember) => {
    setMembers((current) => [...current, member]);
    setAdding(false);
    fireToast({ type: 'success', message: `${member.fullName} was added to your organisation.` });
  };

  const updateMember = (userId: string, updates: Partial<OrgMember>) =>
    setMembers((current) => current.map((m) => (m.userId === userId ? { ...m, ...updates } : m)));

  const toggleStatus = (userId: string, status: OrgMember['status']) =>
    updateMember(userId, { status: status === 'active' ? 'inactive' : 'active' });

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const base = term ? members.filter((m) => m.fullName.toLowerCase().includes(term) || m.email.toLowerCase().includes(term)) : members;
    return sortMembers(base, user?.id);
  }, [members, searchTerm, user?.id]);

  const paging = usePagination(filtered, 10, searchTerm);

  return (
    <div>
      <PageHeader title="User Management" subtitle="Manage your organisation's members and their cloud access.">
        <div className="mv-heading-actions">
          <label className="mv-filter-search mv-heading-search">
            <SearchIcon size={16} />
            <input
              type="search"
              aria-label="Search members"
              placeholder="Search members…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </label>
          <button type="button" className="mv-primary-button" disabled={seats.full} onClick={() => setAdding(true)}>
            <PlusIcon size={16} style={{ marginRight: '0.375rem' }} />
            Add user
          </button>
        </div>
      </PageHeader>

      <p className="mv-muted mv-scope-note">
        {seats.limit === null
          ? `${seats.used} active member${seats.used === 1 ? '' : 's'} · no seat limit`
          : seats.full
            ? `All ${seats.limit} seats are in use — deactivate a member, or ask Maitsys to add seats, to add another user.`
            : `${seats.used} of ${seats.limit} seats used · ${seats.available} available`}
        {(visibleProviders.length > 0 || showInvoiceColumn) && (
          <> · Showing: {[...visibleProviders.map((p) => p.label), showInvoiceColumn && 'Invoice'].filter(Boolean).join(' · ')}</>
        )}
      </p>

      <section className="mv-panel mv-panel--table">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<UsersIcon size={28} />}
            heading="No members found"
            explanation={searchTerm ? `Nobody matches “${searchTerm}”. Check the spelling or search by email.` : 'Add your first member to share access.'}
            actionLabel={searchTerm ? 'Clear search' : 'Add user'}
            onAction={searchTerm ? () => setSearchTerm('') : () => setAdding(true)}
          />
        ) : (
          <div className="mv-table-wrap">
            <table className="mv-table">
              <thead>
                <tr>
                  <th />
                  {visibleProviders.map((p) => (
                    <th key={p.id} colSpan={2} style={{ textAlign: 'center', borderLeft: '1px solid var(--mv-divider)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontWeight: 600, fontSize: '0.75rem', color: 'var(--mv-text)' }}>
                        <span aria-hidden style={{ width: '0.4375rem', height: '0.4375rem', borderRadius: '50%', background: p.dot, display: 'inline-block' }} />
                        {p.label}
                      </span>
                    </th>
                  ))}
                  {showInvoiceColumn && (
                    <th style={{ textAlign: 'center', borderLeft: '1px solid var(--mv-divider)' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--mv-text-secondary)' }}>Invoice</span>
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
                {paging.pageItems.map((member) => {
                  const privileged = isMemberPrivileged(member);
                  const isSelf = member.userId === user?.id;
                  return (
                    <tr key={member.userId}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                          <span style={{ width: '2.125rem', height: '2.125rem', borderRadius: '0.5625rem', background: 'var(--mv-selected)', color: 'var(--mv-primary)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: '0.8125rem', flex: 'none' }}>
                            {member.fullName.charAt(0).toUpperCase()}
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                              <strong style={{ fontSize: '0.8125rem' }}>{member.fullName}</strong>
                              {privileged && <ShieldIcon size={12} style={{ color: 'var(--mv-primary)' }} aria-label="Administrator" />}
                            </div>
                            <p className="mv-muted" style={{ margin: '1px 0 2px', fontSize: '0.75rem' }}>{member.email}</p>
                            <span className="mv-status mv-status--neutral" style={{ fontSize: '0.625rem', minHeight: '1.125rem', textTransform: 'capitalize' }}>{member.role}</span>
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
                        <div style={{ display: 'grid', justifyItems: 'center', gap: '0.375rem' }}>
                          <StatusBadge status={member.status} />
                          {(() => {
                            const buttonContent = (
                              <button
                                type="button"
                                className="mv-icon-button"
                                disabled={isSelf || (member.status === 'inactive' && seats.full)}
                                onClick={() => toggleStatus(member.userId, member.status)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem', width: 'auto', padding: '0 0.5rem', color: member.status === 'active' ? 'var(--mv-danger)' : 'var(--mv-success)' }}
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
                                <span className="mv-muted" style={{ fontSize: '0.625rem' }}>Cannot deactivate yourself</span>
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
        <Pagination {...paging} noun={`member${filtered.length !== 1 ? 's' : ''}`} />
      </section>

      {adding && (
        <AddUserDialog
          members={members}
          seats={seats}
          providers={visibleProviders}
          onCancel={() => setAdding(false)}
          onAdd={addMember}
        />
      )}
    </div>
  );
}
