import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConnectCloudAccountWizard } from './ConnectCloudAccountWizard';
import { api } from '../../api';

vi.mock('../../api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api')>();
  return { ...actual, api: { ...actual.api, post: vi.fn() } };
});

describe('ConnectCloudAccountWizard', () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset();
  });

  it('walks through details -> test -> save -> result for an Azure account', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} });
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<ConnectCloudAccountWizard provider="azure" open onClose={onClose} />);

    await user.type(screen.getByLabelText('Account name'), 'Prod subscription');
    await user.type(screen.getByLabelText('Subscription ID'), 'sub-1');
    await user.type(screen.getByLabelText('Tenant ID'), 'tenant-1');
    await user.type(screen.getByLabelText('Client ID'), 'client-1');
    await user.type(screen.getByLabelText('Client secret'), 'secret-1');
    await user.click(screen.getByRole('button', { name: 'Next' }));

    await user.click(screen.getByRole('button', { name: 'Test connection' }));
    expect(await screen.findByText('Connection verified.')).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith(
      '/azure/accounts/test',
      expect.objectContaining({ name: 'Prod subscription' }),
    );

    await user.click(screen.getByRole('button', { name: 'Save account' }));
    expect(await screen.findByText('Account connected')).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/azure/accounts', expect.objectContaining({ name: 'Prod subscription' }));
  }, 15000);

  it('shows a failure message when the connection test fails, without advancing the step', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('bad credentials'));
    const user = userEvent.setup();

    render(<ConnectCloudAccountWizard provider="aws" open onClose={vi.fn()} />);

    await user.type(screen.getByLabelText('Account name'), 'My AWS account');
    await user.type(screen.getByLabelText('Access key ID'), 'AKIAEXAMPLE');
    await user.type(screen.getByLabelText('Secret access key'), 'secret-key-value');
    await user.click(screen.getByRole('button', { name: 'Next' }));

    await user.click(screen.getByRole('button', { name: 'Test connection' }));
    expect(await screen.findByText('Connection could not be verified.')).toBeInTheDocument();
    expect(screen.queryByText('Save account')).not.toBeInTheDocument();
  }, 15000);
});
