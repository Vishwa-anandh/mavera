import { useCallback, useEffect, useRef, useState } from 'react';

export type TooltipPhase = 'closed' | 'open' | 'closing';

export const TOOLTIP_OPEN_DELAY = 300;
export const TOOLTIP_CLOSE_DELAY = 100;
const EXIT_DURATION = 120;

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** True when focus arrived by keyboard (or the browser cannot tell), so a mouse click does not leave a tooltip stuck open. */
export function isKeyboardFocus(target: EventTarget | null) {
  if (!(target instanceof Element)) return true;
  try {
    return target.matches(':focus-visible');
  } catch {
    return true;
  }
}

/**
 * Timing for one tooltip: open after a delay (or at once), close after a short bridge delay so the
 * pointer can cross the gap, or instantly (Escape, blur, scroll). `closing` keeps the bubble mounted
 * for the exit fade, and is skipped under prefers-reduced-motion.
 */
export function useTooltipPresence() {
  const [phase, setPhaseState] = useState<TooltipPhase>('closed');
  const phaseRef = useRef<TooltipPhase>('closed');
  const timers = useRef<{ open?: number; close?: number; exit?: number }>({});

  const setPhase = useCallback((next: TooltipPhase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  const clear = useCallback((...keys: Array<'open' | 'close' | 'exit'>) => {
    for (const key of keys) {
      window.clearTimeout(timers.current[key]);
      timers.current[key] = undefined;
    }
  }, []);

  const show = useCallback((delay: number) => {
    clear('open', 'close', 'exit');
    if (delay <= 0) setPhase('open');
    else timers.current.open = window.setTimeout(() => setPhase('open'), delay);
  }, [clear, setPhase]);

  const hide = useCallback((delay = TOOLTIP_CLOSE_DELAY) => {
    clear('open', 'close');
    if (phaseRef.current === 'closed') return;
    const run = () => {
      if (prefersReducedMotion()) {
        setPhase('closed');
        return;
      }
      setPhase('closing');
      timers.current.exit = window.setTimeout(() => setPhase('closed'), EXIT_DURATION);
    };
    if (delay <= 0) run();
    else timers.current.close = window.setTimeout(run, delay);
  }, [clear, setPhase]);

  /** Escape, blur, scroll: gone now, with no exit fade. */
  const close = useCallback(() => {
    clear('open', 'close', 'exit');
    if (phaseRef.current !== 'closed') setPhase('closed');
  }, [clear, setPhase]);

  /** The pointer reached the bubble itself: keep it. */
  const keep = useCallback(() => {
    clear('close', 'exit');
    if (phaseRef.current === 'closing') setPhase('open');
  }, [clear, setPhase]);

  useEffect(() => () => clear('open', 'close', 'exit'), [clear]);

  return { phase, show, hide, close, keep };
}
