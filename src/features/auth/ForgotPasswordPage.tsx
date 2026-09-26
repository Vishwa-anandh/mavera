import { useState } from 'react';
import { Alert, Button, Form, Input, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { api } from '../../api';

interface ForgotPasswordFormValues {
  email: string;
}

export function ForgotPasswordPage() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: ForgotPasswordFormValues) => {
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/auth/forgot-password', { email: values.email });
      setSent(true);
    } catch {
      setError('We could not process that request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: '80px auto', padding: 24 }}>
      <Typography.Title level={3} className="mv-heading">
        Reset your password
      </Typography.Title>

      {sent ? (
        <Alert type="success" showIcon title="If that email exists, we've sent password reset instructions." />
      ) : (
        <Form layout="vertical" onFinish={handleSubmit}>
          {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, type: 'email', message: 'Enter a valid email address.' }]}
          >
            <Input autoComplete="email" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={submitting}>
            Send reset instructions
          </Button>
        </Form>
      )}

      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <Link to="/login">Back to sign in</Link>
      </div>
    </div>
  );
}
