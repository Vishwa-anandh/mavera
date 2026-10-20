import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { HanaBackupEntry, HanaDiskPartition, HanaService } from '../../../data-access';
import { ThemeProvider } from '../../../shared/theme/ThemeProvider';
import { HanaCoreServicesPanel } from './HanaCoreServicesPanel';
import { HanaDiskUsagePanel } from './HanaDiskUsagePanel';
import { HanaBackupTimeline } from './HanaBackupTimeline';
import { SessionsCard } from './SessionsCard';
import { SyncStatus } from './SyncStatus';
import { HanaMonitoringPage } from '../pages/HanaMonitoringPage';

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return { ...actual, ResponsiveContainer: ({ children }: { children: ReactNode }) => <div style={{ width: 400, height: 220 }}>{children}</div> };
});

const wrap = (node: ReactNode, path = '/') => render(<ThemeProvider><MemoryRouter initialEntries={[path]}>{node}</MemoryRouter></ThemeProvider>);

const services: HanaService[] = [
  { name: 'hdbindexserver', status: 'running', memoryMb: 20480, allocatedMb: 30720, sharedMb: 2048 },
  { name: 'hdbdiserver', status: 'stopped', memoryMb: 0, allocatedMb: 0, sharedMb: 0 },
];

describe('HanaCoreServicesPanel', () => {
  it('shows the memory chart first, with totals, and a View data table', async () => {
    wrap(<HanaCoreServicesPanel services={services} />);
    expect(screen.getByText('1 of 2 running', { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /HANA memory by service/ })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Memory totals across services' })).toHaveTextContent('Heap used20.0 GB');
    await userEvent.click(screen.getByRole('button', { name: 'View data' }));
    const dialog = screen.getByRole('dialog', { name: 'HANA memory by service' });
    expect(within(dialog).getByText('hdbindexserver')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Close data table' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('switches to the list, stopped services first, and back', async () => {
    wrap(<HanaCoreServicesPanel services={services} />);
    const chart = screen.getByRole('button', { name: 'Chart' });
    expect(chart).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'List' }));
    expect(screen.queryByRole('img', { name: /memory by service/ })).not.toBeInTheDocument();
    const firstRow = screen.getAllByRole('row')[1];
    expect(within(firstRow).getByText('hdbdiserver')).toBeInTheDocument();
    expect(within(firstRow).getByText('Stopped')).toBeInTheDocument();
    await userEvent.click(chart);
    expect(screen.getByRole('img', { name: /memory by service/ })).toBeInTheDocument();
  });
});

const partitions: HanaDiskPartition[] = [
  { usage: 'DATA', usedGb: 100, freeGb: 100, totalGb: 200, host: 'sapgrc', path: '/hana/data/GRH/', mount: '/hana/data', device: '/dev/sdf' },
  { usage: 'TRACE', usedGb: 50, freeGb: 50, totalGb: 100, host: 'sapgrc', path: '/usr/sap/trace/', mount: '/hana/shared', device: '/dev/sdd' },
  { usage: 'LOG_BACKUP+CATALOG_BACKUP', usedGb: 50, freeGb: 50, totalGb: 100, host: 'sapgrc', path: '/usr/sap/log/', mount: '/hana/shared', device: '/dev/sdd' },
];

describe('HanaDiskUsagePanel', () => {
  it('shows the overall split once per device and every partition with host, path, mount and device', () => {
    wrap(<HanaDiskUsagePanel partitions={partitions} />);
    expect(screen.getByRole('img', { name: /HANA disk, used and free/ })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Overall disk capacity' })).toHaveTextContent('Utilization50%');
    expect(screen.getByText(/2 partitions share \/dev\/sdd/)).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Partition details' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(within(list).getByText('Log backup + catalog backup')).toBeInTheDocument();
    expect(within(list).getAllByText('/dev/sdd')).toHaveLength(2);
    expect(within(list).getByText('/hana/data/GRH/')).toBeInTheDocument();
  });

  it('switches from the donut to per-partition bars', async () => {
    wrap(<HanaDiskUsagePanel partitions={partitions} />);
    await userEvent.click(screen.getByRole('button', { name: 'Bar' }));
    expect(screen.queryByRole('img', { name: /HANA disk/ })).not.toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Disk utilization by partition' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bar' })).toHaveAttribute('aria-pressed', 'true');
  });
});

const backups: HanaBackupEntry[] = [
  { id: 'd1', kind: 'Data backup', status: 'success', startedAt: '2026-10-16 01:30:00', durationSec: 530, sizeGb: 161.9 },
  { id: 'd0', kind: 'Data backup', status: 'warning', startedAt: '2026-10-14 01:30:00', durationSec: 1140, sizeGb: 161.0, message: 'Slow run.' },
  { id: 'l1', kind: 'Log backup', status: 'failed', startedAt: '2026-10-09 13:41:00', durationSec: 60, sizeGb: 0, message: 'I/O timeout.' },
  { id: 'c1', kind: 'Catalog backup', status: 'success', startedAt: '2026-10-16 01:40:00', durationSec: 4, sizeGb: 0.02 },
];

describe('HanaBackupTimeline', () => {
  it('leads with the last successful backup and flags the warning and the failure', () => {
    wrap(<HanaBackupTimeline backups={backups} />);
    const findings = screen.getByRole('list', { name: 'Backup findings' });
    expect(within(findings).getByText('Last successful data backup: 16 Oct 01:30')).toBeInTheDocument();
    expect(within(findings).getByText(/Data backup completed with a warning on 14 Oct/)).toBeInTheDocument();
    expect(within(findings).getByText(/Log backup failed on 9 Oct/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Data backup lane: 2 backups in 14 days, 1 successful/ })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Legend' })).toHaveTextContent('SuccessWarningFailed');
  });

  it('narrows to 7 days, dropping the older failure', async () => {
    wrap(<HanaBackupTimeline backups={backups} />);
    await userEvent.click(screen.getByRole('button', { name: '7 days' }));
    expect(screen.queryByText(/Log backup failed/)).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Backups in the last 7 days' })).toBeInTheDocument();
  });

  it('lists every backup with time, duration, size and status in View data', async () => {
    wrap(<HanaBackupTimeline backups={backups} />);
    await userEvent.click(screen.getByRole('button', { name: 'View data' }));
    const dialog = screen.getByRole('dialog', { name: 'HANA backups, last 14 days' });
    const rows = within(dialog).getAllByRole('row');
    expect(rows).toHaveLength(5);
    expect(within(rows[1]).getByText('16 Oct 01:40')).toBeInTheDocument();
    expect(within(dialog).getByText('8m 50s')).toBeInTheDocument();
    expect(within(dialog).getByText('Failed')).toBeInTheDocument();
  });

  it('says there is no clean backup when none succeeded', () => {
    wrap(<HanaBackupTimeline backups={[backups[2]]} />);
    expect(screen.getByText('No successful data backup in this window')).toBeInTheDocument();
  });
});

describe('SessionsCard', () => {
  it('shows the live count, unique users and one initial per user', () => {
    render(<SessionsCard sessions={{ active: 3, uniqueUsers: 1, byUser: [{ user: 'SYSTEM', sessions: 3 }] }} />);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/1 unique user$/)).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Users with sessions' })).toHaveTextContent('SYSTEM, 3 sessions');
  });

  it('collapses past four users into "+n"', () => {
    const byUser = ['A', 'B', 'C', 'D', 'E', 'F'].map((user) => ({ user, sessions: 1 }));
    render(<SessionsCard sessions={{ active: 6, uniqueUsers: 6, byUser }} />);
    expect(screen.getByText('+2')).toBeInTheDocument();
  });
});

describe('SyncStatus and the HANA page countdown', () => {
  it('counts down once a second, restarts after Refresh and stops on unmount', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const { unmount } = wrap(<HanaMonitoringPage />);
      const timer = screen.getByRole('timer');
      expect(timer).toHaveTextContent('29:00');
      expect(timer).toHaveAccessibleName('Next sync in 29 minutes');
      act(() => { vi.advanceTimersByTime(3000); });
      expect(screen.getByRole('timer')).toHaveTextContent('28:57');
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      await user.click(screen.getByRole('button', { name: 'Refresh' }));
      expect(screen.getByRole('timer')).toHaveTextContent('30:00');
      unmount();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows the last fetched time and announces a fetch politely', () => {
    render(<SyncStatus lastFetched="15:50:33" initialSec={90} intervalSec={300} restartToken={0} onAutoSync={() => {}} />);
    expect(screen.getByText('15:50:33')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Data fetched at 15:50:33.');
    expect(screen.getByRole('timer')).toHaveTextContent('1:30');
  });
});

describe('HanaMonitoringPage tabs', () => {
  it('has three tabs, keeps the host line, KPI strip and sessions above them, and renders only the active panel', () => {
    wrap(<HanaMonitoringPage />);
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Vitals', 'Services and disk', 'Backups']);
    expect(screen.getByRole('tab', { name: 'Vitals' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
    expect(screen.getByText('Sessions')).toBeInTheDocument();
    expect(screen.getByRole('timer')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Last 24 hours' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'System Vitals Timeline' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Memory composition' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Active Core Services' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Backup Timeline' })).not.toBeInTheDocument();
  });

  it('opens the tab named in the URL hash', () => {
    const { unmount } = wrap(<HanaMonitoringPage />, '/#storage');
    expect(screen.getByRole('tab', { name: 'Services and disk' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { name: 'Active Core Services' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Disk Usage' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Last 24 hours' })).not.toBeInTheDocument();
    unmount();
    wrap(<HanaMonitoringPage />, '/#backups');
    expect(screen.getByRole('heading', { name: 'Backup Timeline' })).toBeInTheDocument();
    expect(screen.getByText(/Last successful data backup:/)).toBeInTheDocument();
  });

  it('keeps the Chart/List and Donut/Bar switches working inside their panel (they are not tabs)', async () => {
    wrap(<HanaMonitoringPage />, '/#storage');
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    await userEvent.click(screen.getByRole('button', { name: 'List' }));
    expect(screen.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Bar' }));
    expect(screen.getByRole('button', { name: 'Bar' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
  });

  it('switches tabs with a click', async () => {
    wrap(<HanaMonitoringPage />);
    await userEvent.click(screen.getByRole('tab', { name: 'Backups' }));
    expect(screen.getByRole('heading', { name: 'Backup Timeline' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'System Vitals Timeline' })).not.toBeInTheDocument();
  });
});
