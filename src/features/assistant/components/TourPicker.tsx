import { ChevronLeftIcon, ChevronRightIcon } from '../../../shared/ui/icons';
import type { FlowGuide, FlowTour } from '../model/flowGuides';

interface TourPickerProps {
  guide: FlowGuide;
  /** Called with no flow for the page overview, or with one of the page's task tours. */
  onPick: (flow?: FlowTour) => void;
  onBack: () => void;
}

const stepsLabel = (count: number) => `${count} ${count === 1 ? 'step' : 'steps'}`;

/** Lists every guided tour available on the current page so the person can choose which to run. */
export function TourPicker({ guide, onPick, onBack }: TourPickerProps) {
  const tours = [
    { key: 'overview', label: `${guide.pageName} overview`, hint: 'A quick look at everything on this page', count: guide.steps.length, flow: undefined as FlowTour | undefined },
    ...(guide.flows ?? []).map((flow) => ({ key: flow.key, label: flow.label, hint: 'Step-by-step for this task', count: flow.steps.length, flow })),
  ];
  return (
    <div className="mv-tour-picker">
      <button type="button" className="mv-quiet-button mv-tour-picker-back" onClick={onBack}><ChevronLeftIcon size={14} /> Back to chat</button>
      <h3 className="mv-tour-picker-title">Guided tours on this page</h3>
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
    </div>
  );
}
