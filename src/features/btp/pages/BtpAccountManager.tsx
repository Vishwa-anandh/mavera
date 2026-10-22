import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth';
import { useConfirm } from '../../../shared/ui/ConfirmProvider';
import { CloudIcon, ChevronDownIcon, ChevronRightIcon, TrashIcon, PencilIcon, CheckIcon, CloseIcon, PlusIcon, LockIcon } from '../../../shared/ui/icons';
import { useBtpAccounts } from '../model/BtpAccountContext';
import { cloudSamplesRepository } from '../../../data-access';
import { SampleDataBadge, openConnectDialog, useConnectOnArrival } from '../../workspace';
import { btpRegionLabel } from '../model/btpDerivations';
import type { BtpAccount } from '../model/btpTypes';

/**
 * AccountManager, ported from the reference CCM app's
 * btp/pages/BtpAccountManager.jsx: BTP's auth model is genuinely different
 * from Azure/AWS/GCP — up to 3 independent credential sets (COST_API
 * required, CIS_Central optional account-wide, Service Manager optional
 * per-subaccount). This form collects the first two; Service Manager is
 * configured per-subaccount from the expanded subaccounts list below (a
 * lightweight inline stand-in for the reference's `BtpServiceManagerModal`).
 * The credentials are collected by the shared connect dialog.
 *
 * There's no centralized `derivePermissions()` in the reference codebase
 * (confirmed via research) — every page inlines its own read-only check,
 * so this mirrors that rather than inventing a shared abstraction just for
 * BTP.
 */
export function BtpAccountManager() {
  const { user, accountLimits } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { accounts, removeAccount, renameAccount } = useBtpAccounts();
  const isReadOnly = user?.role !== 'admin' && user?.role !== 'owner' && Boolean(user?.canViewBtp === false);
  const maxAccounts = accountLimits.btp ?? 3;
  const atLimit = maxAccounts > 0 && accounts.length >= maxAccounts;

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // A "connect" request (Ctrl+K, a deep link) opens the shared connect dialog over this page.
  useConnectOnArrival('btp');

  const startRename = (account: BtpAccount) => { setRenamingId(account.id); setRenameValue(account.name); };
  const commitRename = () => { if (renamingId) renameAccount(renamingId, renameValue.trim() || accounts.find((a) => a.id === renamingId)?.name || ''); setRenamingId(null); };

  const deleteAccount = async (account: BtpAccount) => {
    const ok = await confirm({ title: 'Delete account?', description: `This will remove the BTP account "${account.name}" and all its cost data. This cannot be undone.`, variant: 'delete', okText: 'Delete' });
    if (ok) removeAccount(account.id);
  };

  return (
    <div>
      <div className="mv-page-heading">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="mv-avatar" style={{ background: '#0070f2', borderRadius: '0.625rem' }}><CloudIcon size={18} /></span>
          <div>
            <h1 className="mv-title" style={{ fontSize: '1.375rem' }}>BTP Account Manager</h1>
            <p className="mv-subtitle">Connect your SAP BTP global accounts for cost monitoring.</p>
          </div>
        </div>
        <span className={`mv-status ${atLimit ? 'mv-status--danger' : 'mv-status--neutral'}`}>{accounts.length}/{maxAccounts > 0 ? maxAccounts : '∞'} accounts</span>
      </div>

      {accounts.length > 0 && (
        <section className="mv-panel" style={{ marginBottom: '1rem' }}>
          <div className="mv-panel-header"><h2 className="mv-panel-title">Connected Accounts</h2></div>
          <ul className="mv-account-list">
            {accounts.map((account) => {
              const subaccounts = account.hasCis ? cloudSamplesRepository.btp.subaccounts() : [];
              const expanded = expandedId === account.id;
              return (
                <li key={account.id} className="mv-account-row" style={{ flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                    {!account.hasCis && <span aria-hidden style={{ width: '2.25rem', flex: 'none' }} />}
                    {account.hasCis && (
                      <button className="mv-icon-button" aria-label={expanded ? 'Collapse subaccounts' : 'Expand subaccounts'} onClick={() => setExpandedId(expanded ? null : account.id)}>
                        {expanded ? <ChevronDownIcon size={16} /> : <ChevronRightIcon size={16} />}
                      </button>
                    )}
                    <button type="button" className="mv-account-row-body" style={{ flex: 1 }} onClick={() => renamingId !== account.id && navigate(`/btp/account/${account.id}`)}>
                      <span className="mv-avatar" style={{ background: 'var(--mv-selected)', color: '#0070f2' }}><CloudIcon size={16} /></span>
                      <span className="mv-account-row-meta">
                        {renamingId === account.id ? (
                          <input autoFocus className="mv-account-rename-input" value={renameValue} onClick={(e) => e.stopPropagation()} onChange={(e) => setRenameValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenamingId(null); }} />
                        ) : (
                          <strong>{account.name}{account.hasCis && <span className="mv-status mv-status--info" style={{ marginLeft: '0.5rem' }}>CIS</span>}{account.sample && <SampleDataBadge className="mv-account-sample" />}</strong>
                        )}
                        <span className="mv-muted">{account.targetUrl}</span>
                      </span>
                    </button>
                    <span className="mv-account-row-actions">
                      {renamingId === account.id ? (
                        <>
                          <button className="mv-icon-button" aria-label="Save name" onClick={commitRename}><CheckIcon size={16} /></button>
                          <button className="mv-icon-button" aria-label="Cancel rename" onClick={() => setRenamingId(null)}><CloseIcon size={16} /></button>
                        </>
                      ) : (
                        <>
                          {!isReadOnly && <button className="mv-icon-button" aria-label={`Rename ${account.name}`} onClick={() => startRename(account)}><PencilIcon size={16} /></button>}
                          {!isReadOnly && <button className="mv-icon-button" aria-label={`Delete ${account.name}`} onClick={() => void deleteAccount(account)}><TrashIcon size={16} /></button>}
                        </>
                      )}
                    </span>
                  </div>
                  {expanded && subaccounts.length > 0 && (
                    <div style={{ width: '100%', marginTop: '0.625rem', paddingLeft: '2.5rem', display: 'grid', gap: '0.5rem' }}>
                      {subaccounts.map((sub) => {
                        const smConfig = cloudSamplesRepository.btp.smConfig(sub.guid);
                        return (
                          <button
                            key={sub.guid}
                            type="button"
                            className="mv-account-row-body"
                            style={{ justifyContent: 'space-between', border: '1px solid var(--mv-divider)', borderRadius: '0.5rem', padding: '0.625rem' }}
                            onClick={() => navigate(`/btp/account/${account.id}/subaccount/${sub.guid}/service-instances`)}
                          >
                            <span className="mv-account-row-meta">
                              <strong>{sub.displayName}</strong>
                              <span className="mv-muted">{btpRegionLabel(sub.region)}</span>
                            </span>
                            {smConfig ? (
                              <span className="mv-status mv-status--success">SM Configured</span>
                            ) : (
                              <span className="mv-muted">Service Manager not configured</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {isReadOnly ? (
        <section className="mv-panel">
          <div className="mv-empty" style={{ margin: 0 }}>
            <div className="mv-empty-icon" aria-hidden><LockIcon size={32} /></div>
            <h2>Read-only mode</h2>
            <p>Contact your administrator to add or remove BTP connections.</p>
          </div>
        </section>
      ) : atLimit ? (
        <div className="mv-inline-error" role="alert">Account limit reached — your plan allows up to {maxAccounts} BTP account{maxAccounts === 1 ? '' : 's'}.</div>
      ) : (
        <section className="mv-panel">
          <div className="mv-panel-header"><h2 className="mv-panel-title">Connect New Account</h2></div>
          <div className="mv-notice">
            <strong>Service Instance 1 — COST_API</strong> (required, Usage Data Management Service, plan <code className="mv-code">reporting-ga-admin</code>). Path: BTP Cockpit → subaccount → Cloud Foundry → Spaces → Instances → COST_API → Service Keys → View. Add <strong>CIS_Central</strong> (Cloud Management Service, plan <code className="mv-code">central-viewer</code>) to unlock the directory and subaccount hierarchy.
          </div>
          <button className="mv-primary-button" style={{ marginTop: '1rem' }} onClick={() => openConnectDialog('btp')}>
            <PlusIcon size={16} style={{ marginRight: '0.375rem' }} />Connect Account
          </button>
        </section>
      )}
    </div>
  );
}
