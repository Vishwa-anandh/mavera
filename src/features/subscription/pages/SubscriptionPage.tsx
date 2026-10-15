import type { ReactNode } from 'react';
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
  StarIcon,
  CreditCardIcon,
  LockIcon,
  ServerIcon,
  } from '../../../shared/ui/icons';
import { CLOUD_PROVIDER_INFO, MSP_BADGE, PLANS, isCurrentPlan } from '../model/subscriptionData';
import { PageHeader } from '../../../shared/ui/PageHeader';

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
      <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{value}</span>
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

/**
 * Ported from the reference CCM app's SubscriptionManagementPage.jsx, but entirely
 * read-only: an organisation's plan, modules, seats, cloud access and validity are set
 * by Maitsys in the Super Admin portal (Organizations › Manage), never by the org
 * itself, including its own administrators.
 */
export function SubscriptionPage() {
  const { user, cloudAccess, invoiceOnly, modules, planType, subscriptionStartsAt, subscriptionExpiresAt, subscriptionActive, subscriptionNotes, maxUsers } = useAuth();
  const aiEnabled = user?.aiEnabled ?? false;

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

      {/* Current Plan */}
      <section className="mv-panel" style={{ marginBottom: '1rem' }}>
        <div className="mv-panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CreditCardIcon size={22} />
            <div>
              <p className="mv-eyebrow" style={{ marginBottom: 2 }}>Current Plan</p>
              <h2 className="mv-panel-title" style={{ textTransform: 'capitalize' }}>{planType === 'basic' ? 'Free' : planType}</h2>
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

      {/* Available Plans */}
      <section style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <StarIcon size={16} />
          <h2 className="mv-panel-title" style={{ margin: 0 }}>Available Plans</h2>
        </div>
        <div className="mv-row-3col">
          {PLANS.map((plan) => {
            const current = isCurrentPlan(planType, plan.id);
            return (
              <article key={plan.id} className="mv-panel" style={{ display: 'flex', flexDirection: 'column', border: current ? '2px solid var(--mv-success)' : plan.badge === 'Most Popular' ? '2px solid var(--mv-primary)' : undefined }}>
                {plan.badge && (
                  <span className={`mv-status ${current ? 'mv-status--success' : 'mv-status--info'}`} style={{ alignSelf: 'flex-start', marginBottom: '0.5rem' }}>{plan.badge}</span>
                )}
                {!plan.badge && current && (
                  <span className="mv-status mv-status--success" style={{ alignSelf: 'flex-start', marginBottom: '0.5rem' }}>Current</span>
                )}
                <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.125rem', fontFamily: 'var(--mv-font-heading)' }}>{plan.name}</h3>
                <p className="mv-muted" style={{ marginBottom: '0.75rem' }}>{plan.tagline}</p>
                <span className="mv-status mv-status--neutral" style={{ alignSelf: 'flex-start', marginBottom: '1rem' }}>Pricing coming soon</span>
                <div style={{ flex: 1, marginBottom: '1rem' }}>
                  {plan.features.map((f) => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <CheckIcon size={15} style={{ color: 'var(--mv-success)', flex: 'none', marginTop: 2 }} />
                      <span style={{ fontSize: '0.8125rem' }}>{f}</span>
                    </div>
                  ))}
                </div>
                {current ? (
                  <div className="mv-secondary-button" style={{ justifyContent: 'center', pointerEvents: 'none' }}>
                    <CheckIcon size={16} style={{ marginRight: '0.375rem', color: 'var(--mv-success)' }} />Current Plan
                  </div>
                ) : (
                  <a className="mv-secondary-button" style={{ justifyContent: 'center' }} href="https://www.maitsys.com/contact-us" target="_blank" rel="noopener noreferrer">
                    Contact Maitsys to switch
                  </a>
                )}
              </article>
            );
          })}
        </div>
        <p className="mv-muted" style={{ textAlign: 'center', marginTop: '1rem' }}>
          All plans include full access to multi-cloud monitoring, invoice upload, budgets, and alerts. Contact{' '}
          <a href="https://www.maitsys.com/contact-us" target="_blank" rel="noopener noreferrer">Maitsys</a> to upgrade.
        </p>
      </section>

      {/* Admin Note */}
      {subscriptionNotes && (
        <div className="mv-notice" style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
          <AlertTriangleIcon size={16} style={{ flex: 'none', marginTop: 2, color: 'var(--mv-warning)' }} />
          <div>
            <p style={{ margin: '0 0 2px', fontWeight: 600 }}>Note from Maitsys</p>
            <p style={{ margin: 0 }}>{subscriptionNotes}</p>
          </div>
        </div>
      )}
    </div>
  );
}
