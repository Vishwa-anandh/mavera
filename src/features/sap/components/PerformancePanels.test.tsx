import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { SapDbCallStatistics, SapDump, SapJob, SapLock, SapMemoryPool, SapWorkProcess } from '../../../data-access';
import { ThemeProvider } from '../../../shared/theme/ThemeProvider';
import { AbapRuntimeErrorsCard } from './AbapRuntimeErrorsCard';
import { BackgroundJobsPanel } from './BackgroundJobsPanel';
import { BackgroundJobsSummaryCard } from './BackgroundJobsSummaryCard';
import { DbCallStatsCard } from './DbCallStatsCard';
import { MemoryPoolsCard } from './MemoryPoolsCard';
import { MemoryUsageChart } from './MemoryUsageChart';
import { MiniChart } from './MiniChart';
import { QueueIndicators } from './QueueIndicators';
import { SystemLocksCard } from './SystemLocksCard';
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

describe('MemoryPoolsCard', () => {
  const pools: SapMemoryPool[] = [
    { pool: 'Extended Memory', sizeMb: 16384, usedMb: 9830, peakMb: 12288 },
    { pool: 'Heap Memory', sizeMb: 4096, usedMb: 3350, peakMb: 3890 },
  ];
  it('lists each pool with size, use, peak, free, percent and a status', () => {
    wrap(<MemoryPoolsCard pools={pools} />);
    expect(screen.getByRole('heading', { name: /Memory Pools/ })).toHaveTextContent('ST02');
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(within(rows[1]).getAllByRole('cell').map((c) => c.textContent)).toEqual(['Extended MemorySize 16.0 GB · Peak 12.0 GB · Free 6.4 GB', '16.0 GB', '9.6 GB', '12.0 GB', '6.4 GB', '60%', 'Healthy']);
    expect(within(rows[2]).getAllByRole('cell').slice(1).map((c) => c.textContent)).toEqual(['4.0 GB', '3.3 GB', '3.8 GB', '746 MB', '82%', 'Warning']);
    expect(screen.getByText('1 pool needs attention')).toBeInTheDocument();
  });
  it('says all pools are healthy, and shows an empty state', () => {
    const { unmount } = wrap(<MemoryPoolsCard pools={[pools[0]]} />);
    expect(screen.getByText('All pools healthy')).toBeInTheDocument();
    unmount();
    wrap(<MemoryPoolsCard pools={[]} />);
    expect(screen.getByText('No memory pools reported')).toBeInTheDocument();
  });
});

describe('SystemLocksCard', () => {
  const lock = (id: string, table: string, ageSec: number, mode: SapLock['mode'] = 'E'): SapLock => ({ id, table, mode, user: 'ANBARASU', ageSec });
  it('shows the count, the oldest age and the longest-held locks first', () => {
    wrap(<SystemLocksCard locks={[lock('a', 'BSEG', 38, 'X'), lock('b', 'BKPF', 402)]} />);
    expect(screen.getByRole('heading', { name: /System Locks/ })).toHaveTextContent('SM12');
    expect(screen.getByRole('group', { name: 'Lock totals' })).toHaveTextContent('Lock entries2Oldest lock6 min');
    const rows = screen.getAllByRole('row');
    expect(within(rows[1]).getAllByRole('cell').map((c) => c.textContent)).toEqual(['BKPFE · Exclusive · ANBARASU', 'E · Exclusive', 'ANBARASU', '6 min']);
    expect(within(rows[2]).getAllByRole('cell').map((c) => c.textContent)).toEqual(['BSEGX · Exclusive · ANBARASU', 'X · Exclusive', 'ANBARASU', '38 s']);
  });
  it('shows only the five longest and says how many there are', () => {
    wrap(<SystemLocksCard locks={Array.from({ length: 7 }, (_, i) => lock(`l${i}`, `T${i}`, 10 + i))} />);
    expect(screen.getAllByRole('row')).toHaveLength(6);
    expect(screen.getByText('Longest 5 of 7')).toBeInTheDocument();
  });
  it('says "No locks held" when there are none', () => {
    wrap(<SystemLocksCard locks={[]} />);
    expect(screen.getByRole('status')).toHaveTextContent('No locks held');
    expect(screen.getByRole('group', { name: 'Lock totals' })).toHaveTextContent('Lock entries0Oldest lock—');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('MemoryUsageChart', () => {
  const series = [{ time: '14:00', usedGb: 12, allocatedGb: 21 }, { time: '15:00', usedGb: 13, allocatedGb: 21 }];
  it('summarises used against allocated and opens its data table', async () => {
    wrap(<MemoryUsageChart series={series} />);
    expect(screen.getByRole('img', { name: /^Memory Usage\. Now 13\.0 GB of 21\.0 GB \(62%\) · Peak 13\.0 GB/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'View data' }));
    const dialog = screen.getByRole('dialog', { name: 'Memory Usage, last 24 hours' });
    expect(within(dialog).getAllByRole('row')).toHaveLength(3);
    expect(within(dialog).getByText('62%')).toBeInTheDocument();
  });
  it('says so when there is no data', () => {
    wrap(<MemoryUsageChart series={[]} />);
    expect(screen.getByText('No data available for this period.')).toBeInTheDocument();
    expect(screen.getByText('No memory data reported')).toBeInTheDocument();
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
  it('labels each card with its transaction and shows the analytics charts', async () => {
    wrap(<SapPerformancePage />, '/#health');
    for (const [name, code] of [['ABAP Runtime Errors', 'ST22'], ['Server Topology', 'SM51'], ['Disk Usage', 'ST06'], ['Memory Pools', 'ST02'], ['DB Call Statistics', 'ST02']]) {
      expect(screen.getByRole('heading', { name: new RegExp(name) })).toHaveTextContent(code);
    }
    expect(screen.getByText('Nametab (NTAB)')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Jobs and processes' }));
    for (const [name, code] of [['Background Jobs', 'SM37'], ['System Locks', 'SM12'], ['Work Processes', 'SM50']]) {
      expect(screen.getByRole('heading', { name: new RegExp(name) })).toHaveTextContent(code);
    }
    expect(screen.getByRole('list', { name: 'Update and enqueue queues' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Analytics' }));
    for (const chart of ['Memory Usage', 'Job Duration', 'Dump Timeline', 'Buffer Hit', 'DB Calls']) {
      expect(screen.getByRole('img', { name: new RegExp(`^${chart}\\.`) })).toBeInTheDocument();
    }
    expect(screen.getByRole('img', { name: 'Work process mix by type' })).toBeInTheDocument();
  });

  it('shows the clean state for ST22 and the real sample for ST02', () => {
    wrap(<SapPerformancePage />, '/#health');
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
  it('has two tabs with counts and shows only the active panel', async () => {
    wrap(<SapJobsPage />);
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Background jobs20', 'Short dumps0']);
    expect(screen.getByRole('tab', { name: /Background jobs/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
    expect(screen.queryByRole('heading', { name: /Short Dumps/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: /Short dumps/ }));
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: /Short Dumps/ })).toBeInTheDocument();
    expect(screen.queryByRole('searchbox', { name: 'Search jobs' })).not.toBeInTheDocument();
  });

  it('opens the dumps tab from #dumps (the /sap/dumps redirect) and the jobs tab from #jobs with a status', () => {
    const { unmount } = wrap(<SapJobsPage />, '/sap/jobs#dumps');
    expect(screen.getByRole('tab', { name: /Short dumps/ })).toHaveAttribute('aria-selected', 'true');
    unmount();
    wrap(<SapJobsPage />, '/sap/jobs?status=Running#jobs');
    expect(screen.getByRole('tab', { name: /Background jobs/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: /^Running/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps the chip and search when switching to dumps and back', async () => {
    wrap(<SapJobsPage />);
    await userEvent.click(screen.getByRole('button', { name: /^Running/ }));
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search jobs' }), 'monthly');
    await userEvent.click(screen.getByRole('tab', { name: /Short dumps/ }));
    await userEvent.click(screen.getByRole('tab', { name: /Background jobs/ }));
    expect(screen.getByRole('button', { name: /^Running/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('searchbox', { name: 'Search jobs' })).toHaveValue('monthly');
  });

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
