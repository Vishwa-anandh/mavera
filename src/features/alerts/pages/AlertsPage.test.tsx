import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { alertTarget } from '../model/alertTarget';
import { AlertsPage } from './AlertsPage';

vi.mock('../../workspace', () => ({ useConnectionStatus: () => ({ nothingConnected: false, firstStep: { label: 'Connect', path: '/' } }) }));

function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname}{search}</p>;
}

const renderPage = () => render(
  <MemoryRouter initialEntries={['/alerts']}>
    <Routes>
      <Route path="/alerts" element={<AlertsPage />} />
      <Route path="*" element={<Where />} />
    </Routes>
  </MemoryRouter>,
);

describe('alertTarget', () => {
  const base = { id: 'a', timestamp: 't', source: 's', summary: 'x', status: 'Open' as const };
  it('sends an SAP alert to SAP Alerts and a cloud alert to Smart Alerts, critical ones pre-filtered', () => {
    expect(alertTarget({ ...base, module: 'SAP', severity: 'critical' })).toBe('/sap/alerts');
    expect(alertTarget({ ...base, module: 'Cloud', severity: 'critical' })).toBe('/smart-alerts?status=critical');
    expect(alertTarget({ ...base, module: 'Cloud', severity: 'warning' })).toBe('/smart-alerts');
  });
});

describe('AlertsPage', () => {
  it('opens the real alerts list from a row: anywhere on the row, or from the alert text with the keyboard', async () => {
    const user = userEvent.setup();
    renderPage();
    const table = screen.getByRole('table');
    const first = within(table).getAllByRole('row')[1];
    const openers = within(table).getAllByRole('button');
    expect(openers.length).toBeGreaterThan(0);
    await user.click(within(first).getAllByRole('cell')[1]);
    expect(screen.getByTestId('where').textContent).toMatch(/^\/(sap\/alerts|smart-alerts)/);
  });

  it('opens from the keyboard', async () => {
    const user = userEvent.setup();
    renderPage();
    const opener = within(screen.getByRole('table')).getAllByRole('button')[0];
    opener.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('where').textContent).toMatch(/^\/(sap\/alerts|smart-alerts)/);
  });
});
