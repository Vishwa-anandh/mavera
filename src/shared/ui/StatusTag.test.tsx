import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusTag } from './StatusTag';

describe('StatusTag', () => {
  it('renders its label text', () => {
    render(<StatusTag tone="success">Subscribed</StatusTag>);
    expect(screen.getByText('Subscribed')).toBeInTheDocument();
  });

  it('applies the tone via a semantic class rather than an inline solid fill', () => {
    render(<StatusTag tone="danger">Critical</StatusTag>);
    const tag = screen.getByText('Critical');
    expect(tag).toHaveClass('mv-status', 'mv-status--danger');
    // Semantic coloring lives in app.css (`.mv-status--danger { color: var(--mv-danger) }`),
    // not as an inline style — this component must never set color/background
    // directly, which would bypass the shared token system.
    expect(tag).not.toHaveAttribute('style');
  });
});
