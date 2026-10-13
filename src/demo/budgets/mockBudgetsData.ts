import { MOCK_AZURE_ACCOUNTS } from '../azure/mockAzureData';
import { MOCK_AWS_ACCOUNTS } from '../aws/mockAwsData';
import { MOCK_BTP_ACCOUNTS } from '../btp/mockBtpData';
import { MOCK_GCP_ACCOUNTS } from '../gcp/mockGcpData';
import type { AlertIntegration, Budget, CloudAccountOption } from '../../features/budgets';

/** Flattens every connected cloud account across all 4 providers into one
 * list, mirroring the reference's own inline `Promise.all` + map in
 * BudgetsPage.jsx's `loadData()`. */
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

export const MOCK_INTEGRATIONS: AlertIntegration[] = [
  { id: 'integration-1', provider: 'email', webhook_url: '', email_addresses: 'finance@maitsys.com,ops@maitsys.com', alert_scope: 'global', budget_id: '' },
  { id: 'integration-2', provider: 'teams', webhook_url: 'https://maitsys.webhook.office.com/webhookb2/...', email_addresses: '', alert_scope: 'budget_specific', budget_id: 'budget-2' },
];
