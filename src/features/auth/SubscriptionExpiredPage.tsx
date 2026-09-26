import { useEffect, useState } from 'react';
import axios from 'axios';
import { Button, Card, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { TOKEN_KEY } from '../../api';

interface CachedSubscription {
  plan?: string;
  expiredAt?: string;
}

function readCachedSubscription(): CachedSubscription {
  try {
    return JSON.parse(sessionStorage.getItem('ccm_expired_sub') ?? '{}');
  } catch {
    return {};
  }
}

export function SubscriptionExpiredPage() {
  const navigate = useNavigate();
  const [subscription] = useState<CachedSubscription>(() => readCachedSubscription());

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    let cancelled = false;
    // Bypasses the wrapped `api` instance deliberately: that instance's own
    // interceptor is what redirected here in the first place, and reusing
    // it would just loop straight back to this page on every 403.
    axios
      .get(`${import.meta.env.VITE_API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(() => {
        if (!cancelled) navigate('/');
      })
      .catch(() => {
        // still expired — stay on this page
      });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div style={{ maxWidth: 480, margin: '80px auto', padding: 24, textAlign: 'center' }}>
      <Typography.Title level={3} className="mv-heading">
        Your subscription has expired
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        {subscription.plan
          ? `Your ${subscription.plan} plan needs to be renewed to keep monitoring your cloud costs.`
          : 'Your organization needs to renew its subscription to keep monitoring cloud costs.'}
      </Typography.Paragraph>
      <Card style={{ textAlign: 'left', marginTop: 24 }}>
        <Typography.Text strong>Need help?</Typography.Text>
        <Typography.Paragraph type="secondary">
          Contact your administrator or Maitsys support to renew your plan.
        </Typography.Paragraph>
      </Card>
      <Button type="primary" style={{ marginTop: 24 }} onClick={() => navigate('/login')}>
        Back to sign in
      </Button>
    </div>
  );
}
