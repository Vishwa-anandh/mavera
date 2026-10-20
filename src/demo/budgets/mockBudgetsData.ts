import { MOCK_AZURE_ACCOUNTS } from '../azure/mockAzureData';
import { MOCK_AWS_ACCOUNTS } from '../aws/mockAwsData';
import { MOCK_BTP_ACCOUNTS } from '../btp/mockBtpData';
import { MOCK_GCP_ACCOUNTS } from '../gcp/mockGcpData';
import type { AlertChannel, Budget, CloudAccountOption } from '../../data-access';

/** Flattens every connected cloud account across all 4 providers into one list for the budget-scope picker. */
export function allCloudAccountOptions(): CloudAccountOption[] {
  return [
    ...MOCK_AZURE_ACCOUNTS.map((a) => ({ id: a.id, name: `Azure - ${a.name}`, provider: 'azure' as const })),
    ...MOCK_AWS_ACCOUNTS.map((a) => ({ id: a.id, name: `AWS - ${a.name}`, provider: 'aws' as const })),
    ...MOCK_BTP_ACCOUNTS.map((a) => ({ id: a.id, name: `SAP BTP - ${a.name}`, provider: 'btp' as const })),
    ...MOCK_GCP_ACCOUNTS.map((a) => ({ id: a.id, name: `GCP - ${a.name}`, provider: 'gcp' as const })),
  ];
}

export const MOCK_BUDGETS: Budget[] = [
  { id: 'budget-1', name: 'Org-Wide Monthly Cap', target_amount: 25000, alert_threshold: 80, scope_type: 'organization', scope_value: '' },
  { id: 'budget-2', name: 'Azure Production', target_amount: 18000, alert_threshold: 90, scope_type: 'account', scope_value: MOCK_AZURE_ACCOUNTS[0].id },
  { id: 'budget-3', name: 'AWS Q3 Engineering', target_amount: 12000, alert_threshold: 75, scope_type: 'account', scope_value: MOCK_AWS_ACCOUNTS[0].id },
];

export const MOCK_CHANNELS: AlertChannel[] = [
  { id: 'channel-1', provider: 'email', enabled: true, alert_scope: 'global', budget_ids: [], email_addresses: ['finance@maitsys.com', 'ops@maitsys.com'], webhook_url: '', created_at: '2026-08-04T09:12:00Z' },
  { id: 'channel-2', provider: 'teams', enabled: true, alert_scope: 'budget_specific', budget_ids: ['budget-2'], email_addresses: [], webhook_url: 'https://maitsys.webhook.office.com/webhookb2/6c1f0a7e-9d2b-4e53-8f10-2a7b3c9d1e44@maitsys/IncomingWebhook/azure-prod', created_at: '2026-08-19T14:30:00Z' },
  { id: 'channel-3', provider: 'email', enabled: false, alert_scope: 'budget_specific', budget_ids: ['budget-3'], email_addresses: ['aws-owners@maitsys.com'], webhook_url: '', created_at: '2026-09-02T08:05:00Z' },
];
