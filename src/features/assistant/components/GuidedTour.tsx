import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from '../../../shared/ui/icons';
import { computeFloatingPosition } from '../../../shared/ui/floatingPosition';
import { useModalOverlay } from '../../../shared/ui/useOverlay';
import { fillFields, isCoachFlow, waitsOf } from '../model/coachWaits';
import { boxOf, placeCoachCard, sameBox, type Box } from '../model/coachPlacement';
import type { ConnectProviderKey, TourStep } from '../model/flowGuides';
import { resolveTourTarget } from '../model/tourTargets';
import { useCoachRunner } from '../model/useCoachRunner';

interface GuidedTourProps {
  /** Short name of the page the tour is about, e.g. "Cost Overview". */
  pageName: string;
  /** Title of the tour when it isn't the page overview, e.g. "Add a user". */
  tourName?: string;
  steps: TourStep[];
  onClose: () => void;
  /** Called when the last step is passed (Finish, or its wait was met), just before `onClose`. */
  onFinish?: () => void;
  /** Where the app is now: a `route` wait compares against it. */
  pathname?: string;
  /** Goes to another page; a coach step's `enter.navigate` uses it. */
  onNavigate?: (to: string) => void;
  /** Opens a connect form; a coach step's `enter.openConnect` uses it. */
  onOpenConnect?: (provider: ConnectProviderKey) => void;
}

const SPOT_PADDING = 8;

/**
 * A step-by-step walkthrough drawn over the live page: the current step's element is outlined, the rest of
 * the page is dimmed, and a card beside it says what the element is and how to use it (step x of n, a short
 * tag, Previous / Skip / Next). Steps whose element isn't on the page right now (a module the org doesn't
 * have, an empty state) are left out rather than pointing at nothing. Esc or the close button ends it.
 *
 * It is also the live coach. When any step has a `waitFor`, an `action` or an `enter` (see flowGuides.ts) the
 * tour runs as a coach: the page stays usable, nothing is left out (an element may not exist until an earlier
 * step opens it), a step may first go to another page or open a form, and the card shows what to do
 * ("Do this: click Connect") instead of Next and moves on by itself when it is done (see useCoachRunner).
 * "Skip this step" is always there, and "Fill it in for me" types an example into the step's fields.
 */
export function GuidedTour({ pageName, tourName, steps, onClose, onFinish, pathname, onNavigate, onOpenConnect }: GuidedTourProps) {
  const titleId = useId();
  const coach = useMemo(() => isCoachFlow(steps), [steps]);
  const cardRef = useModalOverlay<HTMLDivElement>(onClose, { modal: !coach });

  // Decide once, when the tour opens, which steps have something to point at (a coach flow keeps them all).
  const { active, skipped } = useMemo(() => {
    if (coach) return { active: steps, skipped: 0 };
    const present = steps.filter((step) => resolveTourTarget(step.target));
    return { active: present.length > 0 ? present : steps.slice(0, 1), skipped: steps.length - present.length };
  }, [steps, coach]);

  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Box | null>(null);
  const [avoid, setAvoid] = useState<Box | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const step = active[index];
  const last = index === active.length - 1;
  const waiting = coach && waitsOf(step).length > 0;

  const finish = useCallback(() => {
    onFinish?.();
    onClose();
  }, [onFinish, onClose]);
  const advance = useCallback(() => {
    if (index >= active.length - 1) finish();
    else setIndex(index + 1);
  }, [index, active.length, finish]);
  const { stalled } = useCoachRunner({ enabled: coach, step, advance, pathname, onNavigate, onOpenConnect });

  // The outline follows the element; a dialog the element sits in is remembered so the card can stay clear of it.
  const scrolledFor = useRef<HTMLElement | null>(null);
  const measure = useCallback(() => {
    const el = resolveTourTarget(step.target);
    if (el && coach && scrolledFor.current !== el) {
      scrolledFor.current = el;
      el.scrollIntoView({ block: 'center', inline: 'nearest' });
    }
    const next = el ? boxOf(el.getBoundingClientRect()) : null;
    const dialog = el?.closest('[role="dialog"]');
    const nextAvoid = dialog ? boxOf(dialog.getBoundingClientRect()) : null;
    setRect((prev) => (sameBox(prev, next) ? prev : next));
    setAvoid((prev) => (sameBox(prev, nextAvoid) ? prev : nextAvoid));
  }, [step.target, coach]);

  // Bring the step's element into view, then outline it; keep the outline on it while the page scrolls/resizes.
  // A coach flow looks again every moment, because its element may only appear after the person acts.
  useEffect(() => {
    const el = resolveTourTarget(step.target);
    if (!coach) el?.scrollIntoView({ block: 'center', inline: 'nearest' });
    measure();
    const settle = window.setTimeout(measure, 180);
    const watch = coach ? window.setInterval(measure, 250) : undefined;
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    const observer = el && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (el) observer?.observe(el);
    return () => {
      window.clearTimeout(settle);
      window.clearInterval(watch);
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
      observer?.disconnect();
    };
  }, [step.target, measure, coach]);

  // Place the card beside the outlined element (below it when there's room, above otherwise), or centre it.
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const size = { width: card.offsetWidth, height: card.offsetHeight };
    if (coach) {
      setPosition(placeCoachCard(rect, size, { width: window.innerWidth, height: window.innerHeight }, avoid));
      return;
    }
    if (!rect) {
      setPosition({ top: Math.max(16, (window.innerHeight - size.height) / 2), left: Math.max(16, (window.innerWidth - size.width) / 2) });
      return;
    }
    const spot = new DOMRect(rect.left - SPOT_PADDING, rect.top - SPOT_PADDING, rect.width + SPOT_PADDING * 2, rect.height + SPOT_PADDING * 2);
    const placed = computeFloatingPosition(spot, size, { preferred: 'bottom', align: 'start', gap: 14, viewportPadding: 16 });
    setPosition({ top: placed.top, left: placed.left });
  }, [rect, avoid, index, coach, stalled]);

  // Arrow keys step through a page tour; a coach flow leaves them to the form the person is typing into.
  useEffect(() => {
    if (coach) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, active.length - 1));
      if (event.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active.length, coach]);

  const next = () => (last ? finish() : setIndex((i) => i + 1));
  const skipStep = () => (last ? onClose() : setIndex((i) => i + 1));
  // A coach step with nothing to point at and nothing to wait for is a closing note: dim the page behind it.
  const solid = !rect && !waiting;

  return createPortal(
    <div className={`mv-tour${coach ? ' mv-tour--coach' : ''}`} data-skipped={skipped} data-steps={active.length}>
      <div className={`mv-tour-scrim${solid || (!coach && !rect) ? ' is-solid' : ''}`} aria-hidden />
      {rect && (
        <div
          className="mv-tour-spot"
          aria-hidden
          style={{ top: rect.top - SPOT_PADDING, left: rect.left - SPOT_PADDING, width: rect.width + SPOT_PADDING * 2, height: rect.height + SPOT_PADDING * 2 }}
        />
      )}
      <div
        ref={cardRef}
        className="mv-tour-card"
        role="dialog"
        aria-modal={coach ? undefined : true}
        aria-labelledby={titleId}
        data-coach={coach || undefined}
        style={position ? { top: position.top, left: position.left } : { visibility: 'hidden' }}
      >
        <header className="mv-tour-head">
          <span className="mv-tour-flow" id={titleId}>{tourName ?? `${pageName} tour`}</span>
          <span className="mv-tour-count">Step {index + 1} of {active.length}</span>
          <button type="button" className="mv-icon-button" aria-label={coach ? 'Close guide' : 'Close tour'} onClick={onClose}><CloseIcon size={16} /></button>
        </header>
        <h2 className="mv-tour-title" aria-live="polite">
          {step.title}
          {step.tag && <span className="mv-tour-tag">{step.tag}</span>}
        </h2>
        <p className="mv-tour-body">{step.body}</p>
        {waiting && step.action && <p className="mv-tour-action" role="status">{step.action}</p>}
        {waiting && step.hint && <p className="mv-tour-hint">{step.hint}</p>}
        {waiting && stalled && <p className="mv-tour-hint">This is taking a while. You can skip this step, or close the guide and do it yourself.</p>}
        <footer className="mv-tour-foot">
          {waiting ? (
            <>
              {step.fill ? (
                <button type="button" className="mv-secondary-button" onClick={() => { void fillFields(step.fill ?? []); }}>Fill it in for me</button>
              ) : <span />}
              <button type="button" className={stalled ? 'mv-secondary-button' : 'mv-quiet-button'} onClick={skipStep}>Skip this step</button>
            </>
          ) : (
            <>
              {index > 0 && !coach ? (
                <button type="button" className="mv-secondary-button" onClick={() => setIndex((i) => i - 1)}>
                  <ChevronLeftIcon size={14} /> Previous
                </button>
              ) : <span />}
              {!coach && <button type="button" className="mv-quiet-button" onClick={onClose}>Skip</button>}
              <button type="button" className="mv-primary-button" onClick={next} data-autofocus>
                {last ? (coach ? 'Done' : 'Finish tour') : 'Next'} {!last && <ChevronRightIcon size={14} />}
              </button>
            </>
          )}
        </footer>
      </div>
    </div>,
    document.body,
  );
}
