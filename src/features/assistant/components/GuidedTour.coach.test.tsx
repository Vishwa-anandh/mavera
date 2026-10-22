import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement, ReactNode } from 'react';
import { workspaceRepository } from '../../../data-access';
import { COACH_STALL_MS } from '../model/useCoachRunner';
import type { TourStep } from '../model/flowGuides';
import { GuidedTour } from './GuidedTour';

// jsdom has no layout: give every element a size so "visible" checks pass, and no-op scrolling.
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 10, y: 10, left: 10, top: 10, right: 210, bottom: 110, width: 200, height: 100, toJSON: () => ({}) } as DOMRect);
  HTMLElement.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  vi.restoreAllMocks();
  act(() => workspaceRepository.setProfile('populated'));
});

const closing: TourStep = { target: 'none:', title: 'All done', body: 'That is everything.' };
const never = (over: Partial<TourStep> = {}): TourStep => ({ target: 'css:#never', title: 'Stuck', body: 'x', action: 'Do this', waitFor: { kind: 'element', selector: '#never' }, ...over });
const account = { name: 'Prod', tenantId: 't', subscriptionId: 's', clientId: 'c' } as never;

function CoachPage({ children }: { children?: ReactNode }) {
  return (
    <main>
      <button type="button">Save it</button>
      <input aria-label="Name" id="name" />
      {children}
    </main>
  );
}

/** The coach opens over a page that is already on screen, so mount the page first and the tour second. */
function openCoach(tour: ReactElement, page: ReactElement = <CoachPage />) {
  const view = render(page);
  view.rerender(<>{page}{tour}</>);
  return view;
}

describe('GuidedTour as a live coach', () => {
  it('shows what to do instead of Next, and moves on by itself when the element it waits for appears', async () => {
    const steps: TourStep[] = [
      { target: 'css:#ready', title: 'Open it', body: 'Open the form.', action: 'Do this: click Open', waitFor: { kind: 'element', selector: '#ready' } },
      closing,
    ];
    const tour = <GuidedTour pageName="Getting started" tourName="Demo flow" steps={steps} onClose={() => {}} />;
    const view = openCoach(tour);

    expect(screen.getByRole('dialog', { name: 'Demo flow' })).toBeInTheDocument();
    expect(screen.getByText('Do this: click Open')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Next/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Previous/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Skip this step' })).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();

    view.rerender(<><CoachPage><div id="ready" /></CoachPage>{tour}</>);
    await waitFor(() => expect(screen.getByText('Step 2 of 2')).toBeInTheDocument());
    expect(screen.getByText('All done')).toBeInTheDocument();
  });

  it('keeps every step, even ones whose element is not on the page yet, and does not trap the page', () => {
    const steps: TourStep[] = [
      { target: 'css:#later', title: 'First', body: 'x', action: 'Do this', waitFor: { kind: 'click' } },
      { target: 'css:#also-later', title: 'Second', body: 'y' },
    ];
    openCoach(<GuidedTour pageName="Getting started" steps={steps} onClose={() => {}} />);
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
    expect(document.querySelector('.mv-tour--coach')).not.toBeNull();
    expect(screen.getByRole('dialog')).not.toHaveAttribute('aria-modal');
  });

  it('waits for a field to be filled', async () => {
    const user = userEvent.setup();
    const steps: TourStep[] = [{ target: 'css:#name', title: 'Name it', body: 'x', action: 'Do this: type a name', waitFor: { kind: 'field', selector: '#name' } }, closing];
    openCoach(<GuidedTour pageName="Getting started" steps={steps} onClose={() => {}} />);
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Name'), 'Ada');
    await waitFor(() => expect(screen.getByText('Step 2 of 2')).toBeInTheDocument());
  });

  it('waits for a click on its own target (and not elsewhere), and lets the click do its work', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const steps: TourStep[] = [{ target: 'btn:Save it', title: 'Save', body: 'x', action: 'Do this: click Save it', waitFor: { kind: 'click' } }, closing];
    openCoach(
      <GuidedTour pageName="Getting started" steps={steps} onClose={() => {}} />,
      <main><button type="button" onClick={onSave}>Save it</button><button type="button">Elsewhere</button></main>,
    );
    await user.click(screen.getByRole('button', { name: 'Elsewhere' }));
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save it' }));
    expect(onSave).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByText('Step 2 of 2')).toBeInTheDocument());
  });

  it('advances when a watched store value changes', async () => {
    workspaceRepository.setProfile('empty');
    const steps: TourStep[] = [{ target: 'none:', title: 'Connect', body: 'x', action: 'Do this: connect', waitFor: { kind: 'change', signal: 'accounts' } }, closing];
    openCoach(<GuidedTour pageName="Getting started" steps={steps} onClose={() => {}} />);
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
    act(() => { workspaceRepository.addConnectedAccount('azure', account); });
    await waitFor(() => expect(screen.getByText('Step 2 of 2')).toBeInTheDocument());
  });

  it('passes a step straight away when its job is already done as it begins', async () => {
    const steps: TourStep[] = [{ target: 'css:#name', title: 'Name it', body: 'x', action: 'Do this: type a name', waitFor: { kind: 'field', selector: '#name' } }, closing];
    openCoach(
      <GuidedTour pageName="Getting started" steps={steps} onClose={() => {}} />,
      <main><input aria-label="Name" id="name" defaultValue="Monthly budget" /></main>,
    );
    await waitFor(() => expect(screen.getByText('Step 2 of 2')).toBeInTheDocument());
  });

  it("runs a step's enter: goes to another page, then follows the route and opens a connect form", async () => {
    const onNavigate = vi.fn();
    const onOpenConnect = vi.fn();
    const steps: TourStep[] = [
      { target: 'none:', title: 'Go', body: 'x', action: 'Going to the budgets page', enter: { navigate: '/budgets?open=new' }, waitFor: { kind: 'route', startsWith: '/budgets' } },
      { target: 'none:', title: 'Open', body: 'x', action: 'Opening', enter: { openConnect: 'azure' }, waitFor: { kind: 'element', selector: '#never' } },
    ];
    const tour = (pathname: string) => <GuidedTour pageName="Getting started" steps={steps} pathname={pathname} onNavigate={onNavigate} onOpenConnect={onOpenConnect} onClose={() => {}} />;
    const view = openCoach(tour('/'));
    expect(onNavigate).toHaveBeenCalledWith('/budgets?open=new');
    expect(onOpenConnect).not.toHaveBeenCalled();

    view.rerender(<><CoachPage />{tour('/budgets')}</>); // the app arrived on the page: the cross-page step is done
    await waitFor(() => expect(screen.getByText('Step 2 of 2')).toBeInTheDocument());
    expect(onOpenConnect).toHaveBeenCalledWith('azure');
  });

  const optional: TourStep = { target: 'btn:Pick one', title: 'Pick one', body: 'x', action: 'Do this: pick', waitFor: { kind: 'click' }, optional: true };

  it('skips an optional step whose element is not on screen as it begins', async () => {
    openCoach(<GuidedTour pageName="Getting started" steps={[optional, closing]} onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText('Step 2 of 2')).toBeInTheDocument());
  });

  it('shows an optional step whose element is on screen, and waits for the click', async () => {
    const user = userEvent.setup();
    openCoach(
      <GuidedTour pageName="Getting started" steps={[optional, closing]} onClose={() => {}} />,
      <main><button type="button">Pick one</button></main>,
    );
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Pick one' }));
    await waitFor(() => expect(screen.getByText('Step 2 of 2')).toBeInTheDocument());
  });

  it('can be skipped step by step, and finishing the closing note tells the app', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onFinish = vi.fn();
    openCoach(<GuidedTour pageName="Getting started" steps={[never(), closing]} onClose={onClose} onFinish={onFinish} />);

    await user.click(screen.getByRole('button', { name: 'Skip this step' }));
    expect(screen.getByText('Step 2 of 2')).toBeInTheDocument();
    expect(onFinish).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closing a guide midway does not count as finishing it', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onFinish = vi.fn();
    openCoach(<GuidedTour pageName="Getting started" steps={[never(), closing]} onClose={onClose} onFinish={onFinish} />);
    await user.click(screen.getByRole('button', { name: 'Close guide' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onFinish).not.toHaveBeenCalled();
  });

  it('says so when a step has waited a long time, and offers the skip more firmly', () => {
    vi.useFakeTimers();
    try {
      openCoach(<GuidedTour pageName="Getting started" steps={[never(), closing]} onClose={() => {}} />);
      expect(screen.queryByText(/This is taking a while/)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Skip this step' })).toHaveClass('mv-quiet-button');
      act(() => { vi.advanceTimersByTime(COACH_STALL_MS + 100); });
      expect(screen.getByText(/This is taking a while/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Skip this step' })).toHaveClass('mv-secondary-button');
    } finally {
      vi.useRealTimers();
    }
  });

  it("types an example into the step's empty fields for Fill it in for me, which then completes the step", async () => {
    const user = userEvent.setup();
    const steps: TourStep[] = [
      { target: 'css:#name', title: 'Name it', body: 'x', action: 'Do this: type a name', waitFor: { kind: 'field', selector: '#name' }, fill: [{ selector: '#name', value: 'Example name' }] },
      closing,
    ];
    openCoach(<GuidedTour pageName="Getting started" steps={steps} onClose={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Fill it in for me' }));
    await waitFor(() => expect(screen.getByText('Step 2 of 2')).toBeInTheDocument());
    expect(screen.getByLabelText('Name')).toHaveValue('Example name');
  });

  it('leaves the arrow keys to the form a person is typing in', async () => {
    const user = userEvent.setup();
    openCoach(<GuidedTour pageName="Getting started" steps={[never(), closing]} onClose={() => {}} />);
    await user.keyboard('{ArrowRight}');
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
  });
});
