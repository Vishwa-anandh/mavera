/** Demo "today" the seeded expiry dates were written against, so their badges stay stable. */
const REFERENCE_DATE = '2026-09-27';

/** Whole days until `expiresAt` (negative once lapsed); null when it never expires. */
export function daysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - new Date(REFERENCE_DATE).getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export const today = () => new Date().toISOString().slice(0, 10);

/** Adds days or months to a yyyy-mm-dd date, counting from today when it has already lapsed. */
export function extendDate(from: string | null, by: { days?: number; months?: number }): string {
  const base = from && from > today() ? new Date(from) : new Date(today());
  if (by.days) base.setDate(base.getDate() + by.days);
  if (by.months) base.setMonth(base.getMonth() + by.months);
  return base.toISOString().slice(0, 10);
}

export function formatLongDate(value: string | null): string {
  if (!value) return 'No expiry';
  return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
