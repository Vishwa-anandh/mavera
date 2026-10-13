import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConnectCloudAccountWizard, validateCredentials } from './ConnectCloudAccountWizard';
import { api } from '../../../data-access';

vi.mock('../../../data-access/rest/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../data-access/rest/client')>();
  return { ...actual, api: { ...actual.api, post: vi.fn() } };
});

const SUB_ID = '11111111-2222-3333-4444-555555555555';
const TENANT_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const CLIENT_ID = '99999999-8888-7777-6666-555555555555';
const AWS_KEY = 'AKIAIOSFODNN7EXAMPLE';
const AWS_SECRET = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';

// Reference behaviour (pages/HomePage.jsx GetStartedWizard, azure/aws
// AccountManager.jsx): format checks on the client, then a single POST to
// /{provider}/accounts. There is no test-connection endpoint.
describe('validateCredentials', () => {
  it('requires UUIDs for the Azure tenant, client and subscription IDs', () => {
    const valid = { name: 'x', tenantId: TENANT_ID, clientId: CLIENT_ID, subscriptionId: SUB_ID };
    expect(validateCredentials('azure', valid)).toBeNull();
    expect(validateCredentials('azure', { ...valid, tenantId: 'tenant-1' })).toBe(
      'Invalid Tenant ID format. Must be a valid UUID.',
    );
    expect(validateCredentials('azure', { ...valid, clientId: 'nope' })).toBe(
      'Invalid Client ID format. Must be a valid UUID.',
    );
    expect(validateCredentials('azure', { ...valid, subscriptionId: 'sub-1' })).toBe(
      'Invalid Subscription ID format. Must be a valid UUID.',
    );
  });

  it('requires an AKIA/ASIA 20-char access key and a 40+ char secret for AWS', () => {
    expect(validateCredentials('aws', { name: 'x', accessKeyId: AWS_KEY, secretAccessKey: AWS_SECRET })).toBeNull();
    expect(validateCredentials('aws', { name: 'x', accessKeyId: 'ASIAIOSFODNN7EXAMPLE', secretAccessKey: AWS_SECRET })).toBeNull();
    expect(validateCredentials('aws', { name: 'x', accessKeyId: 'AKIAEXAMPLE', secretAccessKey: AWS_SECRET })).toBe(
      'Invalid Access Key ID. Should start with AKIA or ASIA and be 20 chars.',
    );
    expect(validateCredentials('aws', { name: 'x', accessKeyId: AWS_KEY, secretAccessKey: 'short' })).toBe(
      'Invalid Secret Access Key. Should be at least 40 characters.',
    );
  });
});

describe('ConnectCloudAccountWizard', () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset();
  });

  it('walks details -> validate -> save -> result for Azure, POSTing once to /azure/accounts', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} });
    const user = userEvent.setup({ delay: null });

    render(<ConnectCloudAccountWizard provider="azure" open onClose={vi.fn()} />);

    await user.type(screen.getByLabelText('Account name'), 'Prod subscription');
    await user.type(screen.getByLabelText('Subscription ID'), SUB_ID);
    await user.type(screen.getByLabelText('Tenant ID'), TENANT_ID);
    await user.type(screen.getByLabelText('Client ID'), CLIENT_ID);
    await user.type(screen.getByLabelText('Client secret'), 'secret-1');
    await user.click(screen.getByRole('button', { name: 'Next' }));

    await user.click(screen.getByRole('button', { name: 'Validate details' }));
    expect(await screen.findByText('Details look valid.')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Save account' }));
    expect(await screen.findByText('Account connected')).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/azure/accounts', {
      name: 'Prod subscription',
      subscriptionId: SUB_ID,
      tenantId: TENANT_ID,
      clientId: CLIENT_ID,
      clientSecret: 'secret-1',
    });
  }, 30000);

  it('POSTs AWS credentials as {name, accessKey, secretKey}', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} });
    const user = userEvent.setup({ delay: null });

    render(<ConnectCloudAccountWizard provider="aws" open onClose={vi.fn()} />);

    await user.type(screen.getByLabelText('Account name'), 'My AWS account');
    await user.type(screen.getByLabelText('Access key ID'), AWS_KEY);
    await user.type(screen.getByLabelText('Secret access key'), AWS_SECRET);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Validate details' }));
    await user.click(await screen.findByRole('button', { name: 'Save account' }));

    expect(await screen.findByText('Account connected')).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/aws/accounts', {
      name: 'My AWS account',
      accessKey: AWS_KEY,
      secretKey: AWS_SECRET,
    });
  }, 30000);

  it('shows the format error and does not advance when validation fails; Back returns to the details', async () => {
    const user = userEvent.setup({ delay: null });

    render(<ConnectCloudAccountWizard provider="aws" open onClose={vi.fn()} />);

    await user.type(screen.getByLabelText('Account name'), 'My AWS account');
    await user.type(screen.getByLabelText('Access key ID'), 'AKIAEXAMPLE');
    await user.type(screen.getByLabelText('Secret access key'), AWS_SECRET);
    await user.click(screen.getByRole('button', { name: 'Next' }));

    await user.click(screen.getByRole('button', { name: 'Validate details' }));
    expect(
      await screen.findByText('Invalid Access Key ID. Should start with AKIA or ASIA and be 20 chars.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save account' })).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByLabelText('Access key ID')).toBeVisible();
    expect(screen.getByLabelText('Access key ID')).toHaveValue('AKIAEXAMPLE');
  }, 30000);

  it('blocks Next with visible field errors when required details are missing', async () => {
    const user = userEvent.setup({ delay: null });

    render(<ConnectCloudAccountWizard provider="azure" open onClose={vi.fn()} />);

    await user.type(screen.getByLabelText('Account name'), 'Prod subscription');
    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('Subscription ID is required.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Validate details' })).not.toBeInTheDocument();
  }, 30000);

  it('shows the backend error text when saving fails', async () => {
    vi.mocked(api.post).mockRejectedValue({ response: { status: 400, data: { error: 'Account limit reached' } } });
    const user = userEvent.setup({ delay: null });

    render(<ConnectCloudAccountWizard provider="aws" open onClose={vi.fn()} />);

    await user.type(screen.getByLabelText('Account name'), 'My AWS account');
    await user.type(screen.getByLabelText('Access key ID'), AWS_KEY);
    await user.type(screen.getByLabelText('Secret access key'), AWS_SECRET);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Validate details' }));
    await user.click(await screen.findByRole('button', { name: 'Save account' }));

    expect(await screen.findByText('Account limit reached')).toBeInTheDocument();
    expect(screen.queryByText('Account connected')).not.toBeInTheDocument();
  }, 30000);
});
