import { Route, Routes } from 'react-router-dom';
import { BtpAccountProvider } from '../model/BtpAccountContext';
import { BtpOverallDashboard } from './BtpOverallDashboard';
import { BtpAccountManager } from './BtpAccountManager';
import { BtpCostPage } from './BtpCostPage';
import { BtpServiceInstancesPage } from './BtpServiceInstancesPage';

/**
 * Entry point for the BTP module, ported from the reference CCM app's
 * BtpRoot.jsx: real nested routes under /btp/* (same pattern as AWS/GCP),
 * with one extra depth level unique to BTP — a subaccount's
 * service-instances page.
 */
export function BtpRoot() {
  return (
    <BtpAccountProvider>
      <Routes>
        <Route path="/" element={<BtpOverallDashboard />} />
        <Route path="accounts" element={<BtpAccountManager />} />
        <Route path="account/:accountId" element={<BtpCostPage />} />
        <Route path="account/:accountId/subaccount/:subaccountId/service-instances" element={<BtpServiceInstancesPage />} />
      </Routes>
    </BtpAccountProvider>
  );
}
