import type { ReactNode } from 'react';

export function ContextBar({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>{children}</div>;
}
