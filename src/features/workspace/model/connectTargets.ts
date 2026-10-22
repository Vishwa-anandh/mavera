import { openConnectDialog } from './connectDialogStore';
import type { ConnectProvider } from './connectProviders';

/**
 * Where "connect" goes: the shared connect dialog, opened in place on the provider's credentials. `path` is the
 * same request as a deep link (the provider's page with `?open=connect`, which each page turns into the same
 * dialog), for links that cannot call `openConnectDialog` themselves.
 */
const CONNECT_REQUEST = '?open=connect';

export const CONNECT_TARGETS = {
  azure: { label: 'Connect Azure', path: `/azure${CONNECT_REQUEST}`, provider: 'azure' },
  aws: { label: 'Connect AWS', path: `/aws/accounts${CONNECT_REQUEST}`, provider: 'aws' },
  gcp: { label: 'Connect Google Cloud', path: `/gcp/accounts${CONNECT_REQUEST}`, provider: 'gcp' },
  btp: { label: 'Connect SAP BTP', path: `/btp/accounts${CONNECT_REQUEST}`, provider: 'btp' },
  /** The first cloud account of an organisation: it opens on Azure, the default provider, and offers the others from the dialog. */
  cloud: { label: 'Connect your first account', path: `/azure${CONNECT_REQUEST}`, provider: 'azure', canSwitch: true },
  sap: { label: 'Connect an SAP system', path: `/sap/configuration${CONNECT_REQUEST}`, provider: 'sap' },
} as const satisfies Record<string, { label: string; path: string; provider: ConnectProvider; canSwitch?: boolean }>;

export type ConnectTargetKey = keyof typeof CONNECT_TARGETS;

/** Opens the connect dialog for a target, in place: no page change, one click from any empty state. */
export function openConnectTarget(key: ConnectTargetKey): void {
  const target: { provider: ConnectProvider; canSwitch?: boolean } = CONNECT_TARGETS[key];
  openConnectDialog(target.provider, { canSwitch: target.canSwitch });
}

/** The one next step for an organisation with nothing connected, given the modules it subscribes to. */
export function firstConnectTarget(modules: { cloudCost: boolean; sapMonitoring: boolean }): (typeof CONNECT_TARGETS)[ConnectTargetKey] {
  return modules.cloudCost ? CONNECT_TARGETS.cloud : CONNECT_TARGETS.sap;
}
