import type { ReactNode } from 'react';
export interface EmptyStateProps { icon: ReactNode; heading: string; explanation: string; actionLabel?: string; onAction?: () => void; }
export function EmptyState({ icon, heading, explanation, actionLabel, onAction }: EmptyStateProps) { return <section className="mv-empty" role="status"><div className="mv-empty-icon" aria-hidden>{icon}</div><h2>{heading}</h2><p>{explanation}</p>{actionLabel && onAction && <button className="mv-primary-button" onClick={onAction}>{actionLabel}</button>}</section>; }
