import type { CSSProperties } from 'react';

/**
 * Lets a CSS custom property (e.g. --mv-cols) be set via a component's
 * style prop without an inline `as CSSProperties` cast at every call site —
 * React's CSSProperties type doesn't include arbitrary custom properties.
 */
export function cssVars(vars: Record<string, string | number>): CSSProperties {
  return vars as CSSProperties;
}
