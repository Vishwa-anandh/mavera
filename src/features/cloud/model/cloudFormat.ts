import type { CloudProviderId } from '../../../data-access';

export const PROVIDER_LABEL: Record<CloudProviderId, string> = { azure: 'Azure', aws: 'AWS', gcp: 'Google Cloud', btp: 'SAP BTP' };
export const PROVIDERS: CloudProviderId[] = ['azure', 'aws', 'gcp', 'btp'];

/** Money in its own currency, e.g. "$14,280.55" or "€6,248.90". Never converted. */
export function formatMoney(amount: number, currency: string, options: { compact?: boolean } = {}): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: options.compact ? 'compact' : 'standard',
    maximumFractionDigits: options.compact ? 1 : 2,
  }).format(amount);
}

/** "+12.4%" / "−3.0%" change against the previous value; null when there's nothing to compare. */
export function percentChange(current: number, previous: number | null): number | null {
  if (previous === null || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function formatChange(change: number | null): string {
  if (change === null) return '—';
  return `${change > 0 ? '+' : change < 0 ? '−' : ''}${Math.abs(change).toFixed(1)}%`;
}

export function monthLabel(month: string): string {
  const [year, m] = month.split('-').map(Number);
  return new Date(year, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}
