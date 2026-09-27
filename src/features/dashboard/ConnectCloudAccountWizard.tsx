import { useState } from 'react';
import { Alert, Button, Form, Input, Modal, Result, Steps } from 'antd';
import { api } from '../../api';
import type { CloudProvider } from '../../types/auth';

interface ConnectCloudAccountWizardProps {
  provider: Extract<CloudProvider, 'azure' | 'aws'>;
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

export function ConnectCloudAccountWizard({ provider, open, onClose }: ConnectCloudAccountWizardProps) {
  const [form] = Form.useForm<ConnectionFormValues>();
  const [step, setStep] = useState(0);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'failure' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const reset = () => {
    form.resetFields();
    setStep(0);
    setTestResult(null);
    setSubmitError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleTestConnection = async () => {
    await form.validateFields();
    setTesting(true);
    setTestResult(null);
    try {
      await api.post(`/${provider}/accounts/test`, form.getFieldsValue());
      setTestResult('success');
      setStep(2);
    } catch {
      setTestResult('failure');
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.post(`/${provider}/accounts`, form.getFieldsValue());
      setStep(3);
    } catch {
      setSubmitError('Could not save this account. Please try again.');
    } finally {
      setSubmitting(false);
    }
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
          { title: 'Test connection' },
          { title: 'Review' },
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
            <Form.Item name="subscriptionId" label="Subscription ID" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="tenantId" label="Tenant ID" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="clientId" label="Client ID" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="clientSecret" label="Client secret" rules={[{ required: true }]}>
              <Input.Password />
            </Form.Item>
          </>
        ) : (
          <>
            <Form.Item name="accessKeyId" label="Access key ID" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="secretAccessKey" label="Secret access key" rules={[{ required: true }]}>
              <Input.Password />
            </Form.Item>
          </>
        )}
        <Button type="primary" onClick={() => setStep(1)}>
          Next
        </Button>
      </Form>

      {step === 1 && (
        <div>
          {testResult === 'failure' && (
            <Alert type="error" showIcon title="Connection could not be verified." style={{ marginBottom: 16 }} />
          )}
          <Button type="primary" loading={testing} onClick={handleTestConnection}>
            Test connection
          </Button>
        </div>
      )}

      {step === 2 && (
        <div>
          <Alert type="success" showIcon title="Connection verified." style={{ marginBottom: 16 }} />
          {submitError && <Alert type="error" showIcon title={submitError} style={{ marginBottom: 16 }} />}
          <Button type="primary" loading={submitting} onClick={handleSubmit}>
            Save account
          </Button>
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
