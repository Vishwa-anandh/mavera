import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageSkeleton } from './PageSkeleton';

describe('PageSkeleton', () => {
  it.each(['default', 'dashboard', 'table'] as const)('announces itself as a busy loading region (%s)', (variant) => {
    render(<PageSkeleton variant={variant} />);
    const region = screen.getAllByRole('status', { name: 'Loading page' })[0];
    expect(region).toHaveAttribute('aria-busy', 'true');
  });

  it('uses a custom label', () => {
    render(<PageSkeleton label="Loading invoices" />);
    expect(screen.getByRole('status', { name: 'Loading invoices' })).toBeInTheDocument();
  });
});
