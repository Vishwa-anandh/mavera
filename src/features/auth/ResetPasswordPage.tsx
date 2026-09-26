import { useState } from 'react';
import { Alert, Button, Form, Input, Typography } from 'antd';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api';

interface ResetPasswordFormValues {
  password: string;
  confirmPassword: string;
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: ResetPasswordFormValues) => {
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/auth/reset-password', { token, password: values.password });
      navigate('/login');
    } catch {
      setError('That reset link is invalid or has expired.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div style={{ maxWidth: 360, margin: '80px auto', padding: 24 }}>
        <Alert type="error" showIcon title="This reset link is missing its token. Request a new one." />
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Link to="/forgot-password">Request a new link</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 360, margin: '80px auto', padding: 24 }}>
      <Typography.Title level={3} className="mv-heading">
        Choose a new password
      </Typography.Title>

      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}

      <Form layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="password"
          label="New password"
          rules={[{ required: true, min: 8, message: 'Password must be at least 8 characters.' }]}
        >
          <Input.Password />
        </Form.Item>
        <Form.Item
          name="confirmPassword"
          label="Confirm new password"
          dependencies={['password']}
          rules={[
            { required: true, message: 'Please confirm your new password.' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) return Promise.resolve();
                return Promise.reject(new Error('Passwords do not match.'));
              },
            }),
          ]}
        >
          <Input.Password />
        </Form.Item>
        <Button type="primary" htmlType="submit" block loading={submitting}>
          Reset password
        </Button>
      </Form>
    </div>
  );
}
