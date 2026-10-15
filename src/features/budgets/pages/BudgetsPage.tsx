import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { cssVars } from '../../../shared/lib/cssVars';
import { useAuth } from '../../auth';
import { derivePermissions } from '../../../shared/lib/permissions';
import { SettingsIcon, BellIcon, TrashIcon, PlusIcon, CreditCardIcon, CloseIcon, LockIcon } from '../../../shared/ui/icons';
import { Select } from '../../../shared/ui/Select';
import { allCloudAccountOptions, MOCK_BUDGETS, MOCK_INTEGRATIONS } from '../../../demo/budgets/mockBudgetsData';
import type { AlertIntegration, AlertScope, Budget, IntegrationProvider } from '../model/budgetsTypes';
import { PageHeader } from '../../../shared/ui/PageHeader';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

const emptyBudgetForm = { name: '', target_amount: '', alert_threshold: '80', scope_type: 'organization' as 'organization' | 'account', scope_value: '' };
const emptyIntegrationForm = { provider: 'email' as IntegrationProvider, webhook_url: '', alert_scope: 'global' as AlertScope, budget_id: '' };

/**
 * Budgets & Alerts, ported from the reference CCM app's BudgetsPage.jsx: a
 * 2-tab page (Budgets / Alert Integrations), each a create-form + list.
 * `canManageBudgets` mirrors the reference's exact permission check —
 * admin/owner, or any provider the user can view without being read-only
 * on it.
 */
export function BudgetsPage() {
  const { user, cloudAccess, invoiceOnly } = useAuth();
  const permissions = derivePermissions(user, cloudAccess, invoiceOnly);
  const canManageBudgets = permissions.isPrivileged || permissions.azure.canWrite || permissions.aws.canWrite || permissions.btp.canWrite || permissions.gcp.canWrite;

  const [activeTab, setActiveTab] = useState<'budgets' | 'integrations'>('budgets');
  const [budgets, setBudgets] = useState<Budget[]>(MOCK_BUDGETS);
  const [integrations, setIntegrations] = useState<AlertIntegration[]>(MOCK_INTEGRATIONS);
  const cloudAccounts = allCloudAccountOptions();

  const [budgetForm, setBudgetForm] = useState(emptyBudgetForm);
  const [integrationForm, setIntegrationForm] = useState(emptyIntegrationForm);
  const [emails, setEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');

  const createBudget = (e: FormEvent) => {
    e.preventDefault();
    if (budgetForm.scope_type === 'account' && !budgetForm.scope_value) return;
    setBudgets((current) => [...current, {
      id: `budget-${current.length + 1}`,
      name: budgetForm.name,
      target_amount: Number(budgetForm.target_amount),
      alert_threshold: Number(budgetForm.alert_threshold),
      scope_type: budgetForm.scope_type,
      scope_value: budgetForm.scope_type === 'organization' ? '' : budgetForm.scope_value,
    }]);
    setBudgetForm(emptyBudgetForm);
  };

  const deleteBudget = (id: string) => setBudgets((current) => current.filter((b) => b.id !== id));

  const addEmail = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = emailInput.trim();
      if (val && val.includes('@') && !emails.includes(val)) {
        setEmails((current) => [...current, val]);
        setEmailInput('');
      }
    }
  };
  const removeEmail = (email: string) => setEmails((current) => current.filter((e) => e !== email));

  const createIntegration = (e: FormEvent) => {
    e.preventDefault();
    if (integrationForm.provider === 'email' && emails.length === 0) return;
    if (integrationForm.alert_scope === 'budget_specific' && !integrationForm.budget_id) return;
    setIntegrations((current) => [...current, {
      id: `integration-${current.length + 1}`,
      provider: integrationForm.provider,
      webhook_url: integrationForm.webhook_url,
      email_addresses: emails.join(','),
      alert_scope: integrationForm.alert_scope,
      budget_id: integrationForm.alert_scope === 'global' ? '' : integrationForm.budget_id,
    }]);
    setIntegrationForm(emptyIntegrationForm);
    setEmails([]);
  };

  const deleteIntegration = (id: string) => setIntegrations((current) => current.filter((i) => i.id !== id));

  return (
    <div>
      <PageHeader title={<>Budgets & Alerts</>} subtitle="Manage your spending limits and notification channels." />

      <div className="mv-segmented" style={{ marginBottom: 20 }}>
        <button className={`mv-segmented-btn${activeTab === 'budgets' ? ' is-active' : ''}`} onClick={() => setActiveTab('budgets')}><SettingsIcon size={15} />Budgets</button>
        <button className={`mv-segmented-btn${activeTab === 'integrations' ? ' is-active' : ''}`} onClick={() => setActiveTab('integrations')}><BellIcon size={15} />Alert Integrations</button>
      </div>

      {activeTab === 'budgets' ? (
        <div className="mv-columns-16-8" style={cssVars({ '--mv-cols': '1fr 2fr' })}>
          <section className="mv-panel">
            <div className="mv-panel-header"><h2 className="mv-panel-title">Create New Budget</h2></div>
            {canManageBudgets ? (
              <form onSubmit={createBudget}>
                <label className="mv-field">Budget Name<input required value={budgetForm.name} onChange={(e) => setBudgetForm({ ...budgetForm, name: e.target.value })} placeholder="e.g. Q3 Engineering" /></label>
                <Select
                  label="Budget Scope"
                  style={{ height: 44 }}
                  value={budgetForm.scope_type}
                  onChange={(scope_type) => setBudgetForm({ ...budgetForm, scope_type })}
                  options={[
                    { value: 'organization', label: 'Organization Wide (All Cloud Accounts)' },
                    { value: 'account', label: 'Specific Cloud Account' },
                  ]}
                />
                {budgetForm.scope_type === 'account' && (
                  <Select
                    label="Select Account"
                    required
                    style={{ height: 44 }}
                    value={budgetForm.scope_value}
                    onChange={(scope_value) => setBudgetForm({ ...budgetForm, scope_value })}
                    options={[{ value: '', label: '-- Choose Account --' }, ...cloudAccounts.map((a) => ({ value: a.id, label: a.name }))]}
                  />
                )}
                <label className="mv-field">Target Amount ($)<input required type="number" step="0.01" value={budgetForm.target_amount} onChange={(e) => setBudgetForm({ ...budgetForm, target_amount: e.target.value })} placeholder="5000" /></label>
                <label className="mv-field">Alert Threshold (%)<input required type="number" min={1} max={150} value={budgetForm.alert_threshold} onChange={(e) => setBudgetForm({ ...budgetForm, alert_threshold: e.target.value })} /></label>
                <button className="mv-primary-button" type="submit" style={{ width: '100%' }}><PlusIcon size={16} style={{ marginRight: 6 }} />Add Budget</button>
              </form>
            ) : (
              <div className="mv-empty" style={{ margin: 0 }}>
                <div className="mv-empty-icon" aria-hidden><LockIcon size={32} /></div>
                <h2>Read-only mode</h2>
                <p>You don't have full access to create or manage budgets.</p>
              </div>
            )}
          </section>

          <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
            {budgets.map((b) => (
              <section className="mv-panel" key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{b.name}</h3>
                  <p className="mv-muted" style={{ margin: '4px 0 0' }}>Target: {formatCurrency(b.target_amount)} · Alerts at {b.alert_threshold}%</p>
                  <p className="mv-muted" style={{ margin: '2px 0 0' }}>Scope: {b.scope_type === 'organization' ? 'Organization Wide' : cloudAccounts.find((a) => a.id === b.scope_value)?.name ?? `Account ID: ${b.scope_value}`}</p>
                </div>
                {canManageBudgets && <button className="mv-icon-button" aria-label={`Delete ${b.name}`} onClick={() => deleteBudget(b.id)}><TrashIcon size={18} /></button>}
              </section>
            ))}
            {budgets.length === 0 && (
              <div className="mv-empty">
                <div className="mv-empty-icon" aria-hidden><CreditCardIcon size={28} /></div>
                <h2>No Budgets Found</h2>
                <p>You haven't set up any budgets yet. Create one to start monitoring your cloud spend and receive alerts.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mv-columns-16-8" style={cssVars({ '--mv-cols': '1fr 2fr' })}>
          <section className="mv-panel">
            <div className="mv-panel-header"><h2 className="mv-panel-title">Add Notification Channel</h2></div>
            {canManageBudgets ? (
              <form onSubmit={createIntegration}>
                <Select
                  label="Provider"
                  style={{ height: 44 }}
                  value={integrationForm.provider}
                  onChange={(provider) => setIntegrationForm({ ...integrationForm, provider })}
                  options={[
                    { value: 'email', label: 'Email' },
                    { value: 'teams', label: 'Microsoft Teams' },
                  ]}
                />
                <Select
                  label="Alert Scope"
                  style={{ height: 44 }}
                  value={integrationForm.alert_scope}
                  onChange={(alert_scope) => setIntegrationForm({ ...integrationForm, alert_scope })}
                  options={[
                    { value: 'global', label: 'Global Alert (All Budgets)' },
                    { value: 'budget_specific', label: 'Budget Based Alert' },
                  ]}
                />
                {integrationForm.alert_scope === 'budget_specific' && (
                  <Select
                    label="Select Budget"
                    style={{ height: 44 }}
                    value={integrationForm.budget_id}
                    onChange={(budget_id) => setIntegrationForm({ ...integrationForm, budget_id })}
                    options={[{ value: '', label: '-- Choose Budget --' }, ...budgets.map((b) => ({ value: b.id, label: b.name }))]}
                  />
                )}
                {integrationForm.provider === 'teams' ? (
                  <label className="mv-field">Webhook URL<input required value={integrationForm.webhook_url} onChange={(e) => setIntegrationForm({ ...integrationForm, webhook_url: e.target.value })} placeholder="https://..." /></label>
                ) : (
                  <label className="mv-field">
                    Email Addresses (press Enter to add)
                    {emails.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                        {emails.map((email) => (
                          <span key={email} className="mv-status mv-status--info" style={{ gap: 6 }}>
                            {email}
                            <button type="button" onClick={() => removeEmail(email)} aria-label={`Remove ${email}`} style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', display: 'inline-flex' }}><CloseIcon size={12} /></button>
                          </span>
                        ))}
                      </div>
                    )}
                    <input value={emailInput} onChange={(e) => setEmailInput(e.target.value)} onKeyDown={addEmail} placeholder="user@company.com" />
                  </label>
                )}
                <button className="mv-primary-button" type="submit" style={{ width: '100%' }}><PlusIcon size={16} style={{ marginRight: 6 }} />Add Channel</button>
              </form>
            ) : (
              <div className="mv-empty" style={{ margin: 0 }}>
                <div className="mv-empty-icon" aria-hidden><LockIcon size={32} /></div>
                <h2>Read-only mode</h2>
                <p>You don't have full access to manage integrations.</p>
              </div>
            )}
          </section>

          <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
            {integrations.map((i) => (
              <section className="mv-panel" key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, textTransform: 'capitalize' }}>{i.provider} Integration</h3>
                  <p className="mv-muted" style={{ margin: '4px 0 0', wordBreak: 'break-all' }}>{i.provider === 'teams' ? i.webhook_url : i.email_addresses}</p>
                  <span className="mv-status mv-status--neutral" style={{ marginTop: 8 }}>{i.budget_id ? `Budget Specific: ${budgets.find((b) => b.id === i.budget_id)?.name ?? 'Unknown'}` : 'Global Alert'}</span>
                </div>
                {canManageBudgets && <button className="mv-icon-button" aria-label="Delete integration" onClick={() => deleteIntegration(i.id)}><TrashIcon size={18} /></button>}
              </section>
            ))}
            {integrations.length === 0 && (
              <div className="mv-empty">
                <div className="mv-empty-icon" aria-hidden><BellIcon size={28} /></div>
                <h2>No Channels Added</h2>
                <p>You haven't set up any notification channels. Add one to receive timely alerts about your cloud spend.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
