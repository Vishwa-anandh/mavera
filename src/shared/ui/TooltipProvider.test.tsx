import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from './TooltipProvider';

class TestPointerEvent extends MouseEvent {
  pointerType: string;
  constructor(type: string, init: MouseEventInit & { pointerType?: string } = {}) {
    super(type, init);
    this.pointerType = init.pointerType ?? 'mouse';
  }
}

beforeAll(() => { vi.stubGlobal('PointerEvent', TestPointerEvent); });
afterAll(() => { vi.unstubAllGlobals(); });

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => vi.useRealTimers());

const advance = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const setup = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

function App() {
  return (
    <>
      <TooltipProvider />
      <button type="button" title="Refresh data"><svg aria-hidden="true" /></button>
      <button type="button" title="Save the draft">Save</button>
      <span data-testid="cell" title="Quarterly cloud spend for the production account">Quarterly cloud sp&hellip;</span>
      <p title="Keeps the browser tooltip" data-no-tooltip="">Opted out</p>
      <span data-testid="parent" title="Whole row"><i data-testid="child">inner</i></span>
    </>
  );
}

describe('TooltipProvider', () => {
  it('moves a native title to data-tooltip on hover so the browser tooltip never shows, then shows the custom one', async () => {
    const user = setup();
    render(<App />);
    const cell = screen.getByTestId('cell');
    await user.hover(cell);
    expect(cell).not.toHaveAttribute('title');
    expect(cell).toHaveAttribute('data-tooltip', 'Quarterly cloud spend for the production account');
    expect(screen.queryByRole('tooltip')).toBeNull();
    await advance(350);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Quarterly cloud spend for the production account');
    expect(cell).toHaveAccessibleDescription('Quarterly cloud spend for the production account');
  });

  it('upgrades a title on an ancestor when a descendant is hovered', async () => {
    const user = setup();
    render(<App />);
    await user.hover(screen.getByTestId('child'));
    await advance(350);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Whole row');
  });

  it('shows on keyboard focus at once and follows focus between titled controls', async () => {
    const user = setup();
    render(<App />);
    await user.tab();
    expect(screen.getByRole('tooltip')).toHaveTextContent('Refresh data');
    await user.tab();
    expect(screen.getByRole('tooltip')).toHaveTextContent('Save the draft');
  });

  it('gives an icon-only button its accessible name from the title, and leaves a labelled button alone', async () => {
    const user = setup();
    render(<App />);
    const icon = screen.getAllByRole('button')[0];
    await user.hover(icon);
    expect(screen.getByRole('button', { name: 'Refresh data' })).toBe(icon);
    const save = screen.getByRole('button', { name: 'Save' });
    await user.hover(save);
    expect(save).not.toHaveAttribute('aria-label');
    expect(save).toHaveAttribute('data-tooltip', 'Save the draft');
  });

  it('leaves elements with data-no-tooltip on their native title', async () => {
    const user = setup();
    render(<App />);
    const optedOut = screen.getByText('Opted out');
    await user.hover(optedOut);
    await advance(500);
    expect(optedOut).toHaveAttribute('title', 'Keeps the browser tooltip');
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('dismisses on Escape and stays dismissed while the pointer rests on the same element', async () => {
    const user = setup();
    render(<App />);
    const cell = screen.getByTestId('cell');
    await user.hover(cell);
    await advance(350);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).toBeNull();
    fireEvent.pointerOver(cell, { pointerType: 'mouse' });
    await advance(500);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('shows on a 500 ms touch press-and-hold only', async () => {
    render(<App />);
    const cell = screen.getByTestId('cell');
    fireEvent.pointerOver(cell, { pointerType: 'touch' });
    await advance(600);
    expect(screen.queryByRole('tooltip')).toBeNull();
    fireEvent.pointerDown(cell, { pointerType: 'touch', clientX: 3, clientY: 3 });
    await advance(550);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Quarterly cloud spend');
  });

  it('closes when the page scrolls', async () => {
    const user = setup();
    render(<App />);
    await user.tab();
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.scroll(window);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('picks up a title React sets again after it changed', async () => {
    const user = setup();
    const { rerender } = render(<><TooltipProvider /><button type="button" title="First">x</button></>);
    const button = screen.getByRole('button');
    await user.hover(button);
    await advance(350);
    expect(screen.getByRole('tooltip')).toHaveTextContent('First');
    await user.unhover(button);
    await advance(400);
    rerender(<><TooltipProvider /><button type="button" title="Second">x</button></>);
    await user.hover(button);
    await advance(350);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Second');
  });
});
