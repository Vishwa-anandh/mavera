import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBreadcrumb } from '../../../shared/ui/AppBreadcrumb';
import { AzureOverallDashboard } from './AzureOverallDashboard';
import { AzureAccountManager } from './AzureAccountManager';
import { MOCK_AZURE_ACCOUNTS } from '../../../demo/azure/mockAzureData';
import type { AzureAccount } from '../model/azureTypes';

type AzureView = 'dashboard' | 'accounts';

/**
 * Entry point for the Azure module, ported from the reference CCM app's
 * AzureRoot.jsx: a local view switch (dashboard ⇄ account manager) rather
 * than nested routes — the reference app's own choice for this module, kept
 * here rather than "fixed" to routes for its own sake. Selecting an account
 * from either view lands on the Cost Overview page (§CLOUD-01), which
 * already has real KPI cards from the actual dashboard data.
 */
export function AzureRoot() {
  const [view, setView] = useState<AzureView>('dashboard');
  const navigate = useNavigate();

  if (view === 'accounts') {
    return (
      <div>
        <AppBreadcrumb items={[{ label: 'Cloud Cost', path: '/cloud/overview' }, { label: 'Azure' }, { label: 'Account Manager' }]} />
        <AzureAccountManager
          onBack={() => setView('dashboard')}
          onSelectAccount={(account: AzureAccount) => navigate(`/azure/${account.id}`)}
        />
      </div>
    );
  }

  return (
    <div>
      <AppBreadcrumb items={[{ label: 'Cloud Cost', path: '/cloud/overview' }, { label: 'Azure' }]} />
      <AzureOverallDashboard
        onManageAccounts={() => setView('accounts')}
        onSelectAccount={(accountId) => {
          const found = MOCK_AZURE_ACCOUNTS.find((a) => a.id === accountId);
          navigate(`/azure/${found?.id ?? accountId}`);
        }}
      />
    </div>
  );
}
