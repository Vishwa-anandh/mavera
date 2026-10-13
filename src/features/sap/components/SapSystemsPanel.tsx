import { MOCK_SAP_SYSTEMS, sapConditionCounts, type SapCondition } from '../../../demo/sap/mockSapData';

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

export function SapSystemsPanel({ limit, showCounts = true, compact = false }: SapSystemsPanelProps) {
  const counts = sapConditionCounts(MOCK_SAP_SYSTEMS);
  const sorted = [...MOCK_SAP_SYSTEMS].sort((a, b) => {
    const priority: Record<SapCondition, number> = { critical: 0, warning: 1, healthy: 2 };
    return priority[a.condition] - priority[b.condition] || a.id.localeCompare(b.id);
  });
  const rows = limit ? sorted.slice(0, limit) : sorted;
  const tone = (condition: SapCondition) => (condition === 'healthy' ? 'success' : condition === 'warning' ? 'warning' : 'danger');

  return (
    <div>
      {showCounts && (
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
        <div className="mv-table-wrap">
          <table className="mv-table">
            <thead>
              <tr>
                <th>System</th>
                <th>Environment</th>
                <th>Condition</th>
                <th className="mv-num">CPU</th>
                <th className="mv-num">Memory</th>
                <th>Last collection</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((system) => (
                <tr key={system.id}>
                  <td>{system.name}</td>
                  <td>{system.environment}</td>
                  <td><span className={`mv-status mv-status--${tone(system.condition)}`}>{CONDITION_LABEL[system.condition]}</span></td>
                  <td className="mv-num">{system.cpuPercent}%</td>
                  <td className="mv-num">{system.memoryPercent}%</td>
                  <td className="mv-muted">{system.lastCollection}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
