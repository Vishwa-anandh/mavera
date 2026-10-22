/* Public API of the workspace feature: live views of the organisation's connected accounts, and the shared "nothing connected yet" pieces. */
export { NothingConnected } from './components/NothingConnected';
export { SampleDataBadge } from './components/SampleDataBadge';
export { CONNECT_TARGETS, firstConnectTarget } from './model/connectTargets';
export type { ConnectTargetKey } from './model/connectTargets';
export { useConnectedAccountCount, useConnectedProviders, useHasSampleAccounts, useOnboarding, useWorkspaceAccounts, useWorkspaceVersion } from './model/useWorkspace';
export { useCloudEmpty, useConnectionStatus } from './model/useConnectionStatus';
export type { ConnectionStatus } from './model/useConnectionStatus';
export { addAccountFromWizard } from './model/addAccountFromWizard';
export type { WizardPayload } from './model/addAccountFromWizard';
