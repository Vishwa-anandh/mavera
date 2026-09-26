import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useMaveraTheme } from './ThemeProvider';
import { THEME_STORAGE_KEY, DENSITY_STORAGE_KEY } from './resolveInitialTheme';

function Consumer() {
  const { mode, density, setMode, toggleMode, setDensity } = useMaveraTheme();
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="density">{density}</span>
      <button onClick={() => setMode('dark')}>set dark</button>
      <button onClick={toggleMode}>toggle</button>
      <button onClick={() => setDensity('compact')}>set compact</button>
    </div>
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to light mode and comfortable density when storage is empty', () => {
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('mode')).toHaveTextContent('light');
    expect(screen.getByTestId('density')).toHaveTextContent('comfortable');
  });

  it('falls back to defaults when storage holds an unrecognized value', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'blue');
    localStorage.setItem(DENSITY_STORAGE_KEY, 'roomy');
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('mode')).toHaveTextContent('light');
    expect(screen.getByTestId('density')).toHaveTextContent('comfortable');
  });

  it('persists an explicit mode change to localStorage and updates context', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );
    await user.click(screen.getByText('set dark'));
    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('toggleMode flips between light and dark', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );
    await user.click(screen.getByText('toggle'));
    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
    await user.click(screen.getByText('toggle'));
    expect(screen.getByTestId('mode')).toHaveTextContent('light');
  });

  it('persists density independently of mode', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );
    await user.click(screen.getByText('set compact'));
    expect(screen.getByTestId('density')).toHaveTextContent('compact');
    expect(localStorage.getItem(DENSITY_STORAGE_KEY)).toBe('compact');
  });
});
