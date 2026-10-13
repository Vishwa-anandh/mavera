import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataFreshness } from './DataFreshness';

describe('DataFreshness', () => {
  it('shows "Update time unavailable" when there is no timestamp', () => {
    render(<DataFreshness lastUpdated={null} />);
    expect(screen.getByText('Update time unavailable')).toBeInTheDocument();
  });

  it('shows a relative age for a recent timestamp', () => {
    const now = new Date('2026-09-26T12:00:00Z');
    const lastUpdated = new Date('2026-09-26T11:55:00Z');
    render(<DataFreshness lastUpdated={lastUpdated} now={now} />);
    expect(screen.getByText(/5 minutes ago/)).toBeInTheDocument();
  });

  it('marks data stale once it exceeds the configured threshold', () => {
    const now = new Date('2026-09-26T12:00:00Z');
    const lastUpdated = new Date('2026-09-26T10:00:00Z');
    render(<DataFreshness lastUpdated={lastUpdated} now={now} staleAfterMinutes={30} />);
    expect(screen.getByText(/^Stale/)).toBeInTheDocument();
  });

  it('does not mark data stale within the configured threshold', () => {
    const now = new Date('2026-09-26T12:00:00Z');
    const lastUpdated = new Date('2026-09-26T11:50:00Z');
    render(<DataFreshness lastUpdated={lastUpdated} now={now} staleAfterMinutes={30} />);
    expect(screen.queryByText(/^Stale/)).not.toBeInTheDocument();
  });
});
