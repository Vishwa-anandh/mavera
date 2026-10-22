import { isEmptyWorkspace, sapRepository } from '../../../data-access';
import { useAuth } from '../../auth';
import { CONNECT_TARGETS, firstConnectTarget } from './connectTargets';
import { useConnectedAccountCount } from './useWorkspace';

export interface ConnectionStatus {
  /** A subscribed Cloud Cost module that has no cloud account connected yet. */
  cloudEmpty: boolean;
  /** A subscribed SAP Monitoring module that has no SAP system connected yet. */
  sapEmpty: boolean;
  /** Nothing is connected in any module the organisation subscribes to: the whole product is waiting for a first connection. */
  nothingConnected: boolean;
  /** The one next step: connect the first account of the organisation's first subscribed module. */
  firstStep: (typeof CONNECT_TARGETS)[keyof typeof CONNECT_TARGETS];
}

/**
 * True for a brand-new organisation that has connected no cloud account yet. Needs no sign-in context, so the Cloud
 * Cost pages can use it directly: only a brand-new organisation is ever "not connected yet".
 */
export function useCloudEmpty(): boolean {
  const accounts = useConnectedAccountCount();
  return isEmptyWorkspace() && accounts === 0;
}

/**
 * What the organisation has connected so far, in the modules it subscribes to; drives every "nothing here yet"
 * state. Only a brand-new organisation can be "not connected yet": populated and real organisations always show
 * their data.
 */
export function useConnectionStatus(): ConnectionStatus {
  const { modules } = useAuth();
  const noAccounts = useCloudEmpty();
  const brandNew = isEmptyWorkspace();
  const cloudEmpty = modules.cloudCost && noAccounts;
  const sapEmpty = brandNew && modules.sapMonitoring && !sapRepository.isConnected();
  const cloudHasData = modules.cloudCost && !cloudEmpty;
  const sapHasData = modules.sapMonitoring && !sapEmpty;
  return { cloudEmpty, sapEmpty, nothingConnected: brandNew && !cloudHasData && !sapHasData, firstStep: firstConnectTarget(modules) };
}
