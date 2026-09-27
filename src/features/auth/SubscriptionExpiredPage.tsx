import { useEffect, useState } from 'react';
import axios from 'axios';
import { Button, Card, Col, Descriptions, Row, Typography } from 'antd';
import { CheckOutlined, MinusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { TOKEN_KEY } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { hardNavigate } from '../../lib/hardNavigate';
import { StatusTag } from '../../components/StatusTag';

export const EXPIRED_SUB_KEY = 'ccm_expired_sub';

/** The `subscription` object the backend attaches to a 403 subscriptionExpired response. */
interface CachedSubscription {
  plan_type?: string;
  expires_at?: string;
  max_users?: number;
  ai_enabled?: boolean;
  max_azure_accounts?: number;
  max_aws_accounts?: number;
  max_btp_accounts?: number;
}

interface PlanTier {
  id: string;
  name: string;
  tagline: string;
  team: string;
  clouds: string;
  accounts: string;
  ai: boolean;
  invoices: boolean;
  alerts: boolean;
}

// Plan tiers as presented by the reference app's SubscriptionExpiredPage.jsx.
const PLANS: PlanTier[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Azure & AWS monitoring to get started',
    team: 'Up to 5 team members',
    clouds: 'Azure & AWS',
    accounts: '1 account per provider',
    ai: false,
    invoices: true,
    alerts: true,
  },
  {
    id: 'basic',
    name: 'Professional',
    tagline: 'For growing teams with deeper needs',
    team: 'Up to 25 team members',
    clouds: 'Azure, AWS, GCP & SAP BTP',
    accounts: '5 accounts per provider',
    ai: true,
    invoices: true,
    alerts: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'Unlimited scale, dedicated support',
    team: 'Unlimited team members',
    clouds: 'All providers + custom',
    accounts: 'Unlimited accounts',
    ai: true,
    invoices: true,
    alerts: true,
  },
];

const CONTACT_URL = 'https://www.maitsys.com/contact-us';

function readCachedSubscription(): CachedSubscription | null {
  try {
    const raw = sessionStorage.getItem(EXPIRED_SUB_KEY);
    return raw ? (JSON.parse(raw) as CachedSubscription) : null;
  } catch {
    return null;
  }
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function Included({ value, label }: { value: boolean; label: string }) {
  return value ? (
    <span>
      <CheckOutlined aria-hidden /> {label}
    </span>
  ) : (
    <Typography.Text type="secondary">
      <MinusOutlined aria-hidden /> {label} not included
    </Typography.Text>
  );
}

export function SubscriptionExpiredPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [subscription] = useState<CachedSubscription | null>(() => readCachedSubscription());
  const hasToken = Boolean(localStorage.getItem(TOKEN_KEY));

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    // No token = arrived from a failed login; the user must sign in again.
    if (!token) return;

    let cancelled = false;
    // Bypasses the wrapped `api` instance deliberately: that instance's own
    // interceptor is what redirected here in the first place.
    axios
      .get(`${import.meta.env.VITE_API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(() => {
        if (cancelled) return;
        // Renewed. A hard reload (not a router navigate) is required so
        // AuthProvider re-runs its mount /auth/me with the now-valid
        // subscription — otherwise `user` is still null and AppShell would
        // bounce straight to /login (reference does the same).
        sessionStorage.removeItem(EXPIRED_SUB_KEY);
        hardNavigate('/');
      })
      .catch(() => {
        // still expired — stay on this page
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  const currentPlanId = subscription?.plan_type ?? null;
  const expiredOn = subscription?.expires_at
    ? new Date(subscription.expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 16px' }}>
      <div style={{ textAlign: 'center' }}>
        <Typography.Title level={3} className="mv-heading">
          Your subscription has expired
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          {currentPlanId
            ? `Your ${capitalise(PLANS.find((p) => p.id === currentPlanId)?.name ?? currentPlanId)} plan needs to be renewed to keep monitoring your cloud costs.`
            : 'Your organization needs to renew its subscription to keep monitoring cloud costs.'}
        </Typography.Paragraph>
        {expiredOn && <StatusTag tone="neutral">{`Expired on ${expiredOn}`}</StatusTag>}
      </div>

      {subscription && (
        <Card title="Your last subscription" style={{ marginTop: 24 }}>
          <Descriptions
            column={{ xs: 1, sm: 2, md: 4 }}
            items={[
              { key: 'plan', label: 'Plan', children: capitalise(subscription.plan_type ?? '—') },
              { key: 'users', label: 'Max users', children: subscription.max_users ?? '—' },
              { key: 'ai', label: 'AI insights', children: subscription.ai_enabled ? 'Enabled' : 'Disabled' },
              {
                key: 'accounts',
                label: 'Max accounts',
                children: `Azure ${subscription.max_azure_accounts ?? '—'} · AWS ${subscription.max_aws_accounts ?? '—'} · BTP ${subscription.max_btp_accounts ?? '—'}`,
              },
            ]}
          />
        </Card>
      )}

      <Typography.Title level={4} className="mv-heading" style={{ marginTop: 32 }}>
        Available plans
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        Choose a plan to renew — the Maitsys team will get in touch to complete the process.
      </Typography.Paragraph>
      <Row gutter={[16, 16]}>
        {PLANS.map((plan) => (
          <Col key={plan.id} xs={24} md={8}>
            <Card
              title={plan.name}
              extra={plan.id === currentPlanId ? <StatusTag tone="neutral">Current plan</StatusTag> : null}
              style={{ height: '100%' }}
            >
              <Typography.Paragraph type="secondary">{plan.tagline}</Typography.Paragraph>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
                <li>{plan.team}</li>
                <li>{plan.clouds}</li>
                <li>{plan.accounts}</li>
                <li>
                  <Included value={plan.ai} label="AI insights" />
                </li>
                <li>
                  <Included value={plan.invoices} label="Invoices" />
                </li>
                <li>
                  <Included value={plan.alerts} label="Smart alerts" />
                </li>
              </ul>
              <Button href={CONTACT_URL} target="_blank" rel="noopener noreferrer" block style={{ marginTop: 16 }}>
                Contact sales
              </Button>
            </Card>
          </Col>
        ))}
      </Row>

      <Card style={{ marginTop: 24 }}>
        <Typography.Text strong>Need help?</Typography.Text>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          Contact your administrator or Maitsys support to renew your plan.
        </Typography.Paragraph>
      </Card>

      <div style={{ textAlign: 'center', marginTop: 24 }}>
        {hasToken ? (
          <Button onClick={handleSignOut}>Sign out and use a different account</Button>
        ) : (
          <Button type="primary" onClick={() => navigate('/login')}>
            Back to sign in
          </Button>
        )}
      </div>
    </div>
  );
}
