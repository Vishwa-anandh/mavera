import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tooltip } from './Tooltip';

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

function Example({ content = 'Take a quick tour of this page' }: { content?: string }) {
  return (
    <>
      <Tooltip content={content}><button type="button" aria-label="Tour">?</button></Tooltip>
      <button type="button">Other</button>
    </>
  );
}

describe('Tooltip', () => {
  it('opens after the 300 ms hover delay, not before, and describes the trigger', async () => {
    const user = setup();
    render(<Example />);
    await user.hover(screen.getByRole('button', { name: 'Tour' }));
    await advance(200);
    expect(screen.queryByRole('tooltip')).toBeNull();
    await advance(150);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Take a quick tour of this page');
    expect(screen.getByRole('button', { name: 'Tour' })).toHaveAccessibleDescription('Take a quick tour of this page');
  });

  it('opens at once on keyboard focus and closes at once on blur', async () => {
    const user = setup();
    render(<Example />);
    await user.tab();
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    await user.tab();
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('closes on Escape and stays closed until a fresh focus', async () => {
    const user = setup();
    render(<Example />);
    await user.tab();
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).toBeNull();
    await advance(500);
    expect(screen.queryByRole('tooltip')).toBeNull();
    await user.tab();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Tour' })).toHaveFocus();
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('closes shortly after the pointer leaves, and stays while the pointer is on the bubble', async () => {
    const user = setup();
    render(<Example />);
    const trigger = screen.getByRole('button', { name: 'Tour' });
    await user.hover(trigger);
    await advance(350);
    const tip = screen.getByRole('tooltip');
    await user.unhover(trigger);
    await user.hover(tip);
    await advance(400);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    await user.unhover(tip);
    await advance(400);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('closes on scroll', async () => {
    const user = setup();
    render(<Example />);
    await user.tab();
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.scroll(window);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('closes when the trigger is pressed with the mouse', async () => {
    const user = setup();
    render(<Example />);
    const trigger = screen.getByRole('button', { name: 'Tour' });
    await user.hover(trigger);
    await advance(350);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    await user.click(trigger);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('shows on a 500 ms touch press-and-hold and ignores a quick tap', async () => {
    render(<Example />);
    const trigger = screen.getByRole('button', { name: 'Tour' });
    fireEvent.pointerDown(trigger, { pointerType: 'touch', clientX: 5, clientY: 5 });
    await advance(300);
    fireEvent.pointerUp(trigger, { pointerType: 'touch' });
    await advance(400);
    expect(screen.queryByRole('tooltip')).toBeNull();

    fireEvent.pointerDown(trigger, { pointerType: 'touch', clientX: 5, clientY: 5 });
    await advance(550);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.pointerUp(trigger, { pointerType: 'touch' });
    await advance(2400);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('ignores hover that comes from touch', async () => {
    render(<Example />);
    fireEvent.pointerEnter(screen.getByRole('button', { name: 'Tour' }), { pointerType: 'touch' });
    await advance(500);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('renders the bubble in the body with a placement attribute for the arrow', async () => {
    const user = setup();
    const { container } = render(<Example />);
    await user.tab();
    const tip = screen.getByRole('tooltip');
    expect(container).not.toContainElement(tip);
    expect(tip.parentElement).toBe(document.body);
    expect(tip).toHaveAttribute('data-placement');
  });

  it('renders only its child when there is no content', async () => {
    const user = setup();
    render(<Example content="" />);
    await user.tab();
    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(screen.getByRole('button', { name: 'Tour' })).not.toHaveAttribute('aria-describedby');
  });

  it('keeps the child handlers, and clicks on the bubble do not reach ancestors', async () => {
    const user = setup();
    const onClick = vi.fn();
    const onParentClick = vi.fn();
    render(
      <div onClick={onParentClick}>
        <Tooltip content="Open"><button type="button" onClick={onClick}>Go</button></Tooltip>
      </div>,
    );
    await user.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    onParentClick.mockClear();
    await user.tab({ shift: true });
    await user.tab();
    fireEvent.click(screen.getByRole('tooltip'));
    expect(onParentClick).not.toHaveBeenCalled();
  });
});
