import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { SapDbCallStatistics, SapDump, SapJob, SapWorkProcess } from '../../../data-access';
import { ThemeProvider } from '../../../shared/theme/ThemeProvider';
import { AbapRuntimeErrorsCard } from './AbapRuntimeErrorsCard';
import { BackgroundJobsPanel } from './BackgroundJobsPanel';
import { BackgroundJobsSummaryCard } from './BackgroundJobsSummaryCard';
import { DbCallStatsCard } from './DbCallStatsCard';
import { MiniChart } from './MiniChart';
import { QueueIndicators } from './QueueIndicators';
import { WorkProcessesPanel } from './WorkProcessesPanel';
import { SapPerformancePage } from '../pages/SapPerformancePage';
import { SapJobsPage } from '../pages/SapJobsPage';

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return { ...actual, ResponsiveContainer: ({ children }: { children: ReactNode }) => <div style={{ width: 400, height: 220 }}>{children}</div> };
});

const wrap = (node: ReactNode, path = '/') => render(<ThemeProvider><MemoryRouter initialEntries={[path]}>{node}</MemoryRouter></ThemeProvider>);

describe('AbapRuntimeErrorsCard', () => {
  it('says the system is running clean when there are no runtime errors', () => {
    wrap(<AbapRuntimeErrorsCard errors={[]} />);
    expect(screen.getByRole('heading', { name: /ABAP Runtime Errors/ })).toHaveTextContent('ST22');
    expect(screen.getByRole('status')).toHaveTextContent('No runtime errors, system is running clean');
  });

  it('lists the errors when there are some', () => {
    const errors: SapDump[] = [{ id: 'd1', program: 'ZFI_REPORT', errorType: 'TSV_TNEW_PAGE_ALLOC_FAILED', occurredAt: '2026-10-16 09:12:00', user: 'ANBARASU' }];
    wrap(<AbapRuntimeErrorsCard errors={errors} />);
    expect(screen.queryByText(/running clean/)).not.toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'ABAP runtime errors' });
    expect(within(list).getByText('ZFI_REPORT')).toBeInTheDocument();
    expect(screen.getByText('1 runtime error in the selected period')).toBeInTheDocument();
  });
});

describe('DbCallStatsCard', () => {
  const stats: SapDbCallStatistics = {
    bufferHitRatioPercent: 98.6, totalCalls: 1200, avgCallMs: 1.8,
    buffers: [{ buffer: 'Nametab (NTAB)', hitRatioPercent: 99.3, calls: 800, swaps: 0 }, { buffer: 'Screen', hitRatioPercent: 96.1, calls: 400, swaps: 2 }],
  };
  it('shows the buffer hit ratio and the per-buffer table', () => {
    wrap(<DbCallStatsCard stats={stats} />);
    expect(screen.getByRole('heading', { name: /DB Call Statistics/ })).toHaveTextContent('ST02');
    expect(screen.getByRole('group', { name: 'Buffer and call totals' })).toHaveTextContent('Buffer hit ratio98.6%');
    expect(screen.getAllByRole('row')).toHaveLength(3);
  });
  it('shows "No call statistics" without data', () => {
    wrap(<DbCallStatsCard stats={null} />);
    expect(screen.getByText('No call statistics')).toBeInTheDocument();
  });
});

describe('QueueIndicators', () => {
  it('shows idle, working and waiting queues', () => {
    wrap(<QueueIndicators queues={{ upd: { workers: 2, busy: 0, queued: 0 }, enq: { workers: 1, busy: 1, queued: 3 } }} />);
    const list = screen.getByRole('list', { name: 'Update and enqueue queues' });
    const [upd, enq] = within(list).getAllByRole('listitem');
    expect(upd).toHaveTextContent('0 of 2 processes busy · 0 queued');
    expect(within(upd).getByText('Idle')).toBeInTheDocument();
    expect(within(enq).getByText('3 waiting')).toBeInTheDocument();
  });
});

describe('MiniChart', () => {
  it('names the chart, summarises it and opens its data table', async () => {
    wrap(<MiniChart title="Buffer Hit" kind="area" summary="Now 98.6%" valueLabel="Hit ratio" timeLabel="Hour" format={(v) => `${v}%`} data={[{ time: '14:00', value: 98 }, { time: '15:00', value: 99 }]} />);
    expect(screen.getByRole('img', { name: 'Buffer Hit. Now 98.6%' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'View data' }));
    const dialog = screen.getByRole('dialog', { name: 'Buffer Hit' });
    expect(within(dialog).getByText('99%')).toBeInTheDocument();
  });
  it('says so when there is nothing to plot', () => {
    wrap(<MiniChart title="Dump Timeline" kind="bar" summary="" valueLabel="Dumps" timeLabel="Day" data={[]} />);
    expect(screen.getByText('No data available for this period.')).toBeInTheDocument();
  });
});

describe('WorkProcessesPanel', () => {
  const wp = (no: number, type: SapWorkProcess['type'], status: SapWorkProcess['status'] = 'Waiting'): SapWorkProcess => ({ no, type, pid: 1000 + no, status, restart: true, report: null, user: null });
  it('filters the table by process type', async () => {
    wrap(<WorkProcessesPanel system="sapgrc_GRC_00" processes={[wp(0, 'DIA', 'Running'), wp(1, 'DIA'), wp(2, 'BTC')]} />);
    expect(screen.getByText(/1 running · 2 waiting · 0 stopped/)).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(4);
    await userEvent.click(screen.getByRole('button', { name: 'BTC' }));
    expect(screen.getAllByRole('row')).toHaveLength(2);
  });
});

const job = (i: number, status: SapJob['status'] = 'Finished', name = `JOB_${String(i).padStart(2, '0')}`): SapJob => ({
  name, status, startedAt: `2026-10-16 10:${String(i).padStart(2, '0')}:00`, finishedAt: null, durationSec: 4, user: i % 2 ? 'DDIC' : 'PRASHANTH', client: '200',
});
const twenty = [...Array.from({ length: 18 }, (_, i) => job(i)), job(18, 'Running', 'ZRUNNING'), job(19, 'Scheduled', 'ZLATER')];

describe('BackgroundJobsPanel', () => {
  it('shows status chips with counts, 15 rows and a Show more button', async () => {
    wrap(<BackgroundJobsPanel jobs={twenty} onOpenJob={() => {}} />);
    const chips = screen.getByRole('group', { name: 'Filter jobs by status' });
    expect(within(chips).getByRole('button', { name: 'All 20' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(chips).getByRole('button', { name: 'Running 1' })).toBeInTheDocument();
    expect(within(chips).getByRole('button', { name: 'Finished 18' })).toBeInTheDocument();
    expect(within(chips).getByRole('button', { name: 'Aborted 0' })).toBeInTheDocument();
    expect(within(chips).getByRole('button', { name: 'Scheduled 1' })).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(16);
    expect(screen.getByText('Showing 15 of 20')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Show more (5 remaining)' }));
    expect(screen.getAllByRole('row')).toHaveLength(21);
    expect(screen.queryByRole('button', { name: /Show more/ })).not.toBeInTheDocument();
  });

  it('filters by chip and search, and offers a way back from an empty result', async () => {
    wrap(<BackgroundJobsPanel jobs={twenty} onOpenJob={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Running 1' }));
    expect(screen.getAllByRole('row')).toHaveLength(2);
    expect(screen.getByText('ZRUNNING')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'All 20' }));
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search jobs' }), 'zlater');
    expect(screen.getAllByRole('row')).toHaveLength(2);
    await userEvent.clear(screen.getByRole('searchbox', { name: 'Search jobs' }));
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search jobs' }), 'nothing-like-this');
    expect(screen.getByText('No jobs match')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getAllByRole('row')).toHaveLength(16);
  });

  it('starts on the status it is given and reports the clicked job', async () => {
    const onOpenJob = vi.fn();
    wrap(<BackgroundJobsPanel jobs={twenty} initialFilter="Scheduled" onOpenJob={onOpenJob} />);
    expect(screen.getByRole('button', { name: 'Scheduled 1' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'ZLATER' }));
    expect(onOpenJob).toHaveBeenCalledWith(expect.objectContaining({ name: 'ZLATER' }));
  });
});

describe('BackgroundJobsSummaryCard', () => {
  it('links each status to Jobs & Dumps with that status chosen', () => {
    wrap(<BackgroundJobsSummaryCard jobs={twenty} />);
    expect(screen.getByRole('link', { name: 'Running 1' })).toHaveAttribute('href', '/sap/jobs?status=Running#jobs');
    expect(screen.getByRole('link', { name: 'All 20' })).toHaveAttribute('href', '/sap/jobs#jobs');
    expect(within(screen.getByRole('list', { name: 'Latest background jobs' })).getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByText('Showing the latest 5 of 20.')).toBeInTheDocument();
  });
});

describe('SapPerformancePage T-code cards', () => {
  it('labels each card with its transaction and shows the analytics charts', () => {
    wrap(<SapPerformancePage />);
    for (const [name, code] of [['ABAP Runtime Errors', 'ST22'], ['Server Topology', 'SM51'], ['Disk Usage', 'ST06'], ['DB Call Statistics', 'ST02'], ['Background Jobs', 'SM37'], ['Work Processes', 'SM50']]) {
      expect(screen.getByRole('heading', { name: new RegExp(name) })).toHaveTextContent(code);
    }
    for (const chart of ['Job Duration', 'Dump Timeline', 'Buffer Hit', 'DB Calls']) {
      expect(screen.getByRole('img', { name: new RegExp(`^${chart}\\.`) })).toBeInTheDocument();
    }
    expect(screen.getByRole('img', { name: 'Work process mix by type' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Update and enqueue queues' })).toBeInTheDocument();
    expect(screen.getByText('Nametab (NTAB)')).toBeInTheDocument();
  });

  it('shows the clean state for ST22 and the real sample for ST02', () => {
    wrap(<SapPerformancePage />);
    expect(screen.getAllByRole('status').some((el) => /No runtime errors, system is running clean/.test(el.textContent ?? ''))).toBe(true);
    expect(screen.queryByText('No call statistics')).not.toBeInTheDocument();
  });

  it('keeps the countdown and Refresh in the status line', async () => {
    wrap(<SapPerformancePage />);
    expect(screen.getByRole('timer')).toHaveTextContent('4:00');
    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(screen.getByRole('timer')).toHaveTextContent('5:00');
  });
});

describe('SapJobsPage', () => {
  it('filters, searches and pages the one job list', async () => {
    wrap(<SapJobsPage />);
    expect(screen.getByRole('button', { name: 'All 20' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Show more (5 remaining)' })).toBeInTheDocument();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search jobs' }), 'monthly');
    expect(screen.getByRole('button', { name: 'ZBTCH_MONTHLY_CLOSE' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Show more/ })).not.toBeInTheDocument();
  });

  it('opens with the status from the link on the Performance page', () => {
    wrap(<SapJobsPage />, '/sap/jobs?status=Running');
    expect(screen.getByRole('button', { name: /^Running/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('row')).toHaveLength(2);
  });

  it('opens a job in the drawer with its client', async () => {
    wrap(<SapJobsPage />, '/sap/jobs?status=Running');
    await userEvent.click(screen.getByRole('button', { name: 'ZBTCH_MONTHLY_CLOSE' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Client');
  });
});
