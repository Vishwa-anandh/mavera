/** The scope every IDoc page shows: which SAP system/client and period the numbers cover. */
export function IdocScope() {
  return (
    <p className="mv-scope-chip" aria-label="Scope: system GRC, client 200, last 14 days">
      <span>System <strong>GRC</strong></span>
      <span>Client <strong>200</strong></span>
      <span>Last 14 days</span>
    </p>
  );
}
