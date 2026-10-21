import { useState } from 'react';
import type { SapWorkProcess } from '../../../data-access';
import { WORK_PROCESS_TYPES, processStatusCounts } from '../model/sapPerformance';
import { SegmentedSwitch } from './SegmentedSwitch';
import { TcodeBadge } from './TcodeBadge';

type TypeFilter = 'ALL' | SapWorkProcess['type'];

const STATUS_TONE: Record<SapWorkProcess['status'], string> = { Running: 'info', Waiting: 'neutral', Stopped: 'danger' };

/** Work Processes (SM50): counts by state, a type filter and the process table. */
export function WorkProcessesPanel({ processes, system }: { processes: SapWorkProcess[]; system: string }) {
  const [type, setType] = useState<TypeFilter>('ALL');
  const counts = processStatusCounts(processes);
  const rows = type === 'ALL' ? processes : processes.filter((p) => p.type === type);

  return (
    <section className="mv-panel" aria-labelledby="work-processes-title">
      <div className="mv-panel-header">
        <div>
          <h2 id="work-processes-title" className="mv-panel-title">Work Processes <TcodeBadge code="SM50" /></h2>
          <p className="mv-muted" style={{ margin: 0 }}>{system} · {counts.Running} running · {counts.Waiting} waiting · {counts.Stopped} stopped</p>
        </div>
        <SegmentedSwitch
          label="Work process type"
          value={type}
          onChange={setType}
          options={[{ value: 'ALL', label: 'All' } as const, ...WORK_PROCESS_TYPES.map((t) => ({ value: t, label: t }))]}
        />
      </div>
      <div className="mv-table-wrap">
        <table className="mv-table">
          <thead><tr><th className="mv-num">#</th><th>Type</th><th className="mv-num">PID</th><th>Status</th><th>Restart</th><th>Report</th><th>User</th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.no}>
                <td className="mv-num">{p.no}</td>
                <td className="mv-mono">{p.type}</td>
                <td className="mv-num">{p.pid}</td>
                <td><span className={`mv-status mv-status--${STATUS_TONE[p.status]}`}>{p.status}</span></td>
                <td>{p.restart ? 'Yes' : 'No'}</td>
                <td className="mv-mono">{p.report ?? '—'}</td>
                <td>{p.user ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
