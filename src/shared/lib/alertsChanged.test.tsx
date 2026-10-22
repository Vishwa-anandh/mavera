import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { notifyAlertsChanged, useAlertsVersion } from './alertsChanged';

function Probe() {
  return <p data-testid="v">{useAlertsVersion()}</p>;
}

describe('alertsChanged', () => {
  it('moves the version for every mounted reader each time an alert changes', () => {
    render(<><Probe /><Probe /></>);
    const before = Number(screen.getAllByTestId('v')[0].textContent);
    act(() => notifyAlertsChanged());
    const after = screen.getAllByTestId('v').map((node) => Number(node.textContent));
    expect(after).toEqual([before + 1, before + 1]);
  });
});
