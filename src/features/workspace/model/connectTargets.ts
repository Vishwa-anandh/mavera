/**
 * Where "connect" goes today: the provider's account manager (or System Configuration for SAP) with the connect
 * form already open, through the `?open=connect` arrival request every one of those pages understands (see
 * shared/lib/useOpenOnArrival). A shared connect dialog replaces these later; every empty state links through
 * this one table, so only it changes.
 */
const CONNECT_REQUEST = '?open=connect';

export const CONNECT_TARGETS = {
  azure: { label: 'Connect Azure', path: `/azure${CONNECT_REQUEST}` },
  aws: { label: 'Connect AWS', path: `/aws/accounts${CONNECT_REQUEST}` },
  gcp: { label: 'Connect Google Cloud', path: `/gcp/accounts${CONNECT_REQUEST}` },
  btp: { label: 'Connect SAP BTP', path: `/btp/accounts${CONNECT_REQUEST}` },
  /** The first cloud account of an organisation: Azure is the default provider. */
  cloud: { label: 'Connect your first account', path: `/azure${CONNECT_REQUEST}` },
  sap: { label: 'Connect an SAP system', path: `/sap/configuration${CONNECT_REQUEST}` },
} as const;

export type ConnectTargetKey = keyof typeof CONNECT_TARGETS;

/** The one next step for an organisation with nothing connected, given the modules it subscribes to. */
export function firstConnectTarget(modules: { cloudCost: boolean; sapMonitoring: boolean }): (typeof CONNECT_TARGETS)[ConnectTargetKey] {
  return modules.cloudCost ? CONNECT_TARGETS.cloud : CONNECT_TARGETS.sap;
}
