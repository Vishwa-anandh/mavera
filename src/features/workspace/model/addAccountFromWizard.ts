import { workspaceRepository, type AwsAccountRecord, type AzureAccountRecord } from '../../../data-access';

/** The values the shared Azure/AWS connect wizard hands over on save. */
export type WizardPayload = Record<string, string | undefined>;

/**
 * Connects the account a connect wizard collected: the account joins the organisation's workspace, and (there
 * being no live feed in this prototype) shows the provider's sample cost data under its own name. One place for
 * the mapping, so every screen that opens the wizard adds accounts the same way.
 */
export function addAccountFromWizard(provider: 'azure', payload: WizardPayload): AzureAccountRecord;
export function addAccountFromWizard(provider: 'aws', payload: WizardPayload): AwsAccountRecord;
export function addAccountFromWizard(provider: 'azure' | 'aws', payload: WizardPayload): AzureAccountRecord | AwsAccountRecord;
export function addAccountFromWizard(provider: 'azure' | 'aws', payload: WizardPayload): AzureAccountRecord | AwsAccountRecord {
  if (provider === 'azure') {
    return workspaceRepository.addConnectedAccount('azure', {
      name: payload.name ?? 'New subscription',
      subscriptionId: payload.subscriptionId ?? '',
      tenantId: payload.tenantId ?? '',
      clientId: payload.clientId ?? '',
    });
  }
  return workspaceRepository.addConnectedAccount('aws', { name: payload.name ?? 'New account', region: 'us-east-1', accessKey: payload.accessKey ?? '' });
}
