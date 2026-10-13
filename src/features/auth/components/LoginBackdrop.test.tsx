import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { LoginBackdrop } from './LoginBackdrop';

describe('LoginBackdrop', () => {
  it('renders as a decorative, assistive-tech-hidden dot-grid canvas', () => {
    const { container } = render(<LoginBackdrop />);
    const root = container.querySelector('.mv-login-backdrop');
    expect(root).toBeInTheDocument();
    expect(root).toHaveAttribute('aria-hidden', 'true');
    expect(root?.querySelector('canvas.mv-login-dots')).toBeInTheDocument();
    expect(container.textContent).toBe('');
  });

  it('cleans up its listeners on unmount', () => {
    const { unmount } = render(<LoginBackdrop />);
    expect(() => unmount()).not.toThrow();
  });
});
