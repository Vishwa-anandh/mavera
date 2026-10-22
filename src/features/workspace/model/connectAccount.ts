import { sapAdminRepository, workspaceRepository } from '../../../data-access';
import { sapInputOf, type CloudConnectProvider, type ConnectProvider, type ConnectValues, subdomainOf } from './connectProviders';

/** An account the shared connect dialog has just connected, and the page that shows it. */
export interface ConnectedAccount {
  provider: ConnectProvider;
  id: string;
  name: string;
  /** The account's own overview/cost page (an SAP system opens SAP System Monitoring). */
  path: string;
}

/** The page that shows one connected account. */
export function accountPath(provider: ConnectProvider, id: string): string {
  switch (provider) {
    case 'azure': return `/azure/${id}`;
    case 'aws': return `/aws/account/${id}`;
    case 'gcp': return `/gcp/account/${id}`;
    case 'btp': return `/btp/account/${id}`;
    case 'sap': return '/sap/systems';
  }
}

function addCloudAccount(provider: CloudConnectProvider, values: ConnectValues): { id: string; name: string } {
  const name = values.name.trim();
  switch (provider) {
    case 'azure': {
      const { id } = workspaceRepository.addConnectedAccount('azure', { name, subscriptionId: values.subscriptionId.trim(), tenantId: values.tenantId.trim(), clientId: values.clientId.trim() });
      return { id, name };
    }
    case 'aws': {
      const { id } = workspaceRepository.addConnectedAccount('aws', { name, region: 'us-east-1', accessKey: values.accessKeyId.trim() });
      return { id, name };
    }
    case 'gcp': {
      const { id } = workspaceRepository.addConnectedAccount('gcp', { name, projectId: values.projectId.trim() });
      return { id, name };
    }
    case 'btp': {
      const { id } = workspaceRepository.addConnectedAccount('btp', {
        name, targetUrl: values.targetUrl.trim(), region: subdomainOf(values.targetUrl) ?? undefined, hasCis: Boolean(values.cisClientId.trim()),
      });
      return { id, name };
    }
  }
}

/**
 * Connects what a connect form collected. A cloud account joins the organisation's workspace and (there being no
 * live feed in this prototype) shows the provider's sample cost data under its own name; an SAP system becomes a
 * destination that is connected straight away. The one place every screen's connect flow ends.
 */
export function connectAccount(provider: ConnectProvider, values: ConnectValues): ConnectedAccount {
  if (provider === 'sap') {
    const input = sapInputOf(values);
    const destination = sapAdminRepository.destinations.add(input);
    sapAdminRepository.destinations.setConnected(destination.id, true);
    return { provider, id: destination.id, name: destination.name, path: accountPath(provider, destination.id) };
  }
  const { id, name } = addCloudAccount(provider, values);
  return { provider, id, name, path: accountPath(provider, id) };
}
