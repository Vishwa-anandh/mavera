import { useEffect, useRef } from 'react';
import { ClockIcon } from '../../../shared/ui/icons';
import { formatCountdown, spokenCountdown, useSyncCountdown } from '../model/useSyncCountdown';

interface SyncStatusProps {
  /** Wall-clock time of the last fetch, as shown. */
  lastFetched: string;
  /** Seconds until the first sync. */
  initialSec: number;
  /** Seconds between syncs; also where the countdown restarts after Refresh. */
  intervalSec: number;
  /** Bump to restart the countdown (the page does this when Refresh is pressed). */
  restartToken: number;
  /** Called when the countdown reaches zero (the simulated background sync). */
  onAutoSync: () => void;
}

/**
 * "Last fetched" and "Next sync mm:ss" for a monitoring page. The countdown lives here, with its own
 * single interval, so the page behind it re-renders only when a sync happens, not every second. The
 * mm:ss is a `timer` (never announced as it ticks); a polite status line announces each fetch.
 */
export function SyncStatus({ lastFetched, initialSec, intervalSec, restartToken, onAutoSync }: SyncStatusProps) {
  const { remaining, restart } = useSyncCountdown(initialSec, intervalSec, onAutoSync);
  const seenToken = useRef(restartToken);
  useEffect(() => {
    if (seenToken.current === restartToken) return;
    seenToken.current = restartToken;
    restart();
  }, [restartToken, restart]);

  return (
    <>
      <span className="mv-muted">
        <ClockIcon size={12} style={{ verticalAlign: -1, marginRight: '0.1875rem' }} />
        Last fetched <strong className="mv-sync-value">{lastFetched}</strong>
      </span>
      <span className="mv-muted">
        Next sync{' '}
        <strong className="mv-sync-value mv-sync-countdown" role="timer" aria-label={`Next sync in ${spokenCountdown(remaining)}`}>{formatCountdown(remaining)}</strong>
      </span>
      <span className="mv-sr-only" role="status" aria-live="polite">Data fetched at {lastFetched}.</span>
    </>
  );
}
