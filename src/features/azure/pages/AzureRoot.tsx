import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOpenOnArrival } from '../../../shared/lib/useOpenOnArrival';
import { AzureOverallDashboard } from './AzureOverallDashboard';
import { AzureAccountManager } from './AzureAccountManager';
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
  // A "connect" request opens the account manager; the manager then opens the form (and clears the request).
  useOpenOnArrival('connect', () => setView('accounts'), { consume: false });

  if (view === 'accounts') {
    return (
      <div>
        <AzureAccountManager
          onBack={() => setView('dashboard')}
          onSelectAccount={(account: AzureAccount) => navigate(`/azure/${account.id}`)}
        />
      </div>
    );
  }

  return (
    <div>
      <AzureOverallDashboard
        onManageAccounts={() => setView('accounts')}
        onSelectAccount={(accountId) => navigate(`/azure/${accountId}`)}
      />
    </div>
  );
}
