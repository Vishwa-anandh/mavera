import { Fragment } from 'react';
import { CheckIcon, PersonXIcon, ShieldIcon } from '../../../shared/ui/icons';
import { DetailDrawer } from '../../../shared/ui/DetailDrawer';
import { Select } from '../../../shared/ui/Select';
import { StatusTag } from '../../../shared/ui/StatusTag';
import { Tooltip } from '../../../shared/ui/Tooltip';
import type { AccessRole } from '../../access';
import type { ProviderGroup } from '../model/providerGroups';
import { isMemberPrivileged, memberRoleId, type OrgMember, type SeatSummary } from '../model/userManagementTypes';

function Toggle({ checked, onChange, disabled, label }: { checked: boolean; onChange: (value: boolean) => void; disabled?: boolean; label: string }) {
  return <button type="button" className="mv-toggle" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)} />;
}

/** One switch with its state written beside it, so the state never relies on the switch colour alone. */
function Switch({ checked, disabled, label, state, onChange }: { checked: boolean; disabled?: boolean; label: string; state: string; onChange: (value: boolean) => void }) {
  return (
    <span className="mv-member-switch">
      <Toggle checked={checked} disabled={disabled} onChange={onChange} label={label} />
      <span className="mv-muted mv-cell-caption">{state}</span>
    </span>
  );
}

interface MemberDetailsDrawerProps {
  member: OrgMember;
  roles: AccessRole[];
  isSelf: boolean;
  canEdit: boolean;
  seats: SeatSummary;
  visibleProviders: ProviderGroup[];
  showInvoiceColumn: boolean;
  onClose: () => void;
  onChangeRole: (roleId: string) => void;
  onElevate: () => void;
  onToggleStatus: () => void;
  onSetAlerts: (enabled: boolean) => void;
  onSetProviderAccess: (patch: Partial<OrgMember>, label: string, before: string, after: string) => void;
}

/** Everything about one member that can be changed: role, cloud access, alert e-mails and status. Without Edit on User Management it reads as plain facts. */
export function MemberDetailsDrawer({ member, roles, isSelf, canEdit, seats, visibleProviders, showInvoiceColumn, onClose, onChangeRole, onElevate, onToggleStatus, onSetAlerts, onSetProviderAccess }: MemberDetailsDrawerProps) {
  const privileged = isMemberPrivileged(member);
  const roleId = memberRoleId(member);
  const isOwner = roleId === 'owner';
  const roleLocked = !canEdit || isSelf || isOwner;
  const statusBlocked = isSelf || isOwner || (member.status === 'inactive' && seats.full);
  const options = roles.map((role) => ({ value: role.id, label: role.kind === 'custom' ? `${role.name} (custom)` : role.name, disabled: role.id === 'owner' && roleId !== 'owner' }));

  const statusButton = (
    <button
      type="button"
      className={`mv-secondary-button mv-row-action ${member.status === 'active' ? 'mv-row-action--danger' : 'mv-row-action--success'}`}
      disabled={statusBlocked}
      aria-label={`${member.status === 'active' ? 'Deactivate' : 'Activate'} ${member.fullName}`}
      onClick={onToggleStatus}
    >
      {member.status === 'active' ? <PersonXIcon size={14} /> : <CheckIcon size={12} />}
      {member.status === 'active' ? 'Deactivate' : 'Activate'}
    </button>
  );

  return (
    <DetailDrawer
      title={member.fullName}
      subtitle={<>{member.email}{isSelf ? ' · You' : ''}</>}
      onClose={onClose}
      footer={
        canEdit ? (
          <div className="mv-member-actions">
            {!privileged && !isSelf && (
              <button type="button" className="mv-secondary-button" onClick={onElevate} aria-label={`Elevate ${member.fullName} to Admin`}>
                <ShieldIcon size={13} />
                Elevate
              </button>
            )}
            {isSelf ? (
              <>{statusButton}<span className="mv-muted mv-cell-caption">Cannot deactivate yourself</span></>
            ) : isOwner ? (
              <>{statusButton}<span className="mv-muted mv-cell-caption">The Owner can’t be deactivated</span></>
            ) : (
              <Tooltip content={member.status === 'active' ? 'Deactivate user' : 'Activate user'}>{statusButton}</Tooltip>
            )}
          </div>
        ) : undefined
      }
    >
      <h3 className="mv-detail-heading">Status</h3>
      <p><StatusTag tone={member.status === 'active' ? 'success' : 'danger'}>{member.status === 'active' ? 'Active' : 'Inactive'}</StatusTag></p>

      <h3 className="mv-detail-heading">Role</h3>
      <div className="mv-member-role">
        <Select label={`Role for ${member.fullName}`} hideLabel value={roleId} options={options} disabled={roleLocked} onChange={onChangeRole} />
        {isSelf ? (
          <span className="mv-muted mv-cell-caption">Your own role can’t be changed here</span>
        ) : isOwner ? (
          <span className="mv-muted mv-cell-caption">The Owner can’t be changed</span>
        ) : null}
      </div>

      {(visibleProviders.length > 0 || showInvoiceColumn) && (
        <>
          <h3 className="mv-detail-heading">Cloud access</h3>
          <div className="mv-member-access" role="group" aria-label={`Cloud access for ${member.fullName}`}>
            <span className="mv-muted mv-member-access-head">Account</span>
            <span className="mv-muted mv-member-access-head">View</span>
            <span className="mv-muted mv-member-access-head">Full access</span>
            {visibleProviders.map((p) => {
              const viewKey = `canView${p.id[0].toUpperCase()}${p.id.slice(1)}` as keyof OrgMember;
              const readOnlyKey = `${p.id}ReadOnly` as keyof OrgMember;
              // BTP quirk from the reference app: undefined means viewable for BTP, but NOT viewable for every other provider.
              const checked = p.id === 'btp' ? member.canViewBtp !== false : Boolean(member[viewKey]);
              const isReadOnly = Boolean(member[readOnlyKey]);
              const isFullAccess = privileged || !isReadOnly;
              return (
                <Fragment key={p.id}>
                  <span className="mv-provider-head">
                    <span aria-hidden className="mv-provider-dot" style={{ background: p.dot }} />
                    {p.label}
                  </span>
                  <Switch
                    checked={privileged || checked}
                    disabled={privileged || !canEdit}
                    label={`${p.label} view access for ${member.fullName}`}
                    state={privileged ? 'Always On' : checked ? 'On' : 'Off'}
                    onChange={(value) => onSetProviderAccess({ [viewKey]: value } as Partial<OrgMember>, `${p.label} view`, checked ? 'On' : 'Off', value ? 'On' : 'Off')}
                  />
                  {!privileged && !checked ? (
                    <span className="mv-muted">—</span>
                  ) : (
                    <Switch
                      checked={isFullAccess}
                      disabled={privileged || !canEdit}
                      label={`${p.label} full access for ${member.fullName}`}
                      state={isFullAccess ? 'Full' : 'Read Only'}
                      onChange={(value) => onSetProviderAccess({ [readOnlyKey]: !value } as Partial<OrgMember>, `${p.label} access`, isReadOnly ? 'Read only' : 'Full', value ? 'Full' : 'Read only')}
                    />
                  )}
                </Fragment>
              );
            })}
            {showInvoiceColumn && (
              <Fragment>
                <span className="mv-provider-head">Invoice</span>
                <Switch checked disabled label={`Invoice view access for ${member.fullName}`} state={privileged ? 'Always On' : 'On'} onChange={() => {}} />
                <span className="mv-muted">—</span>
              </Fragment>
            )}
          </div>
        </>
      )}

      <h3 className="mv-detail-heading">Alert e-mails</h3>
      <Switch checked={Boolean(member.alertsEnabled)} disabled={!canEdit} label={`Alert e-mails for ${member.fullName}`} state={member.alertsEnabled ? 'On' : 'Off'} onChange={onSetAlerts} />
    </DetailDrawer>
  );
}
