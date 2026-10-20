import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { formatCountdown, spokenCountdown, useSyncCountdown } from './useSyncCountdown';

afterEach(() => vi.useRealTimers());

describe('countdown text', () => {
  it('formats mm:ss and a spoken form', () => {
    expect(formatCountdown(0)).toBe('0:00');
    expect(formatCountdown(1745)).toBe('29:05');
    expect(spokenCountdown(1745)).toBe('29 minutes 5 seconds');
    expect(spokenCountdown(60)).toBe('1 minute');
    expect(spokenCountdown(1)).toBe('1 second');
  });
});

describe('useSyncCountdown', () => {
  it('counts down each second, restarts on demand and fires onElapsed when it reaches zero', () => {
    vi.useFakeTimers();
    const onElapsed = vi.fn();
    const { result } = renderHook(() => useSyncCountdown(3, 10, onElapsed));
    expect(result.current.remaining).toBe(3);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.remaining).toBe(2);
    act(() => { result.current.restart(); });
    expect(result.current.remaining).toBe(10);
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(onElapsed).toHaveBeenCalledTimes(1);
    expect(result.current.remaining).toBe(10);
  });

  it('clears its single interval on unmount', () => {
    vi.useFakeTimers();
    const { unmount } = renderHook(() => useSyncCountdown(5, 5));
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
