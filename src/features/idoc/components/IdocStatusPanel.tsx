import { useMaveraTheme } from '../../../shared/theme/ThemeProvider';
import { lightColors, darkColors } from '../../../shared/theme/tokens';
import { DonutChart } from '../../../shared/ui/DonutChart';
import { MOCK_IDOC_FAILURES, MOCK_IDOC_STATUS, idocSuccessRate } from '../../../demo/idoc/mockIdocData';

/**
 * IDOC-01 (MAVERA_DESIGN_SYSTEM.md §14): total/failed/waiting counts and
 * success rate with denominator, a status breakdown and recent failures.
 * Shared between the unified dashboard (compact) and /idocs/overview.
 */
interface IdocStatusPanelProps {
  limit?: number;
  /** `showCounts` defaults on; the dashboard turns it off since its IDoc
   * ModuleCard already shows the same Total/Failed/Success-rate numbers. */
  showCounts?: boolean;
  /** The failures table doesn't fit a one-third-width dashboard column
   * (same problem the other two widgets in that row had) and made this
   * card much taller than its neighbours besides. The standalone
   * /idocs/overview page keeps the full table (default). */
  compact?: boolean;
}

export function IdocStatusPanel({ limit, showCounts = true, compact = false }: IdocStatusPanelProps) {
  const { mode } = useMaveraTheme();
  const colors = mode === 'dark' ? darkColors : lightColors;
  const total = MOCK_IDOC_STATUS.successful + MOCK_IDOC_STATUS.failed + MOCK_IDOC_STATUS.inProcess + MOCK_IDOC_STATUS.waiting;
  const rate = idocSuccessRate(MOCK_IDOC_STATUS);
  const failures = limit ? MOCK_IDOC_FAILURES.slice(0, limit) : MOCK_IDOC_FAILURES;

  return (
    <div>
      {showCounts && (
        <div className="mv-module-card-metrics" style={{ marginBottom: 16 }}>
          <div className="mv-module-card-metric"><span>Total IDocs</span><strong>{total.toLocaleString()}</strong></div>
          <div className="mv-module-card-metric"><span>Failed</span><strong>{MOCK_IDOC_STATUS.failed.toLocaleString()}</strong></div>
          <div className="mv-module-card-metric"><span>Success rate</span><strong>{rate}% of {total.toLocaleString()}</strong></div>
        </div>
      )}
      <DonutChart
        title="IDoc status (last 24 hours)"
        totalLabel="IDocs"
        data={[
          { label: 'Successful', value: MOCK_IDOC_STATUS.successful, color: colors.success },
          { label: 'Failed', value: MOCK_IDOC_STATUS.failed, color: colors.danger },
          { label: 'In process', value: MOCK_IDOC_STATUS.inProcess, color: colors.info },
          { label: 'Waiting', value: MOCK_IDOC_STATUS.waiting, color: colors.warning },
        ]}
      />
      {!compact && (
        <>
          <h3 className="mv-panel-title" style={{ marginTop: 20, marginBottom: 10, fontSize: 14 }}>Recent failures</h3>
          <div className="mv-table-wrap">
            <table className="mv-table">
              <thead>
                <tr><th>IDoc</th><th>Message type</th><th>Partner</th><th>Status</th><th>Failed</th></tr>
              </thead>
              <tbody>
                {failures.map((failure) => (
                  <tr key={failure.id}>
                    <td className="mv-code">{failure.id}</td>
                    <td>{failure.messageType}</td>
                    <td>{failure.partner}</td>
                    <td>{failure.status}</td>
                    <td className="mv-muted">{failure.failedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
