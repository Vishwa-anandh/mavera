import { useNavigate } from 'react-router-dom';
import type { GlobalAlertRow, GlobalAlertSeverity } from '../../../data-access';
import { ClickableRow, RowChevronCell, RowOpenButton } from '../../../shared/ui/ClickableRow';
import { alertTarget } from '../model/alertTarget';
import { useGlobalAlerts } from '../model/useGlobalAlerts';

const SEVERITY_LABEL: Record<GlobalAlertSeverity, string> = { critical: 'Critical', warning: 'Warning', info: 'Info' };
const SEVERITY_TONE: Record<GlobalAlertSeverity, 'danger' | 'warning' | 'info'> = { critical: 'danger', warning: 'warning', info: 'info' };

interface AlertsPanelProps {
  limit?: number;
  /** A 6-column table doesn't fit the dashboard's narrow secondary column —
   * this renders a condensed list instead. The standalone /alerts page uses
   * the full table (default). */
  compact?: boolean;
  /** Rows to show; defaults to the organisation's active alerts. */
  rows?: GlobalAlertRow[];
}

export function AlertsPanel({ limit, compact = false, rows: given }: AlertsPanelProps) {
  const all = useGlobalAlerts();
  const navigate = useNavigate();
  const source = given ?? all;
  const rows = limit ? source.slice(0, limit) : source;

  if (rows.length === 0) {
    return <p className="mv-muted">No active alerts.</p>;
  }

  if (compact) {
    return (
      <ul className="mv-alert-list">
        {rows.map((alert) => (
          <li key={alert.id} className="mv-alert-list-row">
            <span className={`mv-status mv-status--${SEVERITY_TONE[alert.severity]}`}>{SEVERITY_LABEL[alert.severity]}</span>
            <div className="mv-alert-list-body">
              <p>{alert.summary}</p>
              <span className="mv-muted">{alert.module} · {alert.source} · {alert.timestamp} · {alert.status}</span>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="mv-table-wrap">
      <table className="mv-table mv-table--stack">
        <colgroup>
          <col style={{ width: '9%' }} />
          <col style={{ width: '11%' }} />
          <col style={{ width: '17%' }} />
          <col style={{ width: '39%' }} />
          <col style={{ width: '12%' }} />
          <col style={{ width: '12%' }} />
          <col style={{ width: '2.5rem' }} />
        </colgroup>
        <thead>
          <tr><th>Time</th><th>Module</th><th>Source</th><th>Alert</th><th>Severity</th><th>Status</th><th className="mv-row-chevron"><span className="mv-sr-only">Open</span></th></tr>
        </thead>
        <tbody>
          {rows.map((alert) => (
            <ClickableRow key={alert.id} onOpen={() => navigate(alertTarget(alert))}>
              <td data-label="Time" className="mv-muted">{alert.timestamp}</td>
              <td data-label="Module">{alert.module}</td>
              <td data-label="Source">{alert.source}</td>
              <td data-label="Alert"><RowOpenButton onOpen={() => navigate(alertTarget(alert))}>{alert.summary}</RowOpenButton></td>
              <td data-label="Severity"><span className={`mv-status mv-status--${SEVERITY_TONE[alert.severity]}`}>{SEVERITY_LABEL[alert.severity]}</span></td>
              <td data-label="Status">{alert.status}</td>
              <RowChevronCell />
            </ClickableRow>
          ))}
        </tbody>
      </table>
    </div>
  );
}
