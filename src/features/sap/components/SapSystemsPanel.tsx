import { useState } from 'react';
import { Link } from 'react-router-dom';
import { sapRepository, type SapCondition, type SapSystem } from '../../../data-access';
import { ClickableRow, RowChevronCell, RowOpenButton } from '../../../shared/ui/ClickableRow';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { FilterChips } from '../../../shared/ui/FilterChips';
import { ServerIcon } from '../../../shared/ui/icons';
import { SapSystemDrawer } from './SapSystemDrawer';

export function sapConditionCounts(systems: SapSystem[]): Record<SapCondition, number> {
  return systems.reduce(
    (acc, system) => {
      acc[system.condition] += 1;
      return acc;
    },
    { healthy: 0, warning: 0, critical: 0 } as Record<SapCondition, number>,
  );
}

/** Landscape health at a glance: HANA memory, ABAP response, work processes and unread alerts. */
export function SapHealthSummary() {
  const HANA_SYSTEM = sapRepository.getHana().system;
  const SAP_PERFORMANCE = sapRepository.getPerformance();
  const unreadAlerts = sapRepository.listAlerts().filter((a) => !a.read).length;
  return (
    <div className="mv-kpi-row-4" style={{ marginBottom: '1rem' }}>
      <article className="mv-kpi"><span className="mv-kpi-label">HANA Memory</span><strong className="mv-kpi-value">{HANA_SYSTEM.memory.percent}%</strong><span className="mv-status mv-status--success">Healthy</span></article>
      <article className="mv-kpi"><span className="mv-kpi-label">ABAP Response Time</span><strong className="mv-kpi-value">{SAP_PERFORMANCE.responseTimeMs}ms</strong><span className="mv-status mv-status--success">{SAP_PERFORMANCE.status}</span></article>
      <article className="mv-kpi"><span className="mv-kpi-label">Work Processes</span><strong className="mv-kpi-value">{SAP_PERFORMANCE.workProcessesUsed}/{SAP_PERFORMANCE.workProcessesTotal}</strong></article>
      <article className="mv-kpi"><span className="mv-kpi-label">Unread Alerts</span><strong className="mv-kpi-value">{unreadAlerts}</strong>{unreadAlerts > 0 && <Link className="mv-quiet-button" to="/sap/alerts">View all</Link>}</article>
    </div>
  );
}

const CONDITION_LABEL: Record<SapCondition, string> = { healthy: 'Healthy', warning: 'Warning', critical: 'Critical' };

/**
 * SAP-01 (MAVERA_DESIGN_SYSTEM.md §12): condition counts, then the systems
 * table, sorted condition priority then system ID. Shared between the
 * unified dashboard (compact) and the full /sap/systems page.
 */
interface SapSystemsPanelProps {
  limit?: number;
  /** `showCounts` defaults on; the dashboard turns it off since its SAP
   * ModuleCard already shows the same Healthy/Warning/Critical counts. */
  showCounts?: boolean;
  /** The full 6-column table doesn't fit a one-third-width dashboard
   * column (same problem the Alerts widget had) — this renders a condensed
   * row per system instead. The standalone /sap/systems page uses the full
   * table (default). */
  compact?: boolean;
}

type ConditionFilter = 'all' | SapCondition;

export function SapSystemsPanel({ limit, showCounts = true, compact = false }: SapSystemsPanelProps) {
  const systems = sapRepository.listSystems();
  const [filter, setFilter] = useState<ConditionFilter>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const counts = sapConditionCounts(systems);
  const sorted = [...systems].sort((a, b) => {
    const priority: Record<SapCondition, number> = { critical: 0, warning: 1, healthy: 2 };
    return priority[a.condition] - priority[b.condition] || a.id.localeCompare(b.id);
  });
  const visible = compact || filter === 'all' ? sorted : sorted.filter((system) => system.condition === filter);
  const rows = limit ? visible.slice(0, limit) : visible;
  const opened = systems.find((system) => system.id === openId);
  const tone = (condition: SapCondition) => (condition === 'healthy' ? 'success' : condition === 'warning' ? 'warning' : 'danger');

  return (
    <div>
      {showCounts && !compact && (
        <FilterChips<ConditionFilter>
          label="Filter systems by condition"
          value={filter}
          onChange={setFilter}
          chips={[
            { value: 'all', label: 'All', count: systems.length },
            ...(Object.keys(CONDITION_LABEL) as SapCondition[]).map((condition) => ({ value: condition, label: CONDITION_LABEL[condition], count: counts[condition] })),
          ]}
        />
      )}
      {showCounts && compact && (
        <div className="mv-condition-counts">
          {(Object.keys(CONDITION_LABEL) as SapCondition[]).map((condition) => (
            <span className={`mv-condition-pill mv-condition-pill--${condition}`} key={condition}>
              <span className="mv-condition-dot" aria-hidden />
              {counts[condition]} {CONDITION_LABEL[condition]}
            </span>
          ))}
        </div>
      )}
      {compact ? (
        <ul className="mv-system-list">
          {rows.map((system) => (
            <li key={system.id} className="mv-system-list-row">
              <div>
                <strong>{system.name}</strong>
                <span className="mv-muted"> · {system.environment}</span>
              </div>
              <div className="mv-system-list-meta">
                <span className="mv-muted">CPU {system.cpuPercent}% · Memory {system.memoryPercent}%</span>
                <span className={`mv-status mv-status--${tone(system.condition)}`}>{CONDITION_LABEL[system.condition]}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        rows.length === 0 ? (
          <EmptyState icon={<ServerIcon size={28} />} heading="No systems match" explanation="No system is in that condition right now." actionLabel="Show all systems" onAction={() => setFilter('all')} />
        ) : (
          <div className="mv-table-wrap">
            <table className="mv-table mv-table--stack">
              <thead>
                <tr>
                  <th>System</th>
                  <th>Environment</th>
                  <th>Condition</th>
                  <th className="mv-num">CPU</th>
                  <th className="mv-num">Memory</th>
                  <th>Last collection</th>
                  <th aria-hidden="true" />
                </tr>
              </thead>
              <tbody>
                {rows.map((system) => (
                  <ClickableRow key={system.id} onOpen={() => setOpenId(system.id)}>
                    <td data-label="System"><RowOpenButton onOpen={() => setOpenId(system.id)}>{system.name}</RowOpenButton></td>
                    <td data-label="Environment">{system.environment}</td>
                    <td data-label="Condition"><span className={`mv-status mv-status--${tone(system.condition)}`}>{CONDITION_LABEL[system.condition]}</span></td>
                    <td data-label="CPU" className="mv-num">{system.cpuPercent}%</td>
                    <td data-label="Memory" className="mv-num">{system.memoryPercent}%</td>
                    <td data-label="Last collection" className="mv-muted">{system.lastCollection}</td>
                    <RowChevronCell />
                  </ClickableRow>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
      {opened && <SapSystemDrawer system={opened} onClose={() => setOpenId(null)} />}
    </div>
  );
}
