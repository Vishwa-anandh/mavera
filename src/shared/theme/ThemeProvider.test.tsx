import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useMaveraTheme } from './ThemeProvider';
import { THEME_STORAGE_KEY } from './resolveInitialTheme';

function Consumer() {
  const { mode, setMode, toggleMode } = useMaveraTheme();
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <button onClick={() => setMode('dark')}>set dark</button>
      <button onClick={toggleMode}>toggle</button>
    </div>
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to light mode when storage is empty', () => {
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('mode')).toHaveTextContent('light');
  });

  it('falls back to the default when storage holds an unrecognized value', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'blue');
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('mode')).toHaveTextContent('light');
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
});
