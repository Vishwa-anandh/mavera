import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthCarousel } from './AuthCarousel';

describe('AuthCarousel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the first slide initially', () => {
    render(<AuthCarousel />);
    expect(screen.getByText('See spend across every cloud in one place')).toBeInTheDocument();
  });

  it('advances to the next slide every 5 seconds', () => {
    render(<AuthCarousel />);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText('Stay ahead of risk with continuous monitoring')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText('Ask your cost data questions in plain English')).toBeInTheDocument();
  });

  it('loops back to the first slide after the last one', () => {
    render(<AuthCarousel />);
    act(() => {
      vi.advanceTimersByTime(15000);
    });
    expect(screen.getByText('See spend across every cloud in one place')).toBeInTheDocument();
  });
});
