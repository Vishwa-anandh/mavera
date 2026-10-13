export interface IdocFailure {
  id: string;
  messageType: string;
  partner: string;
  status: string;
  failedAt: string;
}

/**
 * IDoc Monitoring has no backend contract yet (MAVERA_DESIGN_SYSTEM.md
 * §18.3). This static data exists only to make the module's layout
 * demonstrable; none of it is live integration data.
 */
export const MOCK_IDOC_STATUS = {
  successful: 11980,
  failed: 470,
  inProcess: 0,
  waiting: 0,
};

export const MOCK_IDOC_FAILURES: IdocFailure[] = [
  { id: '0000000001234567', messageType: 'ORDERS05', partner: 'VENDOR-01', status: 'Status 51 — Application error', failedAt: '6 minutes ago' },
  { id: '0000000001234571', messageType: 'INVOIC02', partner: 'VENDOR-04', status: 'Status 26 — Error during syntax check', failedAt: '22 minutes ago' },
  { id: '0000000001234589', messageType: 'DESADV01', partner: 'CARRIER-02', status: 'Status 51 — Application error', failedAt: '41 minutes ago' },
];

export function idocSuccessRate(status: typeof MOCK_IDOC_STATUS): number {
  const total = status.successful + status.failed + status.inProcess + status.waiting;
  return total === 0 ? 0 : Math.round((status.successful / total) * 1000) / 10;
}
