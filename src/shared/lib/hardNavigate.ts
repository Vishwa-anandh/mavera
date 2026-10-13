/**
 * Full-page navigation (reloads the app). Used where the in-memory router is
 * not enough because app-level state must be rebuilt from scratch — e.g.
 * after a renewed subscription, AuthProvider's mount effect has to run again.
 * Isolated in its own module so tests can mock it (jsdom cannot navigate).
 */
export function hardNavigate(path: string): void {
  window.location.href = path;
}
