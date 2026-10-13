import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContextBar } from './ContextBar';

describe('ContextBar', () => {
  it('renders nothing when there are no controls to show', () => {
    const { container } = render(<ContextBar />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders its children when given scope controls', () => {
    render(
      <ContextBar>
        <span>Last 24 hours</span>
      </ContextBar>,
    );
    expect(screen.getByText('Last 24 hours')).toBeInTheDocument();
  });
});
