import { describe, it, expect } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { AssistantLauncherFace } from './AssistantLauncherFace';

describe('AssistantLauncherFace', () => {
  it('renders a decorative face with two eyes, hidden from assistive technology', () => {
    const { container } = render(<AssistantLauncherFace />);
    const face = container.querySelector('.mv-bot-face');
    expect(face).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelectorAll('.mv-bot-eye')).toHaveLength(2);
  });

  it('accepts a size modifier class', () => {
    const { container } = render(<AssistantLauncherFace className="mv-bot-face--sm" />);
    expect(container.querySelector('.mv-bot-face')).toHaveClass('mv-bot-face--sm');
  });

  it('cleans up its pointer listener on unmount', () => {
    const { unmount } = render(<AssistantLauncherFace />);
    unmount();
    expect(() => fireEvent.pointerMove(window, { clientX: 10, clientY: 10 })).not.toThrow();
  });
});
