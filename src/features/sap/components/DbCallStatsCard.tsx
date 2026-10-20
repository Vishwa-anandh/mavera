import type { SapDbCallStatistics } from '../../../data-access';
import { TcodeBadge } from './TcodeBadge';

function hitTone(percent: number): string {
  return percent >= 98 ? 'success' : percent >= 95 ? 'warning' : 'danger';
}

/** DB Call Statistics (ST02): SAP buffer hit ratio and the per-buffer call table. */
export function DbCallStatsCard({ stats }: { stats: SapDbCallStatistics | null }) {
  return (
    <section className="mv-panel" aria-labelledby="db-calls-title">
      <div className="mv-panel-header">
        <h2 id="db-calls-title" className="mv-panel-title">DB Call Statistics <TcodeBadge code="ST02" /></h2>
        {stats && <span className="mv-muted">last 24 hours</span>}
      </div>
      {stats === null || stats.buffers.length === 0 ? (
        <p className="mv-muted">No call statistics</p>
      ) : (
        <>
          <dl className="mv-stat-strip" role="group" aria-label="Buffer and call totals">
            <div><dt>Buffer hit ratio</dt><dd>{stats.bufferHitRatioPercent.toFixed(1)}<small>%</small></dd></div>
            <div><dt>DB calls</dt><dd>{stats.totalCalls.toLocaleString()}</dd></div>
            <div><dt>Avg call</dt><dd>{stats.avgCallMs}<small> ms</small></dd></div>
          </dl>
          <div className="mv-table-wrap">
            <table className="mv-table">
              <thead><tr><th>Buffer</th><th className="mv-num">Hit ratio</th><th className="mv-num">Calls</th><th className="mv-num">Swaps</th></tr></thead>
              <tbody>
                {stats.buffers.map((buffer) => (
                  <tr key={buffer.buffer}>
                    <td>{buffer.buffer}</td>
                    <td className="mv-num"><span className={`mv-status mv-status--${hitTone(buffer.hitRatioPercent)}`}>{buffer.hitRatioPercent.toFixed(1)}%</span></td>
                    <td className="mv-num">{buffer.calls.toLocaleString()}</td>
                    <td className="mv-num">{buffer.swaps}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
