import { Tooltip } from '../../../shared/ui/Tooltip';
import { daysLeft } from '../model/orgDates';
import { MODULE_DEFS, type OrgModules } from '../model/superAdminTypes';

export function ExpiryBadge({ expiresAt }: { expiresAt: string | null }) {
  const days = daysLeft(expiresAt);
  if (days === null) return <span className="mv-status mv-status--neutral">No expiry</span>;
  if (days < 0) return <span className="mv-status mv-status--danger">Expired</span>;
  if (days <= 7) return <span className="mv-status mv-status--danger">{days}d left</span>;
  if (days <= 30) return <span className="mv-status mv-status--warning">{days}d left</span>;
  return <span className="mv-status mv-status--success">{days}d left</span>;
}

export function ModuleDots({ modules }: { modules: OrgModules }) {
  return (
    <div className="mv-sa-module-dots">
      {MODULE_DEFS.map((m) => (
        <Tooltip key={m.key} content={m.label}>
          <span className={`mv-sa-module-dot${modules[m.key] ? ' mv-sa-module-dot--on' : ''}`} aria-label={m.label}>
            {m.label.split(' ')[0].slice(0, 2).toUpperCase()}
          </span>
        </Tooltip>
      ))}
    </div>
  );
}
