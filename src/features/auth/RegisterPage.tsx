import { useState } from 'react';
import { Alert, Button, Checkbox, Form, Input, Result, Steps, Typography } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, type RegisterPayload } from '../../context/AuthContext';
import type { CloudProvider } from '../../types/auth';

/*
 * Registration flow, as implemented by the reference app
 * (pages/RegisterPage.jsx):
 *
 *   0 Email        → POST /auth/send-otp; response says whether the email's
 *                    org already exists (orgExists, orgName)
 *   1 Verify       → POST /auth/verify-otp
 *   2 Details      → full name + password; for a NEW org also an invitation
 *                    token (required) and company name, role = admin.
 *                    Joining an EXISTING org submits straight from here
 *                    (role = member).
 *   3 Cloud access → new orgs only: cloud providers and/or invoice upload,
 *                    at least one required; then POST /auth/register
 *   4 Done         → success screen
 *
 * Every step's fields stay mounted (hidden with display:none) so values
 * survive moving between steps.
 */

const STEP = { email: 0, verify: 1, details: 2, cloud: 3, done: 4 } as const;

const CLOUD_OPTIONS: { label: string; value: CloudProvider }[] = [
  { label: 'Azure', value: 'azure' },
  { label: 'AWS', value: 'aws' },
  { label: 'SAP BTP', value: 'btp' },
  { label: 'Google Cloud', value: 'gcp' },
];

interface RegisterFormValues {
  email: string;
  otp: string;
  fullName: string;
  inviteToken: string;
  orgName: string;
  password: string;
  confirmPassword: string;
  cloudPreference: CloudProvider[];
  invoiceOnly: boolean;
}

interface OrgInfo {
  exists: boolean;
  name: string;
}

interface ApiErrorLike {
  response?: { data?: { error?: string } };
}

function apiErrorText(err: unknown, fallback: string): string {
  return (err as ApiErrorLike).response?.data?.error ?? fallback;
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
  const { register, sendOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const [form] = Form.useForm<RegisterFormValues>();
  const [step, setStep] = useState<number>(STEP.email);
  const [orgInfo, setOrgInfo] = useState<OrgInfo>({ exists: false, name: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState('');
  const cloudPreference = (Form.useWatch('cloudPreference', form) ?? []) as CloudProvider[];
  const invoiceOnly = Boolean(Form.useWatch('invoiceOnly', form));
  const email = Form.useWatch('email', form) as string | undefined;

  const values = () => form.getFieldsValue(true) as RegisterFormValues;

  /** Validates `fields`, returning false (field errors already shown) on failure. */
  const validate = async (fields: (keyof RegisterFormValues)[]) => {
    try {
      await form.validateFields(fields);
      return true;
    } catch {
      return false;
    }
  };

  const handleSendOtp = async () => {
    if (!(await validate(['email']))) return;
    setError(null);
    setBusy(true);
    try {
      const result = await sendOtp(values().email);
      setOrgInfo({ exists: result.orgExists, name: result.orgName ?? '' });
      if (result.orgExists) form.setFieldValue('orgName', result.orgName ?? '');
      setStep(STEP.verify);
    } catch (err) {
      setError(apiErrorText(err, 'Failed to send the verification code.'));
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!(await validate(['otp']))) return;
    setError(null);
    setBusy(true);
    try {
      const { email, otp } = values();
      await verifyOtp(email, otp);
      setStep(STEP.details);
    } catch (err) {
      setError(apiErrorText(err, 'Invalid or expired verification code.'));
    } finally {
      setBusy(false);
    }
  };

  const submitRegistration = async () => {
    setError(null);
    setBusy(true);
    const v = values();
    const payload: RegisterPayload = {
      email: v.email,
      password: v.password,
      fullName: v.fullName,
      orgName: orgInfo.exists ? orgInfo.name : v.orgName,
      role: orgInfo.exists ? 'member' : 'admin',
      otp: v.otp,
      inviteToken: orgInfo.exists ? '' : (v.inviteToken ?? '').trim(),
      cloudPreference: orgInfo.exists ? '' : (v.cloudPreference ?? []).join(','),
      invoiceOnly: orgInfo.exists ? false : Boolean(v.invoiceOnly),
    };
    try {
      await register(payload);
      setStep(STEP.done);
    } catch (err) {
      const message = apiErrorText(err, 'Registration failed. Please try again.');
      const lower = message.toLowerCase();
      // Same error routing as the reference: send the user back to the
      // field the backend rejected.
      if (lower.includes('invitation token') || lower.includes('invalid or already used')) {
        setStep(STEP.details);
        form.setFields([
          {
            name: 'inviteToken',
            errors: [
              'This invitation token is invalid or has already been used. Please request a new one from your Maitsys administrator.',
            ],
          },
        ]);
      } else if (lower.includes('slug') || lower.includes('unique constraint')) {
        setStep(STEP.details);
        form.setFields([
          {
            name: 'orgName',
            errors: ['An organization with a similar name already exists. Please use a more specific company name.'],
          },
        ]);
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDetails = async () => {
    const fields: (keyof RegisterFormValues)[] = orgInfo.exists
      ? ['fullName', 'password', 'confirmPassword']
      : ['fullName', 'inviteToken', 'orgName', 'password', 'confirmPassword'];
    if (!(await validate(fields))) return;
    if (orgInfo.exists) {
      await submitRegistration();
    } else {
      setError(null);
      setStep(STEP.cloud);
    }
  };

  const strength = passwordStrengthScore(password);
  const newOrg = !orgInfo.exists;
  const canCreate = cloudPreference.length > 0 || invoiceOnly;

  const stepItems = [{ title: 'Email' }, { title: 'Verify' }, { title: 'Your details' }];
  if (newOrg) stepItems.push({ title: 'Cloud access' });

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 24 }}>
      <Typography.Title level={3} className="mv-heading">
        Create your Mavera account
      </Typography.Title>

      {step !== STEP.done && (
        <Steps current={Math.min(step, stepItems.length - 1)} size="small" items={stepItems} style={{ marginBottom: 24 }} />
      )}

      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}

      <Form
        form={form}
        layout="vertical"
        initialValues={{ cloudPreference: [], invoiceOnly: false, inviteToken: '', orgName: '' }}
        style={{ display: step === STEP.done ? 'none' : 'block' }}
      >
        {/* Step 0 — email */}
        <div style={{ display: step === STEP.email ? 'block' : 'none' }}>
          <Form.Item
            name="email"
            label="Work email"
            rules={[{ required: true, type: 'email', message: 'Enter a valid email address.' }]}
          >
            <Input autoComplete="email" />
          </Form.Item>
          <Button type="primary" block loading={busy} onClick={handleSendOtp}>
            Get verification code
          </Button>
        </div>

        {/* Step 1 — OTP */}
        <div style={{ display: step === STEP.verify ? 'block' : 'none' }}>
          <Typography.Paragraph type="secondary">
            We sent a 6-digit code to <Typography.Text strong>{email}</Typography.Text>.
          </Typography.Paragraph>
          <Form.Item
            name="otp"
            label="Verification code"
            rules={[{ required: true, message: 'Enter the verification code we emailed you.' }]}
          >
            <Input maxLength={6} inputMode="numeric" autoComplete="one-time-code" />
          </Form.Item>
          <Button type="primary" block loading={busy} onClick={handleVerifyOtp}>
            Verify code
          </Button>
          <Button type="link" block onClick={() => setStep(STEP.email)} style={{ marginTop: 8 }}>
            Change email
          </Button>
        </div>

        {/* Step 2 — details */}
        <div style={{ display: step === STEP.details ? 'block' : 'none' }}>
          {orgInfo.exists && (
            <Alert
              type="info"
              showIcon
              title={`You are joining ${orgInfo.name}`}
              description="Account role: Member"
              style={{ marginBottom: 16 }}
            />
          )}
          <Form.Item name="fullName" label="Full name" rules={[{ required: true, message: 'Full name is required.' }]}>
            <Input autoComplete="name" />
          </Form.Item>

          {newOrg && (
            <>
              <Form.Item
                name="inviteToken"
                label="Invitation token"
                extra="Required to register a new organization."
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: 'Invitation token is required to register a new organization.',
                  },
                ]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="orgName"
                label="Company name"
                rules={[{ required: true, whitespace: true, message: 'Company name is required.' }]}
              >
                <Input autoComplete="organization" />
              </Form.Item>
              <Form.Item label="Your role" extra="You will be the primary administrator for this organization.">
                <Input value="Administrator (Company Owner)" disabled aria-label="Your role" />
              </Form.Item>
            </>
          )}

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, min: 8, message: 'Password must be at least 8 characters.' }]}
          >
            <Input.Password autoComplete="new-password" onChange={(e) => setPassword(e.target.value)} />
          </Form.Item>
          <Typography.Text type="secondary">Password strength: {strength} / 5</Typography.Text>
          <Form.Item
            name="confirmPassword"
            label="Confirm password"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Please confirm your password.' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) return Promise.resolve();
                  return Promise.reject(new Error('Passwords do not match.'));
                },
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" block loading={busy} onClick={handleDetails}>
            {orgInfo.exists ? 'Finish registration' : 'Next'}
          </Button>
        </div>

        {/* Step 3 — cloud / invoice selection (new orgs only) */}
        <div style={{ display: step === STEP.cloud ? 'block' : 'none' }}>
          <Typography.Paragraph>How will you track costs? Choose cloud providers, invoice upload, or both.</Typography.Paragraph>
          <Form.Item name="cloudPreference" label="Live cloud connection">
            <Checkbox.Group options={CLOUD_OPTIONS} />
          </Form.Item>
          <Form.Item name="invoiceOnly" valuePropName="checked" label="Manual invoice upload">
            <Checkbox>Invoice upload (PDF / CSV)</Checkbox>
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <Button onClick={() => setStep(STEP.details)}>Back</Button>
            <Button type="primary" loading={busy} disabled={!canCreate} onClick={submitRegistration}>
              {canCreate ? 'Create account' : 'Select at least one option'}
            </Button>
          </div>
        </div>
      </Form>

      {step === STEP.done && (
        <Result
          status="success"
          title="Signup successful"
          subTitle="Your account has been created. We've also sent a welcome email to your inbox."
          extra={
            <Button type="primary" onClick={() => navigate('/login')}>
              Proceed to sign in
            </Button>
          }
        />
      )}

      {step !== STEP.done && (
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Link to="/login">Already have an account? Sign in</Link>
        </div>
      )}
    </div>
  );
}
