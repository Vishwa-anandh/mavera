import { useCallback, useEffect, useRef, useState } from 'react';

/** 125 -> "2:05". */
export function formatCountdown(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

/** 1685 -> "28 minutes 5 seconds", for the accessible name of the visible mm:ss. */
export function spokenCountdown(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  const part = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`;
  return [m > 0 ? part(m, 'minute') : '', s > 0 || m === 0 ? part(s, 'second') : ''].filter(Boolean).join(' ');
}

/**
 * Counts down once a second from `initialSec` with one interval, cleared on unmount.
 * `restart()` (Refresh) starts the countdown over from `intervalSec`; reaching zero calls `onElapsed`
 * (the simulated background sync) and starts it over the same way.
 */
export function useSyncCountdown(initialSec: number, intervalSec: number, onElapsed?: () => void) {
  const [remaining, setRemaining] = useState(initialSec);
  const remainingRef = useRef(initialSec);
  const [epoch, setEpoch] = useState(0);
  const onElapsedRef = useRef(onElapsed);
  useEffect(() => { onElapsedRef.current = onElapsed; }, [onElapsed]);

  useEffect(() => {
    const id = window.setInterval(() => {
      remainingRef.current -= 1;
      if (remainingRef.current <= 0) {
        remainingRef.current = intervalSec;
        setRemaining(intervalSec);
        onElapsedRef.current?.();
        return;
      }
      setRemaining(remainingRef.current);
    }, 1000);
    return () => window.clearInterval(id);
  }, [intervalSec, epoch]);

  const restart = useCallback(() => {
    remainingRef.current = intervalSec;
    setRemaining(intervalSec);
    setEpoch((e) => e + 1);
  }, [intervalSec]);

  return { remaining, restart };
}

/** 24-hour wall-clock time, "15:50:33", the way the monitoring pages show "Last fetched". */
export function clockTime(date: Date = new Date()): string {
  return date.toLocaleTimeString('en-GB', { hour12: false });
}
