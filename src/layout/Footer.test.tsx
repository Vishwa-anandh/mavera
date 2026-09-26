import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from './Footer';

describe('Footer', () => {
  it('renders the required Powered by Maitsys attribution', () => {
    render(<Footer />);
    expect(screen.getByText('Powered by Maitsys')).toBeInTheDocument();
  });
});
