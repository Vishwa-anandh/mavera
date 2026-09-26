import '@testing-library/jest-dom/vitest';

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
