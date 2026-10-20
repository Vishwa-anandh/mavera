import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { auditRepository } from '../../../data-access';
import { AuditTrailPage } from './AuditTrailPage';
import { recordAuditEvent } from '../model/recordAuditEvent';

const downloadCsv = vi.fn();
vi.mock('../../../shared/lib/csv', () => ({ downloadCsv: (...args: unknown[]) => downloadCsv(...args), toCsv: vi.fn() }));

function setup() {
  render(<MemoryRouter><AuditTrailPage /></MemoryRouter>);
  return userEvent.setup();
}

beforeEach(() => {
  auditRepository.reset();
  downloadCsv.mockClear();
});
afterEach(() => vi.useRealTimers());

describe('AuditTrailPage', () => {
  it('shows a day-grouped timeline with who, what, module and result', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Audit Trail' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Today/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /View details: Alert resolved/ })).toBeInTheDocument();
    expect(screen.getAllByText('Success').length).toBeGreaterThan(3);
  });

  it('filters by actor type, with an empty state that can be cleared', async () => {
    const user = setup();
    await user.click(screen.getByRole('radio', { name: 'Member' }));
    expect(screen.queryByRole('button', { name: /View details: Role changed, marcus/ })).toBeNull();
    expect(screen.getByRole('radio', { name: 'Member' })).toHaveAttribute('aria-checked', 'true');
    await user.type(screen.getByRole('searchbox', { name: 'Search signatures' }), 'zzz-no-match');
    expect(screen.getByText(/No records for/)).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Clear filters' })[0]);
    expect(screen.getByRole('button', { name: /View details: Alert resolved/ })).toBeInTheDocument();
  });

  it('searches across every field', async () => {
    const user = setup();
    await user.type(screen.getByRole('searchbox', { name: 'Search signatures' }), 'budget aws');
    expect(screen.getByRole('button', { name: /View details: Budget created, AWS production/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /View details: Alert resolved/ })).toBeNull();
  });

  it('opens an event with before and after values for a role change', async () => {
    const user = setup();
    await user.type(screen.getByRole('searchbox', { name: 'Search signatures' }), 'marcus.chen');
    await user.click(screen.getByRole('button', { name: /View details: Role changed, marcus.chen@maitsys.com/ }));
    const drawer = screen.getByRole('dialog');
    expect(within(drawer).getByRole('heading', { name: 'Role changed' })).toBeInTheDocument();
    expect(within(drawer).getByRole('table', { name: /before and after/ })).toBeInTheDocument();
    expect(within(drawer).getByText('Viewer')).toBeInTheDocument();
    expect(within(drawer).getByText('Analyst')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('exports exactly the filtered events as CSV and records that it did', async () => {
    const user = setup();
    await user.click(screen.getByRole('radio', { name: 'Admin' }));
    await user.click(screen.getByRole('button', { name: /Export CSV/ }));
    expect(downloadCsv).toHaveBeenCalledTimes(1);
    const [filename, header, rows] = downloadCsv.mock.calls[0] as [string, string[], string[][]];
    expect(filename).toMatch(/^mavera-audit-trail-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(header).toContain('Actor');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row[3] === 'Admin')).toBe(true);
    expect(auditRepository.getSnapshot()[0].action).toBe('Audit trail exported');
  });

  it('re-syncs the feed: a busy state, then new events arrive', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<MemoryRouter><AuditTrailPage /></MemoryRouter>);
    const before = auditRepository.getSnapshot().length;
    await user.click(screen.getByRole('button', { name: 'Manual re-sync' }));
    expect(screen.getByRole('button', { name: /Re-syncing/ })).toBeDisabled();
    await act(async () => { vi.advanceTimersByTime(800); });
    expect(auditRepository.getSnapshot().length).toBe(before + 2);
    expect(screen.getByRole('button', { name: 'Manual re-sync' })).toBeEnabled();
  });

  it('shows events recorded by other features straight away', () => {
    setup();
    act(() => {
      recordAuditEvent({ action: 'Budget created', target: 'Azure dev · $900 / month', module: 'Budgets' });
    });
    expect(screen.getByRole('button', { name: /View details: Budget created, Azure dev/ })).toBeInTheDocument();
  });

  it('pages the feed', async () => {
    const user = setup();
    expect(screen.getByText(/Showing/)).toHaveTextContent('1–25 of 28');
    await user.click(screen.getByRole('button', { name: 'Page 2' }));
    expect(screen.getByText(/Showing/)).toHaveTextContent('26–28 of 28');
  });
});
