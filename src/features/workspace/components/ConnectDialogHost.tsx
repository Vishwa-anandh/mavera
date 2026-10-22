import { useEffect } from 'react';
import { closeConnectDialog, useConnectDialogRequest } from '../model/connectDialogStore';
import { ConnectAccountDialog } from './ConnectAccountDialog';

/**
 * Shows the shared connect dialog whenever something calls `openConnectDialog()`. Mounted once, inside the router,
 * in the signed-in app shell, so an empty state, the command palette, a dashboard card or a deep link can open it
 * without owning any dialog state.
 */
export function ConnectDialogHost() {
  const request = useConnectDialogRequest();
  // Leaving the signed-in app (sign-out) must not leave a request behind to reopen on the next sign-in.
  useEffect(() => closeConnectDialog, []);
  if (!request) return null;
  return (
    <ConnectAccountDialog
      // A new request (a different provider, the picker) starts a fresh form.
      key={`${request.provider ?? 'pick'}`}
      provider={request.provider}
      open
      stay={request.stay}
      canSwitch={request.canSwitch}
      onConnected={request.onConnected}
      onClose={closeConnectDialog}
    />
  );
}
