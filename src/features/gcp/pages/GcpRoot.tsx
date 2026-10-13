import { Route, Routes } from 'react-router-dom';
import { GcpAccountProvider } from '../model/GcpAccountContext';
import { GcpOverallDashboard } from './GcpOverallDashboard';
import { GcpAccountManager } from './GcpAccountManager';
import { GcpCostPage } from './GcpCostPage';

/**
 * Entry point for the GCP module, ported from the reference CCM app's
 * GcpRoot.jsx: real nested routes under /gcp/* (same pattern as AWS's
 * AwsRoot.tsx), wrapped in an account-list Context so state survives
 * navigating between the overview/account-manager/cost-page routes.
 */
export function GcpRoot() {
  return (
    <GcpAccountProvider>
      <Routes>
        <Route path="/" element={<GcpOverallDashboard />} />
        <Route path="accounts" element={<GcpAccountManager />} />
        <Route path="account/:accountId" element={<GcpCostPage />} />
      </Routes>
    </GcpAccountProvider>
  );
}
