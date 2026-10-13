import { Route, Routes } from 'react-router-dom';
import { AwsAccountProvider } from '../model/AwsAccountContext';
import { AwsOverallDashboard } from './AwsOverallDashboard';
import { AwsAccountManager } from './AwsAccountManager';
import { AwsCostPage } from './AwsCostPage';

/**
 * Entry point for the AWS module, ported from the reference CCM app's
 * AwsRoot.jsx: real nested routes under /aws/* (not a view-state switcher
 * like Azure's) — `/`, `/accounts`, `/account/:accountId` — wrapped in an
 * account-list Context so a rename/add/delete survives navigating between
 * them (see AwsAccountContext.tsx's doc comment for why that matters here
 * specifically).
 */
export function AwsRoot() {
  return (
    <AwsAccountProvider>
      <Routes>
        <Route path="/" element={<AwsOverallDashboard />} />
        <Route path="accounts" element={<AwsAccountManager />} />
        <Route path="account/:accountId" element={<AwsCostPage />} />
      </Routes>
    </AwsAccountProvider>
  );
}
