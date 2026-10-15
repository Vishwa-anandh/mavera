/** "just now", "5 minutes ago", "2 hours ago", "3 days ago". */
export function relativeTime(from: Date, now: Date = new Date()): string {
  const minutes = Math.round((now.getTime() - from.getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}
