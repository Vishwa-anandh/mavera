import { useState, type FormEvent } from 'react';
import { budgetsRepository } from '../../../data-access';
import { useAuth } from '../../auth';
import { derivePermissions } from '../../../shared/lib/permissions';
import { fireToast } from '../../../shared/lib/toastEvents';
import { useConfirm } from '../../../shared/ui/ConfirmProvider';
import { BellIcon, TrashIcon, PlusIcon, CreditCardIcon, LockIcon } from '../../../shared/ui/icons';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Select } from '../../../shared/ui/Select';
import { AddChannelDialog, type NewChannelValues } from '../components/AddChannelDialog';
import { channelsForNewBudget, channelsNotifiedFor, channelSummary, linkedBudgetNames, providerLabel } from '../model/budgetChannels';
import type { AlertChannel, Budget } from '../model/budgetsTypes';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

const emptyBudgetForm = { name: '', target_amount: '', alert_threshold: '80', scope_type: 'organization' as 'organization' | 'account', scope_value: '' };

/**
 * Budgets & Alerts: the spending limits, then, as its own section further down the same page, the
 * notification channels that carry their alerts (not a tab: both are in view with one scroll).
 * `canManageBudgets` mirrors the reference's permission check: admin/owner, or any provider the user
 * can view without being read-only on it.
 */
export function BudgetsPage() {
  const { user, cloudAccess, invoiceOnly } = useAuth();
  const confirm = useConfirm();
  const permissions = derivePermissions(user, cloudAccess, invoiceOnly);
  const canManageBudgets = permissions.isPrivileged || permissions.azure.canWrite || permissions.aws.canWrite || permissions.btp.canWrite || permissions.gcp.canWrite;

  const [budgets, setBudgets] = useState<Budget[]>(() => budgetsRepository.listBudgets());
  const [channels, setChannels] = useState<AlertChannel[]>(() => budgetsRepository.listChannels());
  const [cloudAccounts] = useState(() => budgetsRepository.listCloudAccounts());
  const [budgetForm, setBudgetForm] = useState(emptyBudgetForm);
  const [alsoNotify, setAlsoNotify] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const refresh = () => {
    setBudgets(budgetsRepository.listBudgets());
    setChannels(budgetsRepository.listChannels());
  };

  const globalChannels = channels.filter((c) => c.enabled && c.alert_scope === 'global');
  const budgetChannels = channels.filter((c) => c.enabled && c.alert_scope === 'budget_specific');
  const willNotify = channelsForNewBudget(channels, alsoNotify);

  const createBudget = (e: FormEvent) => {
    e.preventDefault();
    if (budgetForm.scope_type === 'account' && !budgetForm.scope_value) return;
    budgetsRepository.createBudget({
      name: budgetForm.name.trim(),
      target_amount: Number(budgetForm.target_amount),
      alert_threshold: Number(budgetForm.alert_threshold),
      scope_type: budgetForm.scope_type,
      scope_value: budgetForm.scope_type === 'organization' ? '' : budgetForm.scope_value,
      channel_ids: alsoNotify,
    });
    fireToast({ type: 'success', message: willNotify.length > 0 ? `Budget created. Alerts will notify ${willNotify.length} channel${willNotify.length === 1 ? '' : 's'}.` : 'Budget created. No channel is set up to notify yet.' });
    setBudgetForm(emptyBudgetForm);
    setAlsoNotify([]);
    refresh();
  };

  const deleteBudget = async (budget: Budget) => {
    const ok = await confirm({ title: `Delete ${budget.name}?`, description: 'Its alerts stop. Channels tied only to this budget keep existing but will have nothing to notify for.', variant: 'delete', okText: 'Delete budget' });
    if (!ok) return;
    budgetsRepository.deleteBudget(budget.id);
    refresh();
  };

  const addChannel = (values: NewChannelValues) => {
    budgetsRepository.addChannel(values);
    setDialogOpen(false);
    fireToast({ type: 'success', message: `${values.provider === 'email' ? 'Email' : 'Microsoft Teams'} channel added.` });
    refresh();
  };

  const toggleChannel = (channel: AlertChannel) => {
    budgetsRepository.setChannelEnabled(channel.id, !channel.enabled);
    refresh();
  };

  const removeChannel = async (channel: AlertChannel) => {
    const ok = await confirm({ title: `Remove this ${providerLabel(channel)} channel?`, description: 'Budget alerts will no longer be sent to it.', variant: 'delete', okText: 'Remove channel' });
    if (!ok) return;
    budgetsRepository.removeChannel(channel.id);
    fireToast({ type: 'info', message: 'Channel removed.' });
    refresh();
  };

  const toggleAlsoNotify = (id: string) => setAlsoNotify((current) => (current.includes(id) ? current.filter((c) => c !== id) : [...current, id]));

  return (
    <div>
      <PageHeader title={<>Budgets & Alerts</>} subtitle="Manage your spending limits and the channels that carry their alerts." />

      <section id="budgets" aria-labelledby="budgets-title" className="mv-budgets-section">
        <div className="mv-section-head">
          <div>
            <h2 id="budgets-title" className="mv-section-title">Budgets</h2>
            <p className="mv-muted">{budgets.length} budget{budgets.length === 1 ? '' : 's'}. An alert is sent when spend reaches a budget's threshold.</p>
          </div>
        </div>
        <div className="mv-columns-16-8" style={{ '--mv-cols': '1fr 2fr' } as React.CSSProperties}>
          <section className="mv-panel" aria-labelledby="create-budget-title">
            <div className="mv-panel-header"><h3 id="create-budget-title" className="mv-panel-title">Create New Budget</h3></div>
            {canManageBudgets ? (
              <form onSubmit={createBudget}>
                <label className="mv-field">Budget Name<input required value={budgetForm.name} onChange={(e) => setBudgetForm({ ...budgetForm, name: e.target.value })} placeholder="e.g. Q3 Engineering" /></label>
                <Select
                  label="Budget Scope"
                  style={{ height: '2.75rem' }}
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
                    style={{ height: '2.75rem' }}
                    value={budgetForm.scope_value}
                    onChange={(scope_value) => setBudgetForm({ ...budgetForm, scope_value })}
                    options={[{ value: '', label: '-- Choose Account --' }, ...cloudAccounts.map((a) => ({ value: a.id, label: a.name }))]}
                  />
                )}
                <label className="mv-field">Target Amount ($)<input required type="number" step="0.01" min="0" value={budgetForm.target_amount} onChange={(e) => setBudgetForm({ ...budgetForm, target_amount: e.target.value })} placeholder="5000" /></label>
                <label className="mv-field">Alert Threshold (%)<input required type="number" min={1} max={150} value={budgetForm.alert_threshold} onChange={(e) => setBudgetForm({ ...budgetForm, alert_threshold: e.target.value })} /></label>

                <fieldset className="mv-fieldset" aria-describedby="notify-summary">
                  <legend>Alert channels</legend>
                  {globalChannels.map((channel) => (
                    <label key={channel.id} className="mv-check-row">
                      <input type="checkbox" checked disabled aria-label={`${providerLabel(channel)} ${channelSummary(channel)}, always notified`} />
                      <span>{providerLabel(channel)}: {channelSummary(channel)} <span className="mv-muted">(all budgets)</span></span>
                    </label>
                  ))}
                  {budgetChannels.map((channel) => (
                    <label key={channel.id} className="mv-check-row">
                      <input type="checkbox" checked={alsoNotify.includes(channel.id)} onChange={() => toggleAlsoNotify(channel.id)} aria-label={`Also notify ${providerLabel(channel)} ${channelSummary(channel)}`} />
                      <span>Also notify {providerLabel(channel)}: {channelSummary(channel)}</span>
                    </label>
                  ))}
                  <p id="notify-summary" className="mv-muted" aria-live="polite">
                    {willNotify.length > 0
                      ? `This budget will notify ${willNotify.length} channel${willNotify.length === 1 ? '' : 's'}.`
                      : <>No active channel is set up, so alerts for this budget will only show in Mavera. <a href="#alert-integrations">Add a channel</a></>}
                  </p>
                </fieldset>

                <button className="mv-primary-button" type="submit" style={{ width: '100%' }}><PlusIcon size={16} style={{ marginRight: '0.375rem' }} />Add Budget</button>
              </form>
            ) : (
              <div className="mv-empty" style={{ margin: 0 }}>
                <div className="mv-empty-icon" aria-hidden><LockIcon size={32} /></div>
                <h2>Read-only mode</h2>
                <p>You don't have full access to create or manage budgets.</p>
              </div>
            )}
          </section>

          <ul className="mv-budget-list" aria-label="Budgets">
            {budgets.map((b) => {
              const notified = channelsNotifiedFor(b.id, channels);
              return (
                <li key={b.id} className="mv-panel mv-budget-item">
                  <div>
                    <h3 className="mv-budget-name">{b.name}</h3>
                    <p className="mv-muted">Target: {formatCurrency(b.target_amount)} · Alerts at {b.alert_threshold}%</p>
                    <p className="mv-muted">Scope: {b.scope_type === 'organization' ? 'Organization Wide' : cloudAccounts.find((a) => a.id === b.scope_value)?.name ?? `Account ID: ${b.scope_value}`}</p>
                    <p className="mv-budget-notifies">
                      <BellIcon size={13} aria-hidden />
                      {notified.length > 0
                        ? <span>Notifies {notified.map((c) => `${providerLabel(c)} (${channelSummary(c)})`).join('; ')}</span>
                        : <span className="mv-muted">No active channel will be notified. <a href="#alert-integrations">Add one</a></span>}
                    </p>
                  </div>
                  {canManageBudgets && <button className="mv-icon-button" aria-label={`Delete ${b.name}`} onClick={() => deleteBudget(b)}><TrashIcon size={18} /></button>}
                </li>
              );
            })}
            {budgets.length === 0 && (
              <li className="mv-empty">
                <div className="mv-empty-icon" aria-hidden><CreditCardIcon size={28} /></div>
                <h2>No Budgets Found</h2>
                <p>You haven't set up any budgets yet. Create one to start monitoring your cloud spend and receive alerts.</p>
              </li>
            )}
          </ul>
        </div>
      </section>

      <section id="alert-integrations" aria-labelledby="alert-integrations-title" className="mv-budgets-section mv-budgets-section--integrations">
        <div className="mv-section-head">
          <div>
            <h2 id="alert-integrations-title" className="mv-section-title">Alert Integrations</h2>
            <p className="mv-muted">Where budget alerts are sent. A global channel hears about every budget; a budget-based one only about the budgets it is tied to.</p>
          </div>
          {canManageBudgets && channels.length > 0 && (
            <button type="button" className="mv-primary-button" onClick={() => setDialogOpen(true)}><PlusIcon size={16} style={{ marginRight: '0.375rem' }} />Add channel</button>
          )}
        </div>

        {channels.length === 0 ? (
          <div className="mv-empty">
            <div className="mv-empty-icon" aria-hidden><BellIcon size={28} /></div>
            <h2>No channels added</h2>
            <p>You haven't set up any notification channels. Add one to receive timely alerts about your cloud spend.</p>
            {canManageBudgets && <button type="button" className="mv-primary-button" onClick={() => setDialogOpen(true)}><PlusIcon size={16} style={{ marginRight: '0.375rem' }} />Add your first channel</button>}
          </div>
        ) : (
          <ul className="mv-channel-list" aria-label="Notification channels">
            {channels.map((channel) => {
              const names = linkedBudgetNames(channel, budgets);
              const label = `${providerLabel(channel)} ${channelSummary(channel)}`;
              return (
                <li key={channel.id} className={`mv-channel-row${channel.enabled ? '' : ' is-off'}`}>
                  <div className="mv-channel-main">
                    <p className="mv-channel-title">
                      <strong>{providerLabel(channel)}</strong>
                      <span className="mv-status mv-status--neutral">{channel.alert_scope === 'global' ? 'Global alert' : 'Budget-based'}</span>
                      {!channel.enabled && <span className="mv-status mv-status--warning">Paused</span>}
                    </p>
                    <p className="mv-channel-target">{channelSummary(channel)}</p>
                    {channel.alert_scope === 'budget_specific' && (
                      <p className="mv-muted">{names.length > 0 ? `Tied to: ${names.join(', ')}` : 'Not tied to any budget, so it has nothing to notify for.'}</p>
                    )}
                  </div>
                  <div className="mv-channel-actions">
                    <button type="button" className="mv-toggle" role="switch" aria-checked={channel.enabled} aria-label={`Send alerts to ${label}`} disabled={!canManageBudgets} onClick={() => toggleChannel(channel)} />
                    {canManageBudgets && <button type="button" className="mv-icon-button" aria-label={`Remove ${label}`} onClick={() => removeChannel(channel)}><TrashIcon size={18} /></button>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {!canManageBudgets && <p className="mv-muted">You can see the channels but not change them: you don't have full access to manage integrations.</p>}
      </section>

      {dialogOpen && <AddChannelDialog budgets={budgets} onAdd={addChannel} onClose={() => setDialogOpen(false)} />}
    </div>
  );
}
