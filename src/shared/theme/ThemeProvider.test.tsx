import { describe, it, expect, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
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

describe('ThemeProvider system preference', () => {
  function Probe() {
    const { mode, preference, setPreference } = useMaveraTheme();
    return (
      <div>
        <span data-testid="mode">{mode}</span>
        <span data-testid="preference">{preference}</span>
        <button onClick={() => setPreference('system')}>system</button>
      </div>
    );
  }

  function mockOs(dark: boolean) {
    const listeners = new Set<(event: { matches: boolean }) => void>();
    window.matchMedia = ((query: string) => ({
      matches: dark && query.includes('dark'),
      media: query,
      addEventListener: (_: string, fn: (event: { matches: boolean }) => void) => listeners.add(fn),
      removeEventListener: (_: string, fn: (event: { matches: boolean }) => void) => listeners.delete(fn),
    })) as unknown as typeof window.matchMedia;
    return (next: boolean) => listeners.forEach((fn) => fn({ matches: next }));
  }

  it('follows the device while System is chosen, live, and stores the choice', async () => {
    localStorage.clear();
    const flipOs = mockOs(true);
    const user = userEvent.setup();
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByTestId('preference')).toHaveTextContent('system');
    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
    await user.click(screen.getByRole('button', { name: 'system' }));
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('system');
    act(() => flipOs(false));
    expect(screen.getByTestId('mode')).toHaveTextContent('light');
  });

  it('ignores the device once Light or Dark is chosen explicitly', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    mockOs(true);
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByTestId('preference')).toHaveTextContent('light');
    expect(screen.getByTestId('mode')).toHaveTextContent('light');
  });
});
