import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useConfirm } from '../../../shared/ui/ConfirmProvider';
import { Select } from '../../../shared/ui/Select';
import { fireToast } from '../../../shared/lib/toastEvents';
import { CloudIcon, ServerIcon, ClockIcon, UsersIcon, FileTextIcon, LockIcon } from '../../../shared/ui/icons';
import type { CloudProvider } from '../../../shared/types/auth';
import { ExpiryBadge } from '../components/OrgStatus';
import { extendDate, formatLongDate, today } from '../model/orgDates';
import { createOrganization, saveOrganization, useOrganization } from '../model/organizationsStore';
import { CLOUD_PROVIDER_OPTIONS, MAX_USER_OPTIONS, MODULE_DEFS, type Organization } from '../model/superAdminTypes';

type Draft = Omit<Organization, 'id' | 'memberCount'> & { notes: string };

const MODULE_ICONS = { cloudCost: CloudIcon, sapMonitoring: ServerIcon } as const;
const PROVIDER_LABELS: Record<CloudProvider, string> = { azure: 'Microsoft Azure', aws: 'AWS', btp: 'SAP BTP', gcp: 'Google Cloud' };

function toDraft(org: Organization): Draft {
  return { ...org, modules: { ...org.modules }, cloudAccess: [...org.cloudAccess], notes: org.notes ?? '' };
}

function emptyDraft(): Draft {
  return {
    name: '',
    modules: { cloudCost: false, sapMonitoring: false },
    maxUsers: 10,
    aiEnabled: false,
    cloudAccess: [],
    invoiceOnly: false,
    startsAt: today(),
    expiresAt: extendDate(null, { months: 12 }),
    notes: '',
  };
}

function Section({ title, icon, description, children }: { title: string; icon: ReactNode; description?: string; children: ReactNode }) {
  return (
    <section className="mv-panel mv-sa-org-section">
      <div className="mv-sa-org-section-head">
        <span className="mv-sa-org-section-icon" aria-hidden="true">{icon}</span>
        <div>
          <h2 className="mv-panel-title">{title}</h2>
          {description && <p className="mv-muted">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/**
 * One organization's subscription as a full page (/admin/organizations/:orgId), or the
 * onboarding form for a new one (/admin/organizations/new). Only Maitsys super admins reach
 * it; the organization itself sees the same settings read-only on its Subscription page.
 * Keyed by id so moving between organizations starts from a fresh draft.
 */
export function SuperAdminOrganizationPage() {
  const { orgId } = useParams();
  return <OrganizationEditor key={orgId ?? 'new'} orgId={orgId} />;
}

function OrganizationEditor({ orgId }: { orgId?: string }) {
  const isNew = orgId === undefined;
  const org = useOrganization(orgId);
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [draft, setDraft] = useState<Draft>(() => (org ? toDraft(org) : emptyDraft()));
  const [nameError, setNameError] = useState<string | null>(null);

  if (!isNew && !org) {
    return (
      <div className="mv-sa-content">
        <div className="mv-empty">
          <h2>Organization not found</h2>
          <p>It may have been removed, or the link is wrong.</p>
          <Link className="mv-secondary-button" to="/admin/organizations">Back to organizations</Link>
        </div>
      </div>
    );
  }

  const baseline = org ? toDraft(org) : emptyDraft();
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  const set = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));
  const toggleProvider = (provider: CloudProvider, on: boolean) =>
    set({ cloudAccess: on ? [...draft.cloudAccess, provider] : draft.cloudAccess.filter((p) => p !== provider) });

  const leave = async () => {
    if (dirty && !(await confirm({ title: 'Discard your changes?', description: 'Nothing you changed on this page will be saved.', okText: 'Discard changes', cancelText: 'Keep editing' }))) return;
    navigate('/admin/organizations');
  };

  const save = () => {
    const name = draft.name.trim();
    if (isNew && !name) {
      setNameError('Organization name is required.');
      document.getElementById('org-name')?.focus();
      return;
    }
    if (isNew) {
      createOrganization({ ...draft, name });
      fireToast({ type: 'success', message: `${name} was created.` });
    } else if (org) {
      saveOrganization({ ...org, ...draft });
      fireToast({ type: 'success', message: `Saved changes to ${org.name}.` });
    }
    navigate('/admin/organizations');
  };

  const title = isNew ? 'New organization' : org!.name;

  return (
    <div className="mv-sa-content mv-sa-org">
      <div className="mv-page-heading">
        <div>
          <h1 className="mv-title">{title}</h1>
          <p className="mv-subtitle">
            {isNew
              ? 'Onboard a customer: choose its modules, seats, cloud access and subscription period.'
              : `${org!.memberCount} members · subscribed since ${formatLongDate(org!.startsAt)}`}
          </p>
        </div>
        {!isNew && <ExpiryBadge expiresAt={org!.expiresAt} />}
      </div>

      <p className="mv-sa-org-note"><LockIcon size={14} aria-hidden /> Only Maitsys super admins can change these settings. The organization sees them read-only.</p>

      <div className="mv-sa-org-grid">
        <div className="mv-sa-org-col">
          {isNew && (
            <Section title="Organization" icon={<FileTextIcon size={18} />}>
              <label className="mv-field">
                Organization name
                <input
                  id="org-name"
                  value={draft.name}
                  onChange={(e) => { set({ name: e.target.value }); if (nameError) setNameError(null); }}
                  placeholder="e.g. Acme Industrial Group"
                  aria-invalid={nameError ? true : undefined}
                  aria-describedby={nameError ? 'org-name-error' : undefined}
                  autoFocus
                />
              </label>
              {nameError && <span id="org-name-error" className="mv-field-error" role="alert">{nameError}</span>}
            </Section>
          )}

          <Section title="Subscription period" icon={<ClockIcon size={18} />} description="When access starts and ends. Extending counts from today if the subscription has lapsed.">
            <div className="mv-sa-field-grid">
              <label className="mv-field">
                Starts
                <input type="date" value={draft.startsAt} onChange={(e) => set({ startsAt: e.target.value })} />
              </label>
              <label className="mv-field">
                Expires
                <input type="date" value={draft.expiresAt ?? ''} min={draft.startsAt} disabled={draft.expiresAt === null} onChange={(e) => set({ expiresAt: e.target.value || null })} />
              </label>
            </div>
            <div className="mv-sa-extend">
              <label className="mv-choice">
                <input type="checkbox" checked={draft.expiresAt === null} onChange={(e) => set({ expiresAt: e.target.checked ? null : extendDate(null, { months: 12 }) })} />
                No expiry
              </label>
              <span className="mv-muted">Extend by</span>
              <button type="button" className="mv-secondary-button" onClick={() => set({ expiresAt: extendDate(draft.expiresAt, { days: 30 }) })}>30 days</button>
              <button type="button" className="mv-secondary-button" onClick={() => set({ expiresAt: extendDate(draft.expiresAt, { months: 12 }) })}>1 year</button>
            </div>
          </Section>

          <Section title="Modules and seats" icon={<UsersIcon size={18} />} description="Modules the organization can use and how many people it can invite.">
            <fieldset className="mv-sa-fieldset">
              <legend className="mv-sr-only">Modules subscribed</legend>
              <div className="mv-choice-grid">
                {MODULE_DEFS.map((m) => {
                  const Icon = MODULE_ICONS[m.key];
                  return (
                    <label className="mv-choice" key={m.key}>
                      <input type="checkbox" checked={draft.modules[m.key]} onChange={(e) => set({ modules: { ...draft.modules, [m.key]: e.target.checked } })} />
                      <Icon size={16} /> {m.label}
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <div className="mv-sa-field-grid" style={{ marginTop: '0.875rem' }}>
              <Select
                label="Max users"
                value={draft.maxUsers}
                onChange={(maxUsers) => set({ maxUsers })}
                options={MAX_USER_OPTIONS.map((n) => ({ value: n, label: n === 0 ? 'Unlimited' : `${n} users` }))}
              />
              <div className="mv-sa-switch-row">
                <button type="button" className="mv-toggle" role="switch" aria-checked={draft.aiEnabled} aria-labelledby="org-ai-label" onClick={() => set({ aiEnabled: !draft.aiEnabled })} />
                <span id="org-ai-label">AI Assistant access</span>
              </div>
            </div>
          </Section>
        </div>

        <div className="mv-sa-org-col">
          <Section title="Cloud access" icon={<CloudIcon size={18} />} description="Providers the organization connects live. Invoice-only orgs upload invoices instead.">
            <fieldset className="mv-sa-fieldset">
              <legend className="mv-sr-only">Cloud provider access</legend>
              <div className="mv-choice-grid">
                {CLOUD_PROVIDER_OPTIONS.map((provider) => (
                  <label className="mv-choice" key={provider}>
                    <input type="checkbox" checked={draft.cloudAccess.includes(provider)} onChange={(e) => toggleProvider(provider, e.target.checked)} />
                    {PROVIDER_LABELS[provider]}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="mv-choice" style={{ marginTop: '0.625rem' }}>
              <input type="checkbox" checked={draft.invoiceOnly} onChange={(e) => set({ invoiceOnly: e.target.checked })} />
              Invoice only (no live cloud API connection)
            </label>
          </Section>

          <Section title="Note to the organization" icon={<FileTextIcon size={18} />} description="Shown on the organization's Subscription page.">
            <label className="mv-field">
              <span className="mv-sr-only">Note to the organization</span>
              <textarea rows={3} value={draft.notes} placeholder="e.g. Extended per renewal agreement, invoice #1234" onChange={(e) => set({ notes: e.target.value })} />
            </label>
          </Section>
        </div>
      </div>

      <div className="mv-sa-actionbar" role="region" aria-label="Save changes">
        <span className="mv-muted" aria-live="polite">{isNew ? 'Not created yet' : dirty ? 'You have unsaved changes' : 'All changes saved'}</span>
        <div className="mv-sa-actionbar-buttons">
          <button type="button" className="mv-secondary-button" onClick={leave}>Cancel</button>
          <button type="button" className="mv-primary-button" onClick={save} disabled={!isNew && !dirty}>{isNew ? 'Create organization' : 'Save changes'}</button>
        </div>
      </div>
    </div>
  );
}
