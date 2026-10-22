import { useEffect, useRef, useState } from 'react';
import { workspaceRepository } from '../../../data-access';
import { isStepDone, waitsForClick, waitsOf, type CoachContext } from './coachWaits';
import type { ConnectProviderKey, TourStep } from './flowGuides';
import { resolveTourTarget } from './tourTargets';

/** How often the coach looks at the page and the stores to see whether the person has done the step. */
export const COACH_POLL_MS = 200;
/** After this long on one step the card offers to skip it. */
export const COACH_STALL_MS = 30000;

interface CoachRunnerOptions {
  /** Off for an ordinary page tour. */
  enabled: boolean;
  step: TourStep;
  /** Moves to the next step (or finishes after the last). */
  advance: () => void;
  pathname?: string;
  onNavigate?: (to: string) => void;
  onOpenConnect?: (provider: ConnectProviderKey) => void;
}

/**
 * Drives one live coach step: runs its `enter` (go to a page, open a form), then watches for what the step
 * waits for and calls `advance` as soon as it is met, whether that is an element appearing, a field being
 * filled, a click on the step's target or a watched count changing. A step can be left as it is: the card
 * offers Skip at once and says so more firmly once the step has been waiting a while (`stalled`).
 */
export function useCoachRunner({ enabled, step, advance, pathname = '', onNavigate, onOpenConnect }: CoachRunnerOptions): { stalled: boolean } {
  // The counts as they were when the flow began: every `change` wait is measured against them, so a step the person
  // already completed (a field filled early, an account connected by hand) is recognised the moment it begins.
  const [baseline] = useState(() => workspaceRepository.progressSignals());
  const [stalledStep, setStalledStep] = useState<TourStep | null>(null);

  // Latest values, read by the timers without restarting them.
  const latest = useRef({ advance, pathname, onNavigate, onOpenConnect });
  useEffect(() => { latest.current = { advance, pathname, onNavigate, onOpenConnect }; });

  useEffect(() => {
    if (!enabled) return;
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      latest.current.advance();
    };

    if (step.enter?.navigate) latest.current.onNavigate?.(step.enter.navigate);
    if (step.enter?.openConnect) latest.current.onOpenConnect?.(step.enter.openConnect);

    // A step whose job is already done as it begins (a field Mavera pre-filled, a form that is already open) is
    // passed straight away, so a good default costs the person nothing.
    const check = () => {
      if (finished) return;
      if (step.optional && !resolveTourTarget(step.target)) return done();
      const ctx: CoachContext = { pathname: latest.current.pathname, baseline, signals: workspaceRepository.progressSignals() };
      if (waitsOf(step).length > 0 && isStepDone(step, ctx)) done();
    };
    check();
    const poll = window.setInterval(check, COACH_POLL_MS);
    const stall = step.waitFor ? window.setTimeout(() => setStalledStep(step), COACH_STALL_MS) : undefined;

    // A click on the step's own target counts as doing it; let the click run first (it may open something).
    const onClick = (event: MouseEvent) => {
      if (finished || !waitsForClick(step)) return;
      const target = resolveTourTarget(step.target);
      if (target && event.target instanceof Node && target.contains(event.target)) window.setTimeout(done, 0);
    };
    document.addEventListener('click', onClick, true);

    return () => {
      finished = true;
      window.clearInterval(poll);
      if (stall !== undefined) window.clearTimeout(stall);
      document.removeEventListener('click', onClick, true);
    };
  }, [enabled, step, baseline]);

  return { stalled: stalledStep === step };
}
