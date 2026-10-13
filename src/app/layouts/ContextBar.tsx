import type { ReactNode } from 'react';

export function ContextBar({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <div className="mv-context-bar">{children}</div>;
}
