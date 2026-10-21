import type { SapMemoryPool } from '../../../data-access';
import { formatMegabytes, memoryPoolRows } from '../model/sapPerformance';
import { TcodeBadge } from './TcodeBadge';

/** Memory Pools (ST02): the configured size, use, peak and free space of each pool, with a status from how full it is. */
export function MemoryPoolsCard({ pools }: { pools: SapMemoryPool[] }) {
  const rows = memoryPoolRows(pools);
  const attention = rows.filter((r) => r.tone !== 'success').length;
  return (
    <section className="mv-panel" aria-labelledby="memory-pools-title">
      <div className="mv-panel-header">
        <h2 id="memory-pools-title" className="mv-panel-title">Memory Pools <TcodeBadge code="ST02" /></h2>
        {rows.length > 0 && <span className="mv-muted">{attention === 0 ? 'All pools healthy' : `${attention} ${attention === 1 ? 'pool needs' : 'pools need'} attention`}</span>}
      </div>
      {rows.length === 0 ? (
        <p className="mv-muted">No memory pools reported</p>
      ) : (
        <div className="mv-table-wrap">
          <table className="mv-table mv-compact-table">
            <caption className="mv-sr-only">Memory pools of the application server</caption>
            <thead>
              <tr><th>Pool</th><th className="mv-num mv-pool-wide">Size</th><th className="mv-num">In use</th><th className="mv-num mv-pool-wide">Peak</th><th className="mv-num mv-pool-wide">Free</th><th className="mv-num">Used</th><th>Status</th></tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.pool}>
                  <td>{row.pool}<span className="mv-pool-sub">Size {formatMegabytes(row.sizeMb)} · Peak {formatMegabytes(row.peakMb)} · Free {formatMegabytes(row.freeMb)}</span></td>
                  <td className="mv-num mv-pool-wide">{formatMegabytes(row.sizeMb)}</td>
                  <td className="mv-num">{formatMegabytes(row.usedMb)}</td>
                  <td className="mv-num mv-pool-wide">{formatMegabytes(row.peakMb)}</td>
                  <td className="mv-num mv-pool-wide">{formatMegabytes(row.freeMb)}</td>
                  <td className="mv-num">{row.usedPercent}%</td>
                  <td><span className={`mv-status mv-status--${row.tone}`}>{row.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
