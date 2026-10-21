import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render, renderHook, screen } from '@testing-library/react';
import { INTRO_MAX_MS, useAssistantIntro } from './useAssistantIntro';

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

function setReducedMotion(reduced: boolean) {
  window.matchMedia = ((query: string) => ({ matches: reduced && query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
}

describe('useAssistantIntro', () => {
  it('plays for someone who has never seen it, then not again', () => {
    setReducedMotion(false);
    const first = renderHook(() => useAssistantIntro('user-1'));
    expect(first.result.current.playing).toBe(true);
    first.unmount();

    const second = renderHook(() => useAssistantIntro('user-1'));
    expect(second.result.current.playing).toBe(false);
  });

  it('plays once per person, so a different person still gets the welcome', () => {
    setReducedMotion(false);
    renderHook(() => useAssistantIntro('user-1')).unmount();
    expect(renderHook(() => useAssistantIntro('user-2')).result.current.playing).toBe(true);
  });

  it('does not play without a signed-in user', () => {
    setReducedMotion(false);
    expect(renderHook(() => useAssistantIntro(undefined)).result.current.playing).toBe(false);
  });

  it('never plays for someone who prefers reduced motion, and counts it as seen', () => {
    setReducedMotion(true);
    expect(renderHook(() => useAssistantIntro('user-1')).result.current.playing).toBe(false);
    setReducedMotion(false);
    expect(renderHook(() => useAssistantIntro('user-1')).result.current.playing).toBe(false);
  });

  it('ends when finished, and is cut off after the maximum time', () => {
    setReducedMotion(false);
    const { result } = renderHook(() => useAssistantIntro('user-1'));
    expect(result.current.playing).toBe(true);
    act(() => result.current.finish());
    expect(result.current.playing).toBe(false);

    window.localStorage.clear();
    const slow = renderHook(() => useAssistantIntro('user-9'));
    expect(slow.result.current.playing).toBe(true);
    act(() => { vi.advanceTimersByTime(INTRO_MAX_MS + 10); });
    expect(slow.result.current.playing).toBe(false);
  });

  it('still works when browser storage is unavailable', () => {
    setReducedMotion(false);
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(renderHook(() => useAssistantIntro('user-1')).result.current.playing).toBe(true);
    spy.mockRestore();
  });
});

describe('welcome greeting', () => {
  it('is announced politely while it plays', () => {
    setReducedMotion(false);
    function Probe() {
      const { playing } = useAssistantIntro('user-1');
      return playing ? <p role="status">Hi there</p> : null;
    }
    render(<Probe />);
    expect(screen.getByRole('status')).toHaveTextContent('Hi there');
  });
});
