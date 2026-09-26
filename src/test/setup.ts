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

// @rc-component/overflow (used internally by AntD's Menu in horizontal mode,
// e.g. ModuleNavigation) measures item widths on mount/unmount and batches
// those state updates through a real MessageChannel postMessage, which
// resolves on a later tick outside the synchronous act() scope that
// @testing-library/react's render() wraps around the commit. React has no
// way to see that update coming, since it is scheduled entirely outside
// React's own scheduler, so it logs "not wrapped in act(...)" even though no
// application code triggered it and no test assertion depends on it. This is
// a documented, benign interaction between @rc-component/overflow and jsdom
// test environments (not a bug in our components) — replacing the update
// with a synchronous one breaks @rc-component/overflow's own batching
// invariant (it assumes same-tick registrations are collected before the
// flush runs), so the only safe fix is to filter this exact console.error
// message. Every other console.error still surfaces normally.
const RC_OVERFLOW_ACT_WARNING = 'An update to %s inside a test was not wrapped in act';
const originalConsoleError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].includes(RC_OVERFLOW_ACT_WARNING)) {
    return;
  }
  originalConsoleError(...args);
};
