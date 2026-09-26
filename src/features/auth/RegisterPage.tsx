import { useState } from 'react';
import { Button, Checkbox, Form, Input, Steps, Typography } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, type RegisterPayload } from '../../context/AuthContext';
import type { CloudProvider } from '../../types/auth';

const STEP_FIELDS: string[][] = [
  ['organizationName'],
  ['fullName', 'email'],
  ['password', 'confirmPassword'],
  ['cloudAccess', 'invoiceOnly'],
  [],
];

const CLOUD_OPTIONS: { label: string; value: CloudProvider }[] = [
  { label: 'Azure', value: 'azure' },
  { label: 'AWS', value: 'aws' },
  { label: 'SAP BTP', value: 'btp' },
  { label: 'Google Cloud', value: 'gcp' },
];

interface RegisterFormValues {
  organizationName: string;
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  cloudAccess: CloudProvider[];
  invoiceOnly: boolean;
}

function passwordStrengthScore(password: string): number {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form] = Form.useForm<RegisterFormValues>();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [password, setPassword] = useState('');

  const goNext = async () => {
    try {
      await form.validateFields(STEP_FIELDS[step]);
      setStep((s) => s + 1);
    } catch {
      // form.validateFields already renders the field-level error text
    }
  };

  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const values = form.getFieldsValue(true) as RegisterFormValues;
      const payload: RegisterPayload = {
        organizationName: values.organizationName,
        email: values.email,
        password: values.password,
        fullName: values.fullName,
        cloudAccess: values.cloudAccess ?? [],
        invoiceOnly: values.invoiceOnly ?? false,
      };
      await register(payload);
      navigate('/login');
    } catch {
      setError('Registration failed. Please check your details and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const strength = passwordStrengthScore(password);

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 24 }}>
      <Typography.Title level={3} className="mv-heading">
        Create your Mavera account
      </Typography.Title>

      <Steps
        current={step}
        size="small"
        items={[
          { title: 'Organization' },
          { title: 'Personal info' },
          { title: 'Password' },
          { title: 'Cloud providers' },
          { title: 'Review' },
        ]}
        style={{ marginBottom: 24 }}
      />

      {error && <Typography.Text type="danger">{error}</Typography.Text>}

      <Form form={form} layout="vertical" initialValues={{ cloudAccess: [], invoiceOnly: false }}>
        <div style={{ display: step === 0 ? 'block' : 'none' }}>
          <Form.Item
            name="organizationName"
            label="Organization name"
            rules={[{ required: step === 0, message: 'Organization name is required.' }]}
          >
            <Input />
          </Form.Item>
        </div>

        <div style={{ display: step === 1 ? 'block' : 'none' }}>
          <Form.Item
            name="fullName"
            label="Full name"
            rules={[{ required: step === 1, message: 'Full name is required.' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: step === 1, type: 'email', message: 'Enter a valid email address.' }]}
          >
            <Input />
          </Form.Item>
        </div>

        <div style={{ display: step === 2 ? 'block' : 'none' }}>
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: step === 2, min: 8, message: 'Password must be at least 8 characters.' }]}
          >
            <Input.Password onChange={(e) => setPassword(e.target.value)} />
          </Form.Item>
          <Typography.Text type="secondary">Password strength: {strength} / 5</Typography.Text>
          <Form.Item
            name="confirmPassword"
            label="Confirm password"
            dependencies={['password']}
            rules={[
              { required: step === 2, message: 'Please confirm your password.' },
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
        </div>

        <div style={{ display: step === 3 ? 'block' : 'none' }}>
          <Form.Item name="cloudAccess" label="Which cloud providers do you use?">
            <Checkbox.Group options={CLOUD_OPTIONS} />
          </Form.Item>
          <Form.Item name="invoiceOnly" valuePropName="checked">
            <Checkbox>Invoice-only (no cloud account connections)</Checkbox>
          </Form.Item>
        </div>

        <div style={{ display: step === 4 ? 'block' : 'none' }}>
          <Typography.Paragraph>
            Review your details, then create your account. You can change your plan any time from Subscription.
          </Typography.Paragraph>
        </div>
      </Form>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
        <Button onClick={goBack} disabled={step === 0}>
          Back
        </Button>
        {step < 4 ? (
          <Button type="primary" onClick={goNext}>
            Next
          </Button>
        ) : (
          <Button type="primary" loading={submitting} onClick={handleSubmit}>
            Create account
          </Button>
        )}
      </div>

      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <Link to="/login">Already have an account? Sign in</Link>
      </div>
    </div>
  );
}
