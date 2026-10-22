import { ChevronLeftIcon, ChevronRightIcon } from '../../../shared/ui/icons';
import type { FlowGuide, FlowTour } from '../model/flowGuides';
import type { OnboardingFlow } from '../model/onboardingFlows';

interface TourPickerProps {
  /** The current page's guide; a page without one still lists the getting-started flows. */
  guide?: FlowGuide;
  /** Called with no flow for the page overview, or with one of the page's task tours. */
  onPick: (flow?: FlowTour) => void;
  /** The live getting-started flows to list under "Getting started" (already narrowed to the subscribed modules). */
  gettingStarted?: OnboardingFlow[];
  /** Called with the chosen getting-started flow. */
  onPickFlow?: (flow: OnboardingFlow) => void;
  onBack: () => void;
}

const stepsLabel = (count: number) => `${count} ${count === 1 ? 'step' : 'steps'}`;

/**
 * Lists every guided tour available on the current page, and the getting-started flows (live coaching that
 * waits for you to act), so the person can choose which to run.
 */
export function TourPicker({ guide, onPick, gettingStarted = [], onPickFlow, onBack }: TourPickerProps) {
  const tours = guide
    ? [
      { key: 'overview', label: `${guide.pageName} overview`, hint: 'A quick look at everything on this page', count: guide.steps.length, flow: undefined as FlowTour | undefined },
      ...(guide.flows ?? []).map((flow) => ({ key: flow.key, label: flow.label, hint: 'Step-by-step for this task', count: flow.steps.length, flow })),
    ]
    : [];
  return (
    <div className="mv-tour-picker">
      <button type="button" className="mv-quiet-button mv-tour-picker-back" onClick={onBack}><ChevronLeftIcon size={14} /> Back to chat</button>
      {guide && (
        <section aria-labelledby="tour-picker-page">
          <h3 id="tour-picker-page" className="mv-tour-picker-title">Guided tours on this page</h3>
          <ul className="mv-tour-picker-list" role="list">
            {tours.map((tour) => (
              <li key={tour.key}>
                <button type="button" className="mv-tour-picker-item" onClick={() => onPick(tour.flow)}>
                  <span className="mv-tour-picker-text"><strong>{tour.label}</strong><small>{tour.hint} · {stepsLabel(tour.count)}</small></span>
                  <ChevronRightIcon size={16} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {gettingStarted.length > 0 && onPickFlow && (
        <section aria-labelledby="tour-picker-start">
          <h3 id="tour-picker-start" className="mv-tour-picker-title">Getting started</h3>
          <p className="mv-muted mv-tour-picker-note">I point at what to click and move on when you have done it.</p>
          <ul className="mv-tour-picker-list" role="list">
            {gettingStarted.map((flow) => (
              <li key={flow.key}>
                <button type="button" className="mv-tour-picker-item" onClick={() => onPickFlow(flow)}>
                  <span className="mv-tour-picker-text">
                    <strong>{flow.label}</strong>
                    <small>{flow.summary}</small>
                  </span>
                  <ChevronRightIcon size={16} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
