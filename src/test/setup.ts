import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';

// Several contexts (auth tokens, billing data) persist to localStorage so
// state survives a real page reload between separate logins/sessions.
// Without this, state written by one test leaks into the next test in the
// same file (jsdom's window/localStorage isn't reset between tests).
afterEach(() => {
  localStorage.clear();
});

// lottie-web's full build (which every lottie-react wrapper component pulls
// in, regardless of which one you import) probes canvas support at module
// load time — `document.createElement('canvas').getContext('2d')` — which
// jsdom doesn't implement without the native `canvas` npm package. That's a
// real native dependency with no upside for a unit test (verifying that an
// animation visually plays belongs in a browser, not jsdom), so every
// lottie-react component is stubbed out here instead: it renders nothing and
// hands back a no-op imperative handle, so code that calls
// `lottieRef.current?.play()` etc. (see AnimatedIcon.tsx) doesn't throw.
vi.mock('lottie-react', () => {
  const noop = () => {};
  const handle = {
    play: noop,
    pause: noop,
    stop: noop,
    seek: noop,
    playSegments: noop,
    resetSegments: noop,
    setSpeed: noop,
    setDirection: noop,
    reload: noop,
    animationItem: null,
  };
  const StubLottie = ({ lottieRef }: { lottieRef?: { current: unknown } | ((instance: unknown) => void) }) => {
    if (typeof lottieRef === 'function') lottieRef(handle);
    else if (lottieRef) lottieRef.current = handle;
    return null;
  };
  return { Lottie: StubLottie, LottieSvg: StubLottie, LottieLight: StubLottie, LottieDisplay: () => null };
});

// jsdom does not implement ResizeObserver, which AntD's Menu (and other
// components built on @rc-component/resize-observer) requires at mount time.
// Polyfill it globally so any component tree using those components can
// render in tests without every test file re-declaring this stub.
if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverPolyfill {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverPolyfill as unknown as typeof ResizeObserver;
}

// jsdom does not implement window.matchMedia. AntD's Avatar calls
// useBreakpoint() unconditionally on mount for its responsive sizing (and
// Grid, Descriptions, List, Table, Pagination, Steps, and Modal consume the
// same breakpoint observer), so any of these subscribes to matchMedia at
// mount time. Polyfill it globally, following the same rationale as the
// ResizeObserver polyfill above. Note: `matches` always resolves false here,
// so a test asserting breakpoint-true behavior (e.g. screens.sm/md) will
// need to override window.matchMedia locally in that test file.
if (typeof window.matchMedia === 'undefined') {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// jsdom has no 2D canvas context and logs "Not implemented" when one is requested.
// Decorative canvases (the sign-in dot grid) bail out on a null context, so return
// null quietly instead of printing noise into every test that renders them.
HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext'];
