import { requestPageTour } from '../lib/assistantEvents';
import { usePageHasTour } from '../lib/pageTourContext';
import { Tooltip } from './Tooltip';

/**
 * A quiet round "?" button for a page header (always the last control): starts the guided tour of the page being viewed in one click. Renders
 * nothing on a page that has no tour, so it can be dropped into any header.
 */
export function PageTourButton({ className }: { className?: string }) {
  const hasTour = usePageHasTour();
  if (!hasTour) return null;
  return (
    <Tooltip content="Take a quick tour of this page">
      <button
        type="button"
        className={`mv-tour-button${className ? ` ${className}` : ''}`}
        aria-label="Take a tour of this page"
        onClick={requestPageTour}
      >
        ?
      </button>
    </Tooltip>
  );
}
