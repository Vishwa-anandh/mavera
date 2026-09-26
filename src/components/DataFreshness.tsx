import { Typography } from 'antd';

export interface DataFreshnessProps {
  lastUpdated: Date | null;
  staleAfterMinutes?: number;
  now?: Date;
}

function formatRelative(diffMs: number): string {
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function DataFreshness({ lastUpdated, staleAfterMinutes, now = new Date() }: DataFreshnessProps) {
  if (!lastUpdated) {
    return <Typography.Text type="secondary">Update time unavailable</Typography.Text>;
  }

  const diffMs = now.getTime() - lastUpdated.getTime();
  const isStale = staleAfterMinutes !== undefined && diffMs / 60000 > staleAfterMinutes;
  const timezoneLabel = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const absolute = `${lastUpdated.toLocaleString()} (${timezoneLabel})`;

  return (
    <Typography.Text type={isStale ? 'warning' : 'secondary'}>
      {isStale ? 'Stale — ' : ''}
      Last updated {formatRelative(diffMs)} · {absolute}
    </Typography.Text>
  );
}
