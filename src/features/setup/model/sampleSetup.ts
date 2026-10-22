import { sapAdminRepository, workspaceRepository } from '../../../data-access';
import { CONNECT_PROVIDER_ORDER, CONNECT_PROVIDERS, connectAccount, sampleCredentials, type ConnectProvider, type ConnectedAccount } from '../../workspace';
import type { SetupModules } from './setupSteps';

/** Providers that have nothing connected yet and belong to a module the organisation subscribes to. */
export function providersLeftToConnect(modules: SetupModules): ConnectProvider[] {
  return CONNECT_PROVIDER_ORDER.filter((provider) => {
    if (!modules[CONNECT_PROVIDERS[provider].module]) return false;
    return provider === 'sap' ? sapAdminRepository.destinations.count() === 0 : workspaceRepository.listAccounts(provider).length === 0;
  });
}

/** The sample connections for "Set up everything with sample data": one of each provider still missing, on sample credentials. */
export function connectSampleEverything(modules: SetupModules): ConnectedAccount[] {
  return providersLeftToConnect(modules).map((provider) => {
    const taken = provider === 'sap' ? sapAdminRepository.destinations.list().map((d) => d.name) : workspaceRepository.listAccounts(provider).map((a) => a.name);
    return connectAccount(provider, sampleCredentials(provider, taken));
  });
}
