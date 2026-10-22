import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { closeConnectDialog, useConnectDialogRequest } from '../model/connectDialogStore';
import { ConnectAccountDialog } from './ConnectAccountDialog';

/**
 * Shows the shared connect dialog whenever something calls `openConnectDialog()`. Mounted once, inside the router,
 * in the signed-in app shell, so an empty state, the command palette, a dashboard card or a deep link can open it
 * without owning any dialog state.
 */
export function ConnectDialogHost() {
  const request = useConnectDialogRequest();
  const { pathname } = useLocation();
  // The page the dialog was opened on: going somewhere else (menu, back button, a link) closes it instead of
  // leaving it floating over an unrelated page. A request made on arrival is recorded against the new page.
  const openedOn = useRef(pathname);
  if (!request) openedOn.current = pathname;
  useEffect(() => {
    if (request && pathname !== openedOn.current) closeConnectDialog();
  }, [request, pathname]);
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
