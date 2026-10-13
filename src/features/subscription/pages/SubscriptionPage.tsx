import type { ReactNode } from 'react';
import { AppBreadcrumb } from '../../../shared/ui/AppBreadcrumb';
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
  SwapIcon,
} from '../../../shared/ui/icons';
import { CLOUD_PROVIDER_INFO, MSP_BADGE, PLANS, isCurrentPlan } from '../model/subscriptionData';

const MODULE_LABELS = [
  { key: 'sapMonitoring', label: 'SAP Monitoring', icon: <ServerIcon size={16} /> },
  { key: 'cloudCost', label: 'Cloud Cost Monitoring', icon: <CloudIcon size={16} /> },
  { key: 'idocMonitoring', label: 'IDoc Monitoring', icon: <SwapIcon size={16} /> },
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
      <span className="mv-muted" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{icon}{label}</span>
      <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>{value}</span>
    </div>
  );
}

function FeatureRow({ label, icon, enabled }: { label: string; icon: ReactNode; enabled: boolean }) {
  return (
    <div style={rowStyle}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{icon}{label}</span>
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
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', marginBottom: 8,
        border: '1px solid var(--mv-border)', borderRadius: 10,
        cursor: interactive ? 'pointer' : 'default',
        background: selected ? 'var(--mv-selected)' : 'transparent',
      }}
    >
      {interactive && (
        <span aria-hidden style={{
          width: 18, height: 18, borderRadius: 5, flex: 'none',
          border: `2px solid ${selected ? 'var(--mv-primary)' : 'var(--mv-border)'}`,
          background: selected ? 'var(--mv-primary)' : 'transparent',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {selected && <CheckIcon size={11} style={{ color: 'var(--mv-on-action)' }} />}
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 13 }}>{info.label}</strong>
          <span className="mv-status mv-status--neutral" style={{ fontSize: 10, minHeight: 20 }}>{MSP_BADGE[info.id]}</span>
        </div>
        <p className="mv-muted" style={{ margin: '2px 0 0', fontSize: 12 }}>{info.tagline}</p>
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
      <AppBreadcrumb items={[{ label: 'Subscription' }]} />
      <div className="mv-page-heading">
        <div>
          <h1 className="mv-title">Subscription</h1>
          <p className="mv-subtitle">Your plan, modules and access. Maitsys manages these for your organisation.</p>
        </div>
      </div>

      {/* Current Plan */}
      <section className="mv-panel" style={{ marginBottom: 16 }}>
        <div className="mv-panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
            <p className="mv-muted" style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>Plan details</p>
            <Row icon={<ClockIcon size={16} />} label="Started" value={formatDate(subscriptionStartsAt)} />
            <Row
              icon={<ClockIcon size={16} />}
              label="Valid Until"
              value={<>{formatDate(subscriptionExpiresAt)}<ValidityBadge expiresAt={subscriptionExpiresAt} /></>}
            />
            <Row icon={<ShieldIcon size={16} />} label="Team Members" value={`Up to ${maxUsers ?? '—'}`} />
            <Row
              icon={<SparkleIcon size={16} />}
              label="AI Chatbot"
              value={<span className={aiEnabled ? 'mv-status mv-status--success' : 'mv-status mv-status--neutral'}>{aiEnabled ? 'Enabled' : 'Disabled'}</span>}
            />
          </div>
          <div>
            <p className="mv-muted" style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>Included with your plan</p>
            {includedFeatures.map((f) => <FeatureRow key={f.label} {...f} />)}
          </div>
        </div>
      </section>

      {/* Modules & cloud access — set by Maitsys from the Super Admin portal; read-only here. */}
      <section className="mv-panel" style={{ marginBottom: 16 }}>
        <div className="mv-panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <CloudIcon size={20} />
            <div>
              <p className="mv-eyebrow" style={{ marginBottom: 2 }}>Modules &amp; cloud access</p>
              <h2 className="mv-panel-title">What your organisation is subscribed to</h2>
            </div>
          </div>
          <span className="mv-status mv-status--neutral"><LockIcon size={12} style={{ marginRight: 4 }} />Managed by Maitsys</span>
        </div>

        <div className="mv-columns-16-8" style={cssVars({ '--mv-cols': '1fr 1fr' })}>
          <div>
            <p className="mv-muted" style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>Modules</p>
            {MODULE_LABELS.map((m) => (
              <FeatureRow key={m.key} label={m.label} icon={m.icon} enabled={modules[m.key]} />
            ))}
          </div>
          <div>
            <p className="mv-muted" style={{ fontSize: 12, fontWeight: 500, marginBottom: 8 }}>Cloud providers</p>
            {CLOUD_PROVIDER_INFO.map((info) => (
              <ProviderToggleRow key={info.id} info={info} selected={cloudAccess.includes(info.id)} />
            ))}
            {invoiceOnly && <p className="mv-notice">Invoice-only mode: your cost dashboard is built from uploaded invoices.</p>}
          </div>
        </div>

        <p className="mv-muted" style={{ margin: '16px 0 0', paddingTop: 16, borderTop: '1px solid var(--mv-divider)' }}>
          Your plan, modules, seats and cloud access are set by Maitsys. To change them,{' '}
          <a href="https://www.maitsys.com/contact-us" target="_blank" rel="noopener noreferrer">contact Maitsys</a>.
        </p>
      </section>

      {/* Available Plans */}
      <section style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <StarIcon size={16} />
          <h2 className="mv-panel-title" style={{ margin: 0 }}>Available Plans</h2>
        </div>
        <div className="mv-row-3col">
          {PLANS.map((plan) => {
            const current = isCurrentPlan(planType, plan.id);
            return (
              <article key={plan.id} className="mv-panel" style={{ display: 'flex', flexDirection: 'column', border: current ? '2px solid var(--mv-success)' : plan.badge === 'Most Popular' ? '2px solid var(--mv-primary)' : undefined }}>
                {plan.badge && (
                  <span className={`mv-status ${current ? 'mv-status--success' : 'mv-status--info'}`} style={{ alignSelf: 'flex-start', marginBottom: 8 }}>{plan.badge}</span>
                )}
                {!plan.badge && current && (
                  <span className="mv-status mv-status--success" style={{ alignSelf: 'flex-start', marginBottom: 8 }}>Current</span>
                )}
                <h3 style={{ margin: '0 0 4px', fontSize: 18, fontFamily: 'var(--mv-font-heading)' }}>{plan.name}</h3>
                <p className="mv-muted" style={{ marginBottom: 12 }}>{plan.tagline}</p>
                <span className="mv-status mv-status--neutral" style={{ alignSelf: 'flex-start', marginBottom: 16 }}>Pricing coming soon</span>
                <div style={{ flex: 1, marginBottom: 16 }}>
                  {plan.features.map((f) => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                      <CheckIcon size={15} style={{ color: 'var(--mv-success)', flex: 'none', marginTop: 2 }} />
                      <span style={{ fontSize: 13 }}>{f}</span>
                    </div>
                  ))}
                </div>
                {current ? (
                  <div className="mv-secondary-button" style={{ justifyContent: 'center', pointerEvents: 'none' }}>
                    <CheckIcon size={16} style={{ marginRight: 6, color: 'var(--mv-success)' }} />Current Plan
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
        <p className="mv-muted" style={{ textAlign: 'center', marginTop: 16 }}>
          All plans include full access to multi-cloud monitoring, invoice upload, budgets, and alerts. Contact{' '}
          <a href="https://www.maitsys.com/contact-us" target="_blank" rel="noopener noreferrer">Maitsys</a> to upgrade.
        </p>
      </section>

      {/* Admin Note */}
      {subscriptionNotes && (
        <div className="mv-notice" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
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
