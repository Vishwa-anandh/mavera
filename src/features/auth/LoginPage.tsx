import { useState } from 'react';
import { Alert, Button, Form, Input, Typography } from 'antd';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AuthCarousel } from './AuthCarousel';
import maveraLogo from '../../../assets/brand/mavera.png';

interface LoginFormValues {
  email: string;
  password: string;
}

interface UnlockFormValues {
  unlockToken: string;
}

interface LoginErrorResponse {
  response?: { data?: { message?: string; locked?: boolean } };
}

export function LoginPage() {
  const { login, unlockAccount } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [accountLocked, setAccountLocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [unlockMessage, setUnlockMessage] = useState<string | null>(null);

  const sessionError = searchParams.get('error');

  const handleLogin = async (values: LoginFormValues) => {
    setError(null);
    setSubmitting(true);
    try {
      await login(values.email, values.password);
      navigate('/');
    } catch (err) {
      const data = (err as LoginErrorResponse).response?.data;
      if (data?.locked) {
        setAccountLocked(true);
      } else {
        setError(data?.message ?? 'Incorrect email or password.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnlock = async (values: UnlockFormValues) => {
    setError(null);
    try {
      await unlockAccount(values.unlockToken);
      setAccountLocked(false);
      setUnlockMessage('Your account has been unlocked. You can now log in.');
    } catch {
      setError('That unlock code is invalid or has expired.');
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <img src={maveraLogo} alt="Mavera" width={240} style={{ display: 'block', margin: '0 auto 24px' }} />
          <Typography.Title level={3} className="mv-heading">
            Sign in to Mavera
          </Typography.Title>

          {sessionError === 'session_expired' && (
            <Alert
              type="warning"
              showIcon
              title="Your session expired. Please sign in again."
              style={{ marginBottom: 16 }}
            />
          )}
          {sessionError === 'account_deactivated' && (
            <Alert
              type="error"
              showIcon
              title="This account has been deactivated. Contact your administrator."
              style={{ marginBottom: 16 }}
            />
          )}
          {unlockMessage && <Alert type="success" showIcon title={unlockMessage} style={{ marginBottom: 16 }} />}
          {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}

          {accountLocked ? (
            <Form layout="vertical" onFinish={handleUnlock}>
              <Typography.Paragraph type="secondary">
                Your account is locked. Enter the unlock code we sent you.
              </Typography.Paragraph>
              <Form.Item name="unlockToken" label="Unlock code" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Button type="primary" htmlType="submit" block>
                Unlock account
              </Button>
            </Form>
          ) : (
            <Form layout="vertical" onFinish={handleLogin}>
              <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
                <Input autoComplete="email" />
              </Form.Item>
              <Form.Item name="password" label="Password" rules={[{ required: true }]}>
                <Input.Password autoComplete="current-password" />
              </Form.Item>
              <Button type="primary" htmlType="submit" block loading={submitting}>
                Sign in
              </Button>
            </Form>
          )}

          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between' }}>
            <Link to="/forgot-password">Forgot password?</Link>
            <Link to="/register">Create an account</Link>
          </div>
        </div>
      </div>
      <div style={{ flex: 1, background: 'var(--mv-surface-subtle)' }}>
        <AuthCarousel />
      </div>
    </div>
  );
}
