import type { HanaSystem } from '../../../data-access';

const MAX_AVATARS = 4;

/** Live sessions: the count, the unique users and one small initial per user (with "+n" past four). */
export function SessionsCard({ sessions }: { sessions: HanaSystem['sessions'] }) {
  const shown = sessions.byUser.slice(0, MAX_AVATARS);
  const extra = sessions.byUser.length - shown.length;
  return (
    <article className="mv-kpi">
      <span className="mv-kpi-label">Sessions <span className="mv-status mv-status--success" style={{ marginLeft: '0.375rem' }}>Live</span></span>
      <strong className="mv-kpi-value">{sessions.active}</strong>
      <span className="mv-muted">Active · {sessions.uniqueUsers} unique user{sessions.uniqueUsers === 1 ? '' : 's'}</span>
      {shown.length > 0 && (
        <ul className="mv-avatar-dots" aria-label="Users with sessions">
          {shown.map((u) => (
            <li key={u.user} className="mv-avatar-dot" title={`${u.user}: ${u.sessions} session${u.sessions === 1 ? '' : 's'}`}>
              <span aria-hidden="true">{u.user.charAt(0).toUpperCase()}</span>
              <span className="mv-sr-only">{u.user}, {u.sessions} session{u.sessions === 1 ? '' : 's'}</span>
            </li>
          ))}
          {extra > 0 && <li className="mv-avatar-dot mv-avatar-dot--more"><span aria-hidden="true">+{extra}</span><span className="mv-sr-only">and {extra} more</span></li>}
        </ul>
      )}
    </article>
  );
}
