import { useState, type ReactNode } from 'react';
import { subscriptionRepository } from '../../../data-access';
import { fireToast } from '../../../shared/lib/toastEvents';
import { useAuth } from '../../auth';
import { cssVars } from '../../../shared/lib/cssVars';
import {
  CheckIcon,
  ClockIcon,
  ShieldIcon,
  SparkleIcon,
  AlertTriangleIcon,
  CloudIcon,
  FileTextIcon,
  BellIcon,
  TrendUpIcon,
  CreditCardIcon,
  LockIcon,
  ServerIcon,
  } from '../../../shared/ui/icons';
import { CLOUD_PROVIDER_INFO, MSP_BADGE, PLANS, isCurrentPlan, planNameOf, type PlanDefinition } from '../model/subscriptionData';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { TabBar, tabPanelProps } from '../../../shared/ui/TabBar';
import { useHashTab } from '../../../shared/lib/useHashTab';
import { PlanRequestDialog } from '../components/PlanRequestDialog';

const MODULE_LABELS = [
  { key: 'sapMonitoring', label: 'SAP Monitoring', icon: <ServerIcon size={16} /> },
  { key: 'cloudCost', label: 'Cloud Cost Monitoring', icon: <CloudIcon size={16} /> },
] as const;

function formatDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function daysUntil(value?: string | null): number | null {
  if (!value) return null;
  return Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000);
}

function ValidityBadge({ expiresAt }: { expiresAt?: string | null }) {
  const days = daysUntil(expiresAt);
  if (days === null) return null;
  const tone = days < 0 ? 'danger' : days <= 30 ? 'warning' : 'success';
  const label = days < 0 ? `Expired ${Math.abs(days)} days ago` : days === 0 ? 'Expires today' : `${days} days remaining`;
  return <span className={`mv-status mv-status--${tone}`}>{label}</span>;
}

const rowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--mv-divider)' } as const;

function Row({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div style={rowStyle}>
      <span className="mv-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{icon}{label}</span>
      <span style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{value}</span>
    </div>
  );
}

function FeatureRow({ label, icon, enabled }: { label: string; icon: ReactNode; enabled: boolean }) {
  return (
    <div style={rowStyle}>
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{icon}{label}</span>
      <span className={enabled ? 'mv-status mv-status--success' : 'mv-status mv-status--neutral'}>{enabled ? 'Included' : 'Locked'}</span>
    </div>
  );
}

function ProviderToggleRow({ info, selected, onToggle }: { info: (typeof CLOUD_PROVIDER_INFO)[number]; selected: boolean; onToggle?: () => void }) {
  const interactive = Boolean(onToggle);
  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-pressed={interactive ? selected : undefined}
      onClick={onToggle}
      onKeyDown={interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle?.(); } } : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.75rem', marginBottom: '0.5rem',
        border: '1px solid var(--mv-border)', borderRadius: '0.625rem',
        cursor: interactive ? 'pointer' : 'default',
        background: selected ? 'var(--mv-selected)' : 'transparent',
      }}
    >
      {interactive && (
        <span aria-hidden style={{
          width: '1.125rem', height: '1.125rem', borderRadius: '0.3125rem', flex: 'none',
          border: `2px solid ${selected ? 'var(--mv-primary)' : 'var(--mv-border)'}`,
          background: selected ? 'var(--mv-primary)' : 'transparent',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {selected && <CheckIcon size={11} style={{ color: 'var(--mv-on-action)' }} />}
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <strong style={{ fontSize: '0.8125rem' }}>{info.label}</strong>
          <span className="mv-status mv-status--neutral" style={{ fontSize: '0.625rem', minHeight: '1.25rem' }}>{MSP_BADGE[info.id]}</span>
        </div>
        <p className="mv-muted" style={{ margin: '2px 0 0', fontSize: '0.75rem' }}>{info.tagline}</p>
      </div>
      {!interactive && <span className={selected ? 'mv-status mv-status--success' : 'mv-status mv-status--neutral'}>{selected ? 'Enabled' : 'Off'}</span>}
    </div>
  );
}

type SubscriptionTab = 'plan' | 'plans';
const TABS: SubscriptionTab[] = ['plan', 'plans'];

/**
 * Two tabs (the owner asked for tabs here): "Your plan" (the current plan, what the organisation is
 * subscribed to, seats and Maitsys's note) and "Available plans" (the comparison and plan requests).
 * The active tab lives in the URL hash (#plan, #plans).
 *
 * Ported from the reference CCM app's SubscriptionManagementPage.jsx, but entirely
 * read-only: an organisation's plan, modules, seats, cloud access and validity are set
 * by Maitsys in the Super Admin portal (Organizations › Manage), never by the org
 * itself, including its own administrators.
 */
export function SubscriptionPage() {
  const { user, cloudAccess, invoiceOnly, modules, planType, subscriptionStartsAt, subscriptionExpiresAt, subscriptionActive, subscriptionNotes, maxUsers } = useAuth();
  const aiEnabled = user?.aiEnabled ?? false;
  const [requests, setRequests] = useState(() => subscriptionRepository.listPlanRequests());
  const [requesting, setRequesting] = useState<PlanDefinition | null>(null);
  const [tab, showTab] = useHashTab(TABS);

  // Any member can ask; only Maitsys changes the plan, so nothing here touches modules or seats.
  const sendRequest = (plan: PlanDefinition, note: string) => {
    subscriptionRepository.requestPlanChange({ planId: plan.id, requestedBy: user?.email ?? 'unknown', note });
    setRequests(subscriptionRepository.listPlanRequests());
    setRequesting(null);
    fireToast({ type: 'success', message: 'Request sent to Maitsys' });
  };

  const includedFeatures: Array<{ label: string; icon: ReactNode; enabled: boolean }> = [
    { label: 'Cost Dashboard', icon: <CloudIcon size={16} />, enabled: true },
    { label: 'Invoice Upload', icon: <FileTextIcon size={16} />, enabled: true },
    { label: 'Budget Alerts', icon: <BellIcon size={16} />, enabled: true },
    { label: 'Smart Alerts', icon: <AlertTriangleIcon size={16} />, enabled: true },
    { label: 'Recommendations', icon: <TrendUpIcon size={16} />, enabled: true },
    { label: 'AI Chatbot', icon: <SparkleIcon size={16} />, enabled: aiEnabled },
  ];

  return (
    <div>
      <PageHeader title="Subscription" subtitle="Your plan, modules and access. Maitsys manages these for your organisation." />

      <TabBar
        idPrefix="subscription"
        label="Subscription sections"
        activeId={tab}
        onChange={(id) => showTab(id as SubscriptionTab)}
        items={[{ id: 'plan', label: 'Your plan' }, { id: 'plans', label: 'Available plans' }]}
      />

      {tab === 'plan' && (
      <div {...tabPanelProps('subscription', 'plan')}>
      {/* Current Plan */}
      <section className="mv-panel" style={{ marginBottom: '1rem' }}>
        <div className="mv-panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CreditCardIcon size={22} />
            <div>
              <p className="mv-eyebrow" style={{ marginBottom: 2 }}>Current Plan</p>
              <h2 className="mv-panel-title">{planNameOf(planType)}</h2>
            </div>
          </div>
          <span className={`mv-status mv-status--${subscriptionActive ? 'success' : 'danger'}`}>{subscriptionActive ? 'Active' : 'Inactive'}</span>
        </div>

        <div className="mv-columns-16-8" style={cssVars({ '--mv-cols': '1fr 1fr' })}>
          <div>
            <p className="mv-muted" style={{ fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.25rem' }}>Plan details</p>
            <Row icon={<ClockIcon size={16} />} label="Started" value={formatDate(subscriptionStartsAt)} />
            <Row
              icon={<ClockIcon size={16} />}
              label="Valid Until"
              value={<>{formatDate(subscriptionExpiresAt)}<ValidityBadge expiresAt={subscriptionExpiresAt} /></>}
            />
            <Row icon={<ShieldIcon size={16} />} label="Team Members" value={maxUsers ? `Up to ${maxUsers}` : 'No seat limit'} />
            <Row
              icon={<SparkleIcon size={16} />}
              label="AI Chatbot"
              value={<span className={aiEnabled ? 'mv-status mv-status--success' : 'mv-status mv-status--neutral'}>{aiEnabled ? 'Enabled' : 'Disabled'}</span>}
            />
          </div>
          <div>
            <p className="mv-muted" style={{ fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.25rem' }}>Included with your plan</p>
            {includedFeatures.map((f) => <FeatureRow key={f.label} {...f} />)}
          </div>
        </div>
      </section>

      {/* Modules & cloud access — set by Maitsys from the Super Admin portal; read-only here. */}
      <section className="mv-panel" style={{ marginBottom: '1rem' }}>
        <div className="mv-panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CloudIcon size={20} />
            <div>
              <p className="mv-eyebrow" style={{ marginBottom: 2 }}>Modules &amp; cloud access</p>
              <h2 className="mv-panel-title">What your organisation is subscribed to</h2>
            </div>
          </div>
          <span className="mv-status mv-status--neutral"><LockIcon size={12} style={{ marginRight: '0.25rem' }} />Managed by Maitsys</span>
        </div>

        <div className="mv-columns-16-8" style={cssVars({ '--mv-cols': '1fr 1fr' })}>
          <div>
            <p className="mv-muted" style={{ fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.25rem' }}>Modules</p>
            {MODULE_LABELS.map((m) => (
              <FeatureRow key={m.key} label={m.label} icon={m.icon} enabled={modules[m.key]} />
            ))}
          </div>
          <div>
            <p className="mv-muted" style={{ fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.5rem' }}>Cloud providers</p>
            {CLOUD_PROVIDER_INFO.map((info) => (
              <ProviderToggleRow key={info.id} info={info} selected={cloudAccess.includes(info.id)} />
            ))}
            {invoiceOnly && <p className="mv-notice">Invoice-only mode: your cost dashboard is built from uploaded invoices.</p>}
          </div>
        </div>

        <p className="mv-muted" style={{ margin: '1rem 0 0', paddingTop: '1rem', borderTop: '1px solid var(--mv-divider)' }}>
          Your plan, modules, seats and cloud access are set by Maitsys. To change them,{' '}
          <a href="https://www.maitsys.com/contact-us" target="_blank" rel="noopener noreferrer">contact Maitsys</a>.
        </p>
      </section>

      {/* Admin Note */}
      {subscriptionNotes && (
        <div className="mv-notice" style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
          <AlertTriangleIcon size={16} style={{ flex: 'none', marginTop: 2, color: 'var(--mv-warning)' }} />
          <div>
            <p style={{ margin: '0 0 2px', fontWeight: 500 }}>Note from Maitsys</p>
            <p style={{ margin: 0 }}>{subscriptionNotes}</p>
          </div>
        </div>
      )}
      </div>
      )}

      {tab === 'plans' && (
      /* Available Plans */
      <section {...tabPanelProps('subscription', 'plans')} style={{ marginBottom: '1rem' }}>
        <div className="mv-section-head">
          <div>
            <h2 className="mv-section-title">Available plans</h2>
            <p className="mv-muted">Compare what each plan includes. Choosing a plan sends Maitsys a request; nothing changes until Maitsys confirms.</p>
          </div>
        </div>
        <div className="mv-plan-grid">
          {PLANS.map((plan) => {
            const current = isCurrentPlan(planType, plan.id);
            const request = requests.find((r) => r.planId === plan.id);
            return (
              <article key={plan.id} className={`mv-plan-card${current ? ' is-current' : ''}`} aria-labelledby={`plan-${plan.id}-name`}>
                <div className="mv-plan-badges">
                  {current && <span className="mv-status mv-status--success">Current</span>}
                  {!current && plan.badge && <span className="mv-status mv-status--info">{plan.badge}</span>}
                  {request && <span className="mv-status mv-status--neutral">Requested {new Date(request.requestedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                </div>
                <h3 id={`plan-${plan.id}-name`} className="mv-plan-name">{plan.name}</h3>
                <p className="mv-muted">{plan.tagline}</p>
                <p className="mv-plan-price">Pricing coming soon</p>
                <ul className="mv-plan-features" aria-label={`${plan.name} plan features`}>
                  {plan.features.map((f) => (
                    <li key={f}><CheckIcon size={15} aria-hidden /><span>{f}</span></li>
                  ))}
                </ul>
                {current ? (
                  <button type="button" className="mv-secondary-button" disabled aria-label={`${plan.name} is your current plan`}>
                    <CheckIcon size={16} style={{ marginRight: '0.375rem', color: 'var(--mv-success)' }} />Current plan
                  </button>
                ) : request ? (
                  <button type="button" className="mv-secondary-button" disabled>Request sent</button>
                ) : (
                  <button type="button" className="mv-secondary-button" aria-label={`Choose plan ${plan.name}`} onClick={() => setRequesting(plan)}>Choose plan</button>
                )}
              </article>
            );
          })}
        </div>
        <p className="mv-muted">
          All plans include full access to multi-cloud monitoring, invoice upload, budgets, and alerts. Prefer to talk it through?{' '}
          <a href="https://www.maitsys.com/contact-us" target="_blank" rel="noopener noreferrer">Contact Maitsys</a>.
        </p>
      </section>
      )}

      {requesting && <PlanRequestDialog plan={requesting} currentPlanName={planNameOf(planType)} onSend={(note) => sendRequest(requesting, note)} onClose={() => setRequesting(null)} />}
    </div>
  );
}
