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

// jsdom does not implement window.matchMedia, which AntD's responsive
// breakpoint observer (used internally by Dropdown, Grid, and other
// components) subscribes to at mount time. Polyfill it globally, following
// the same rationale as the ResizeObserver polyfill above.
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
