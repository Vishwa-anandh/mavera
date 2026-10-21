import type { SapLock } from '../../../data-access';
import { CheckIcon } from '../../../shared/ui/icons';
import { LOCK_MODE_LABEL, formatLockAge, lockSummary, longestHeldLocks } from '../model/sapPerformance';
import { TcodeBadge } from './TcodeBadge';

const SHOWN = 5;

/** System Locks (SM12): how many lock entries exist, the age of the oldest and the longest-held ones. */
export function SystemLocksCard({ locks }: { locks: SapLock[] }) {
  const { count, oldestAgeSec } = lockSummary(locks);
  const longest = longestHeldLocks(locks, SHOWN);
  return (
    <section className="mv-panel" aria-labelledby="system-locks-title">
      <div className="mv-panel-header">
        <h2 id="system-locks-title" className="mv-panel-title">System Locks <TcodeBadge code="SM12" /></h2>
        {count > SHOWN && <span className="mv-muted">Longest {SHOWN} of {count}</span>}
      </div>
      <dl className="mv-stat-strip" role="group" aria-label="Lock totals">
        <div><dt>Lock entries</dt><dd>{count}</dd></div>
        <div><dt>Oldest lock</dt><dd>{oldestAgeSec === null ? '—' : formatLockAge(oldestAgeSec)}</dd></div>
      </dl>
      {count === 0 ? (
        <p className="mv-clean-line" role="status">
          <CheckIcon size={16} aria-hidden="true" />
          No locks held
        </p>
      ) : (
        <div className="mv-table-wrap">
          <table className="mv-table mv-compact-table">
            <caption className="mv-sr-only">Longest-held lock entries</caption>
            <thead><tr><th>Table</th><th className="mv-lock-wide">Lock mode</th><th className="mv-lock-wide">User</th><th className="mv-num">Age</th></tr></thead>
            <tbody>
              {longest.map((lock) => (
                <tr key={lock.id}>
                  <td><span className="mv-mono">{lock.table}</span><span className="mv-lock-sub">{lock.mode} · {LOCK_MODE_LABEL[lock.mode].split(',')[0]} · {lock.user}</span></td>
                  <td className="mv-lock-wide" title={LOCK_MODE_LABEL[lock.mode]}>{lock.mode} · {LOCK_MODE_LABEL[lock.mode].split(',')[0]}</td>
                  <td className="mv-lock-wide">{lock.user}</td>
                  <td className="mv-num">{formatLockAge(lock.ageSec)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
