import { useState } from 'react';
import { Alert, Button, Form, Input, Modal, Result, Space, Steps } from 'antd';
import { api } from '../../api';
import type { CloudProvider } from '../../types/auth';

type ConnectableProvider = Extract<CloudProvider, 'azure' | 'aws'>;

interface ConnectCloudAccountWizardProps {
  provider: ConnectableProvider;
  open: boolean;
  onClose: () => void;
}

interface ConnectionFormValues {
  name: string;
  subscriptionId?: string;
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const AWS_ACCESS_KEY_RE = /^(AKIA|ASIA)[A-Z0-9]{16}$/;

/**
 * Client-side credential format checks — the only "test" the reference app
 * performs before saving (pages/HomePage.jsx GetStartedWizard.handleConnect,
 * azure/pages/AccountManager.jsx, aws/pages/AccountManager.jsx). There is no
 * separate test-connection endpoint. Returns the first problem found, or null.
 */
export function validateCredentials(provider: ConnectableProvider, values: ConnectionFormValues): string | null {
  if (provider === 'azure') {
    if (!UUID_RE.test(values.tenantId ?? '')) return 'Invalid Tenant ID format. Must be a valid UUID.';
    if (!UUID_RE.test(values.clientId ?? '')) return 'Invalid Client ID format. Must be a valid UUID.';
    if (!UUID_RE.test(values.subscriptionId ?? '')) return 'Invalid Subscription ID format. Must be a valid UUID.';
    return null;
  }
  if (!AWS_ACCESS_KEY_RE.test(values.accessKeyId ?? '')) {
    return 'Invalid Access Key ID. Should start with AKIA or ASIA and be 20 chars.';
  }
  if ((values.secretAccessKey ?? '').length < 40) {
    return 'Invalid Secret Access Key. Should be at least 40 characters.';
  }
  return null;
}

/** POST body per provider, as the reference sends it. */
function buildPayload(provider: ConnectableProvider, values: ConnectionFormValues) {
  if (provider === 'azure') {
    return {
      name: values.name,
      subscriptionId: values.subscriptionId,
      tenantId: values.tenantId,
      clientId: values.clientId,
      clientSecret: values.clientSecret,
    };
  }
  return { name: values.name, accessKey: values.accessKeyId, secretKey: values.secretAccessKey };
}

const STEP_FIELDS: Record<ConnectableProvider, (keyof ConnectionFormValues)[]> = {
  azure: ['name', 'subscriptionId', 'tenantId', 'clientId', 'clientSecret'],
  aws: ['name', 'accessKeyId', 'secretAccessKey'],
};

export function ConnectCloudAccountWizard({ provider, open, onClose }: ConnectCloudAccountWizardProps) {
  const [form] = Form.useForm<ConnectionFormValues>();
  const [step, setStep] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const values = () => form.getFieldsValue(true) as ConnectionFormValues;

  const reset = () => {
    form.resetFields();
    setStep(0);
    setValidationError(null);
    setSubmitError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const goNext = async () => {
    try {
      await form.validateFields(STEP_FIELDS[provider]);
      setValidationError(null);
      setStep(1);
    } catch {
      // validateFields already renders the field-level error text
    }
  };

  const handleValidate = () => {
    const problem = validateCredentials(provider, values());
    setValidationError(problem);
    if (!problem) setStep(2);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.post(`/${provider}/accounts`, buildPayload(provider, values()));
      setStep(3);
    } catch (err) {
      const data = (err as { response?: { data?: { error?: string; message?: string } } }).response?.data;
      // Same fallback chain as the reference wizard.
      setSubmitError(data?.error || data?.message || 'Connection failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const back = () => {
    setValidationError(null);
    setSubmitError(null);
    setStep((s) => Math.max(0, s - 1));
  };

  return (
    <Modal
      title={`Connect ${provider === 'azure' ? 'an Azure' : 'an AWS'} account`}
      open={open}
      onCancel={handleClose}
      footer={null}
      destroyOnHidden
    >
      <Steps
        current={step}
        size="small"
        items={[
          { title: 'Connection details' },
          { title: 'Validate details' },
          { title: 'Save' },
          { title: 'Result' },
        ]}
        style={{ marginBottom: 24 }}
      />

      {/* The form stays mounted across every step (rather than being conditionally
          rendered only for step 0) so its field values survive the later steps
          instead of being dropped when their Form.Item fields unmount. */}
      <Form form={form} layout="vertical" style={{ display: step === 0 ? 'block' : 'none' }}>
        <Form.Item name="name" label="Account name" rules={[{ required: true, message: 'Account name is required.' }]}>
          <Input />
        </Form.Item>
        {provider === 'azure' ? (
          <>
            <Form.Item
              name="subscriptionId"
              label="Subscription ID"
              rules={[{ required: true, message: 'Subscription ID is required.' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item name="tenantId" label="Tenant ID" rules={[{ required: true, message: 'Tenant ID is required.' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="clientId" label="Client ID" rules={[{ required: true, message: 'Client ID is required.' }]}>
              <Input />
            </Form.Item>
            <Form.Item
              name="clientSecret"
              label="Client secret"
              rules={[{ required: true, message: 'Client secret is required.' }]}
            >
              <Input.Password />
            </Form.Item>
          </>
        ) : (
          <>
            <Form.Item
              name="accessKeyId"
              label="Access key ID"
              rules={[{ required: true, message: 'Access key ID is required.' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="secretAccessKey"
              label="Secret access key"
              rules={[{ required: true, message: 'Secret access key is required.' }]}
            >
              <Input.Password />
            </Form.Item>
          </>
        )}
        <Button type="primary" onClick={goNext}>
          Next
        </Button>
      </Form>

      {step === 1 && (
        <div>
          {validationError && (
            <Alert type="error" showIcon title={validationError} style={{ marginBottom: 16 }} />
          )}
          <Space>
            <Button onClick={back}>Back</Button>
            <Button type="primary" onClick={handleValidate}>
              Validate details
            </Button>
          </Space>
        </div>
      )}

      {step === 2 && (
        <div>
          <Alert
            type="success"
            showIcon
            title="Details look valid."
            description="Save to add this account to your organization."
            style={{ marginBottom: 16 }}
          />
          {submitError && <Alert type="error" showIcon title={submitError} style={{ marginBottom: 16 }} />}
          <Space>
            <Button onClick={back} disabled={submitting}>
              Back
            </Button>
            <Button type="primary" loading={submitting} onClick={handleSubmit}>
              Save account
            </Button>
          </Space>
        </div>
      )}

      {step === 3 && (
        <Result
          status="success"
          title="Account connected"
          subTitle="It may take a few minutes for the first cost data to appear."
          extra={
            <Button type="primary" onClick={handleClose}>
              Done
            </Button>
          }
        />
      )}
    </Modal>
  );
}
