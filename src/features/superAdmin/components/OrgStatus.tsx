import { CloudIcon, ServerIcon } from '../../../shared/ui/icons';
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

const MODULE_ICON = { cloudCost: CloudIcon, sapMonitoring: ServerIcon } as const;

/** The modules an organization is subscribed to, as labelled chips; "None" when it has no module. */
export function ModuleChips({ modules }: { modules: OrgModules }) {
  const active = MODULE_DEFS.filter((m) => modules[m.key]);
  if (active.length === 0) return <span className="mv-muted">None</span>;
  return (
    <ul className="mv-sa-module-chips" aria-label="Subscribed modules">
      {active.map((m) => {
        const Icon = MODULE_ICON[m.key];
        return (
          <li key={m.key} className="mv-sa-module-chip">
            <Icon size={13} />
            {m.label}
          </li>
        );
      })}
    </ul>
  );
}
