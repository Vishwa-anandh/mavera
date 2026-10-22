import { createContext, useContext } from 'react';

/**
 * Whether the page being viewed has a guided tour. The app shell knows the route and the assistant owns the tours, so
 * the shell provides this flag and every page header reads it here without importing the assistant (features never
 * import each other's internals).
 */
const PageTourContext = createContext(false);

export const PageTourProvider = PageTourContext.Provider;

export function usePageHasTour(): boolean {
  return useContext(PageTourContext);
}
