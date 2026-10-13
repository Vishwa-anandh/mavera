import type { ReactNode } from 'react';
export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
export interface StatusTagProps { tone: StatusTone; children: ReactNode; }
export function StatusTag({ tone, children }: StatusTagProps) { return <span className={`mv-status mv-status--${tone}`}>{children}</span>; }
