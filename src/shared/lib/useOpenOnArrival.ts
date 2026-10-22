import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, type Location } from 'react-router-dom';

/** The query parameter that carries an "open this on arrival" request, e.g. `/budgets?open=new`. */
export const OPEN_PARAM = 'open';

/** Builds the URL parts for a link that asks a page to open something on arrival. */
export function openOnArrivalTarget(path: string, token: string, hash = ''): { pathname: string; search: string; hash: string } {
  return { pathname: path, search: `?${OPEN_PARAM}=${encodeURIComponent(token)}`, hash };
}

/** True when the location asks for `token`: `?open=token` or, for pages without hash tabs, `#token`. */
export function requestsOpen(location: Pick<Location, 'search' | 'hash'>, token: string): boolean {
  return new URLSearchParams(location.search).get(OPEN_PARAM) === token || location.hash === `#${token}`;
}

interface Options {
  /** Hold the request until the page is ready (data loaded, permission known). Default true. */
  enabled?: boolean;
  /** Remove the request from the URL once handled so a refresh or Back does not reopen it. Default true. */
  consume?: boolean;
}

/**
 * A thin "open on arrival" hook: when the page is reached through `?open=<token>` (or `#<token>`), call
 * `onOpen` once, e.g. to open a form or dialog, then take the request out of the URL. The command palette
 * and deep links use it to land a user straight in the form they asked for. The callback decides whether
 * opening is allowed (permission, account limit); the request is consumed either way, so it never lingers.
 * A request in the query string does not disturb a hash tab (`/budgets?open=add-channel#integrations`).
 */
export function useOpenOnArrival(token: string, onOpen: () => void, { enabled = true, consume = true }: Options = {}): void {
  const location = useLocation();
  const navigate = useNavigate();
  const onOpenRef = useRef(onOpen);
  useEffect(() => { onOpenRef.current = onOpen; });
  const handledKey = useRef<string | null>(null);
  const requested = requestsOpen(location, token);

  useEffect(() => {
    if (!requested || !enabled || handledKey.current === location.key) return;
    handledKey.current = location.key;
    onOpenRef.current();
    if (!consume) return;
    const params = new URLSearchParams(location.search);
    params.delete(OPEN_PARAM);
    const search = params.toString();
    navigate(
      { pathname: location.pathname, search: search ? `?${search}` : '', hash: location.hash === `#${token}` ? '' : location.hash },
      { replace: true, preventScrollReset: true, state: location.state },
    );
  }, [requested, enabled, consume, token, location, navigate]);
}
