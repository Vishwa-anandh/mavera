import { useId, useMemo, useState } from 'react';
import { ChevronDownIcon } from './icons';

export interface UsageLine {
  service: string;
  usageType: string;
  cost: number;
}

interface ServiceBreakdownListProps {
  lines: readonly UsageLine[];
  /** Maitsys CSP rate as a fraction (0.035 = 3.5%); shown as a saving beside each usage line when given. */
  cspRate?: number;
  title?: string;
  format: (value: number) => string;
}

interface ServiceGroup {
  service: string;
  cost: number;
  sharePct: number;
  lines: UsageLine[];
}

/** Groups usage lines by service, biggest first; shares are exact to one decimal and add up to 100. */
export function groupServiceLines(lines: readonly UsageLine[]): ServiceGroup[] {
  const byService = new Map<string, UsageLine[]>();
  for (const line of lines) byService.set(line.service, [...(byService.get(line.service) ?? []), line]);
  const total = lines.reduce((sum, line) => sum + line.cost, 0);
  const groups = [...byService.entries()]
    .map(([service, items]) => ({ service, cost: items.reduce((sum, item) => sum + item.cost, 0), items: [...items].sort((a, b) => b.cost - a.cost) }))
    .sort((a, b) => b.cost - a.cost);
  // Largest-remainder rounding so the shown shares total exactly 100.0.
  const raw = groups.map((group) => (total > 0 ? (group.cost / total) * 1000 : 0));
  const floors = raw.map(Math.floor);
  let left = (total > 0 ? 1000 : 0) - floors.reduce((a, b) => a + b, 0);
  raw.map((value, index) => ({ index, rest: value - floors[index] })).sort((a, b) => b.rest - a.rest).forEach(({ index }) => {
    if (left-- > 0) floors[index] += 1;
  });
  return groups.map((group, index) => ({ service: group.service, cost: group.cost, sharePct: floors[index] / 10, lines: group.items }));
}

/**
 * Service Breakdown: spend grouped by service, one row per service with its share of the total as a bar, the
 * percentage, the cost and how many usage types it has. A row opens to its usage lines (with the CSP saving),
 * so 28 usage lines read as 11 services you can drill into.
 */
export function ServiceBreakdownList({ lines, cspRate, title = 'Service Breakdown', format }: ServiceBreakdownListProps) {
  const titleId = useId();
  const [open, setOpen] = useState<Set<string>>(new Set());
  const groups = useMemo(() => groupServiceLines(lines), [lines]);
  const toggle = (service: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(service)) next.add(service);
      return next;
    });
  const maxShare = Math.max(1, ...groups.map((group) => group.sharePct));

  return (
    <section className="mv-panel" aria-labelledby={titleId}>
      <div className="mv-panel-header">
        <div>
          <h2 className="mv-panel-title" id={titleId}>{title}</h2>
          <p className="mv-muted mv-section-sub">{groups.length} service {groups.length === 1 ? 'type' : 'types'} · {lines.length} usage line {lines.length === 1 ? 'item' : 'items'}</p>
        </div>
      </div>
      <ul className="mv-svc-list">
        {groups.map((group) => {
          const expanded = open.has(group.service);
          const panelId = `${titleId}-${group.service.replace(/\W+/g, '-')}`;
          return (
            <li key={group.service} className="mv-svc-item">
              <button type="button" className="mv-svc-row" aria-expanded={expanded} aria-controls={panelId} onClick={() => toggle(group.service)}>
                <span className="mv-svc-name">{group.service}</span>
                <span className="mv-svc-bar" aria-hidden><span style={{ width: `${(group.sharePct / maxShare) * 100}%` }} /></span>
                <span className="mv-svc-share">{group.sharePct.toFixed(1)}%</span>
                <span className="mv-svc-cost">{format(group.cost)}</span>
                <span className="mv-svc-types">{group.lines.length} {group.lines.length === 1 ? 'type' : 'types'}</span>
                <ChevronDownIcon size={14} className={expanded ? 'mv-svc-chevron is-open' : 'mv-svc-chevron'} />
              </button>
              {expanded && (
                <ul className="mv-svc-lines" id={panelId}>
                  {group.lines.map((line) => (
                    <li key={line.usageType}>
                      <span className="mv-svc-usage">{line.usageType}</span>
                      <span className="mv-svc-cost">{format(line.cost)}</span>
                      {cspRate !== undefined && <span className="mv-svc-saving">{format(line.cost * cspRate)}</span>}
                    </li>
                  ))}
                  {cspRate !== undefined && <li className="mv-svc-lines-note">Right column: CSP saving at {(cspRate * 100).toFixed(1)}%</li>}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
