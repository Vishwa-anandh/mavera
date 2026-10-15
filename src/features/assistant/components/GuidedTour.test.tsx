import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import userEvent from '@testing-library/user-event';
import { GuidedTour } from './GuidedTour';
import { resolveTourTarget } from '../model/tourTargets';
import type { TourStep } from '../model/flowGuides';

// jsdom has no layout: give every element a size so "visible" checks pass, and no-op scrolling.
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 10, y: 10, left: 10, top: 10, right: 210, bottom: 110, width: 200, height: 100, toJSON: () => ({}) } as DOMRect);
  HTMLElement.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  vi.restoreAllMocks();
});

const steps: TourStep[] = [
  { target: 'css:#first', title: 'First stop', tag: 'Filters', body: 'About the first thing.' },
  { target: 'btn:Save it', title: 'Second stop', body: 'About the button.' },
  { target: 'panel:Totals', title: 'Third stop', tag: 'Chart', body: 'About the totals.' },
];

function Page() {
  return (
    <main>
      <div id="first">First</div>
      <button type="button">Save it</button>
      <section><h2>Totals</h2><p>numbers</p></section>
    </main>
  );
}

describe('resolveTourTarget', () => {
  it('finds elements by css selector, button label and panel heading', () => {
    render(<Page />);
    expect(resolveTourTarget('css:#first')?.id).toBe('first');
    expect(resolveTourTarget('btn:save')?.tagName).toBe('BUTTON');
    expect(resolveTourTarget('panel:Totals')?.tagName).toBe('SECTION');
  });

  it('returns null for something that is not on the page', () => {
    render(<Page />);
    expect(resolveTourTarget('css:#nope')).toBeNull();
    expect(resolveTourTarget('btn:Delete everything')).toBeNull();
    expect(resolveTourTarget('panel:Missing')).toBeNull();
    expect(resolveTourTarget('nonsense')).toBeNull();
  });
});

/** The tour opens over a page that is already on screen, so mount the page first and the tour second. */
function openTour(tour: ReactElement) {
  const view = render(<Page />);
  view.rerender(<><Page />{tour}</>);
}

describe('GuidedTour', () => {
  it('walks the steps with Next and Previous, showing "Step x of n", the tag and the text', async () => {
    const user = userEvent.setup();
    openTour(<GuidedTour pageName="Demo page" steps={steps} onClose={() => {}} />);

    expect(screen.getByRole('dialog', { name: /Demo page tour/ })).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    expect(screen.getByText('First stop')).toBeInTheDocument();
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Previous/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Next/ }));
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
    expect(screen.getByText('About the button.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Previous/ }));
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
  });

  it('finishes on the last step and closes with Skip, the close button and Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    openTour(<GuidedTour pageName="Demo page" steps={steps} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByRole('button', { name: 'Finish tour' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Skip' }));
    await user.click(screen.getByRole('button', { name: 'Close tour' }));
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(4);
  });

  it('leaves out steps whose element is not on the page', () => {
    openTour(<GuidedTour pageName="Demo page" steps={[...steps, { target: 'css:#gone', title: 'Not here', body: 'x' }]} onClose={() => {}} />);
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    expect(document.querySelector('.mv-tour')?.getAttribute('data-skipped')).toBe('1');
  });

  it('still shows the first step, centred, when nothing on the page matches', () => {
    render(<GuidedTour pageName="Demo page" steps={steps} onClose={() => {}} />);
    expect(screen.getByText('Step 1 of 1')).toBeInTheDocument();
    expect(document.querySelector('.mv-tour-spot')).toBeNull();
  });
});
