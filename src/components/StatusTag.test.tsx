import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '../theme/ThemeProvider';
import { StatusTag } from './StatusTag';
import { lightColors } from '../theme/tokens';

// Convert hex color to rgb() string format
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgb(${r}, ${g}, ${b})`;
}

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
    expect(computedStyle.color).toBe(hexToRgb(lightColors.danger));
    expect(computedStyle.backgroundColor).toBe(hexToRgb(lightColors.surfaceSubtle));
  });
});
