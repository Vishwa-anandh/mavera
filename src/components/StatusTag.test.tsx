import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '../theme/ThemeProvider';
import { StatusTag } from './StatusTag';

describe('StatusTag', () => {
  it('renders its label text', () => {
    render(
      <ThemeProvider>
        <StatusTag tone="success">Subscribed</StatusTag>
      </ThemeProvider>,
    );
    expect(screen.getByText('Subscribed')).toBeInTheDocument();
  });

  it('applies the semantic color to text, not as a solid fill', () => {
    render(
      <ThemeProvider>
        <StatusTag tone="danger">Critical</StatusTag>
      </ThemeProvider>,
    );
    const tag = screen.getByText('Critical').closest('.ant-tag') as HTMLElement;
    const computedStyle = window.getComputedStyle(tag);
    expect(computedStyle.color).toBe('rgb(180, 35, 24)');
    expect(computedStyle.backgroundColor).toBe('rgb(241, 243, 245)');
  });
});
