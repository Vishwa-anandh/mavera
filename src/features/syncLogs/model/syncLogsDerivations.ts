import type { SyncLogStatus } from './syncLogsTypes';

export const STATUS_LABELS: Record<SyncLogStatus, string> = { success: 'Success', failed: 'Failed', running: 'Running' };
export const STATUS_TONE: Record<SyncLogStatus, 'success' | 'danger' | 'warning'> = { success: 'success', failed: 'danger', running: 'warning' };

export function formatTimestamp(iso: string | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function formatDuration(startedAt: string | undefined, completedAt: string | undefined): string {
  if (!startedAt || !completedAt) return '—';
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}
