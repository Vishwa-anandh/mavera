import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from '../../../shared/ui/icons';
import { computeFloatingPosition } from '../../../shared/ui/floatingPosition';
import { useModalOverlay } from '../../../shared/ui/useOverlay';
import type { TourStep } from '../model/flowGuides';
import { resolveTourTarget } from '../model/tourTargets';

interface GuidedTourProps {
  /** Short name of the page the tour is about, e.g. "Cost Overview". */
  pageName: string;
  /** Title of the tour when it isn't the page overview, e.g. "Add a user". */
  tourName?: string;
  steps: TourStep[];
  onClose: () => void;
}

const SPOT_PADDING = 8;

/**
 * A step-by-step walkthrough drawn over the live page: the current step's element is outlined, the rest of
 * the page is dimmed, and a card beside it says what the element is and how to use it (step x of n, a short
 * tag, Previous / Skip / Next). Steps whose element isn't on the page right now (a module the org doesn't
 * have, an empty state) are left out rather than pointing at nothing. Esc or the close button ends it.
 */
export function GuidedTour({ pageName, tourName, steps, onClose }: GuidedTourProps) {
  const titleId = useId();
  const cardRef = useModalOverlay<HTMLDivElement>(onClose);

  // Decide once, when the tour opens, which steps have something to point at.
  const { active, skipped } = useMemo(() => {
    const present = steps.filter((step) => resolveTourTarget(step.target));
    return { active: present.length > 0 ? present : steps.slice(0, 1), skipped: steps.length - present.length };
  }, [steps]);

  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const step = active[index];
  const last = index === active.length - 1;

  const measure = useCallback(() => {
    const el = resolveTourTarget(step.target);
    setRect(el ? el.getBoundingClientRect() : null);
  }, [step.target]);

  // Bring the step's element into view, then outline it; keep the outline on it while the page scrolls/resizes.
  useEffect(() => {
    const el = resolveTourTarget(step.target);
    el?.scrollIntoView({ block: 'center', inline: 'nearest' });
    measure();
    const settle = window.setTimeout(measure, 180);
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    const observer = el && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (el) observer?.observe(el);
    return () => {
      window.clearTimeout(settle);
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
      observer?.disconnect();
    };
  }, [step.target, measure]);

  // Place the card beside the outlined element (below it when there's room, above otherwise), or centre it.
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const size = { width: card.offsetWidth, height: card.offsetHeight };
    if (!rect) {
      setPosition({ top: Math.max(16, (window.innerHeight - size.height) / 2), left: Math.max(16, (window.innerWidth - size.width) / 2) });
      return;
    }
    const spot = new DOMRect(rect.left - SPOT_PADDING, rect.top - SPOT_PADDING, rect.width + SPOT_PADDING * 2, rect.height + SPOT_PADDING * 2);
    const placed = computeFloatingPosition(spot, size, { preferred: 'bottom', align: 'start', gap: 14, viewportPadding: 16 });
    setPosition({ top: placed.top, left: placed.left });
  }, [rect, index]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, active.length - 1));
      if (event.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active.length]);

  const next = () => (last ? onClose() : setIndex((i) => i + 1));

  return createPortal(
    <div className="mv-tour" data-skipped={skipped} data-steps={active.length}>
      <div className={`mv-tour-scrim${rect ? '' : ' is-solid'}`} aria-hidden />
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
        aria-modal="true"
        aria-labelledby={titleId}
        style={position ? { top: position.top, left: position.left } : { visibility: 'hidden' }}
      >
        <header className="mv-tour-head">
          <span className="mv-tour-flow" id={titleId}>{tourName ?? `${pageName} tour`}</span>
          <span className="mv-tour-count">Step {index + 1} of {active.length}</span>
          <button type="button" className="mv-icon-button" aria-label="Close tour" onClick={onClose}><CloseIcon size={16} /></button>
        </header>
        <h2 className="mv-tour-title" aria-live="polite">
          {step.title}
          {step.tag && <span className="mv-tour-tag">{step.tag}</span>}
        </h2>
        <p className="mv-tour-body">{step.body}</p>
        <footer className="mv-tour-foot">
          {index > 0 ? (
            <button type="button" className="mv-secondary-button" onClick={() => setIndex((i) => i - 1)}>
              <ChevronLeftIcon size={14} /> Previous
            </button>
          ) : <span />}
          <button type="button" className="mv-quiet-button" onClick={onClose}>Skip</button>
          <button type="button" className="mv-primary-button" onClick={next} data-autofocus>
            {last ? 'Finish tour' : 'Next'} {!last && <ChevronRightIcon size={14} />}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
