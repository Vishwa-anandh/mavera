/*
 * Sample spend history for the demo session (no backend). Everything is deterministic so the
 * charts and tests are stable, and the daily series is built FROM the monthly rows: each month's
 * days add up to that month's total, so 7D / 30D and 3M / 6M / 1Y always agree with each other.
 */
export interface DemoMonthlyRow {
  key: string;
  total: number;
  azure: number;
  aws: number;
  btp: number;
  gcp: number;
}

export interface DemoDailyRow {
  key: string;
  total: number;
}

const pad = (n: number) => String(n).padStart(2, '0');
const cents = (n: number) => Math.round(n * 100) / 100;

/** The 18 months before April 2026 (Oct 2024 to Mar 2026), growing steadily into the six months already in the sample. */
export function demoEarlierMonths(): DemoMonthlyRow[] {
  const rows: DemoMonthlyRow[] = [];
  for (let i = 0; i < 18; i += 1) {
    const monthIndex = 9 + i; // 0-based from Jan 2024; Oct 2024 = 9
    const year = 2024 + Math.floor(monthIndex / 12);
    const month = (monthIndex % 12) + 1;
    const wobble = (phase: number, size: number) => 1 + Math.sin(i * phase) * size;
    const azure = Math.round((4300 + 123 * i) * wobble(1.3, 0.03));
    const aws = Math.round((3600 + 70 * i) * wobble(0.9, 0.03));
    const btp = Math.round((520 + 34 * i) * wobble(1.7, 0.04));
    const gcp = i < 9 ? 0 : Math.round((120 + 30 * (i - 9)) * wobble(1.1, 0.05));
    rows.push({ key: `${year}-${pad(month)}`, azure, aws, btp, gcp, total: azure + aws + btp + gcp });
  }
  return rows;
}

/**
 * One value per day from the first day of `fromMonth` ("YYYY-MM") to `lastDay` ("YYYY-MM-DD"), where the days of
 * each month sum exactly to that month's total in `monthly`. Weekends are lighter and a little deterministic
 * noise keeps the line from being flat. The last month is month-to-date, so its total lands on `lastDay`.
 */
export function demoDailySpend(monthly: Array<{ key: string; total: number }>, fromMonth: string, lastDay: string): DemoDailyRow[] {
  const rows: DemoDailyRow[] = [];
  const end = new Date(`${lastDay}T00:00:00Z`);
  for (const month of monthly.filter((m) => m.key >= fromMonth && m.key <= lastDay.slice(0, 7))) {
    const [year, mm] = month.key.split('-').map(Number);
    const daysInMonth = new Date(Date.UTC(year, mm, 0)).getUTCDate();
    const days: string[] = [];
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(Date.UTC(year, mm - 1, day));
      if (date > end) break;
      days.push(`${year}-${pad(mm)}-${pad(day)}`);
    }
    const weights = days.map((key, index) => {
      const weekday = new Date(`${key}T00:00:00Z`).getUTCDay();
      return (weekday === 0 || weekday === 6 ? 0.72 : 1) * (1 + Math.sin(index * 2.1 + mm) * 0.06);
    });
    const weightSum = weights.reduce((a, b) => a + b, 0);
    let allocated = 0;
    days.forEach((key, index) => {
      const isLast = index === days.length - 1;
      const amount = isLast ? cents(month.total - allocated) : cents((month.total * weights[index]) / weightSum);
      allocated += amount;
      rows.push({ key, total: amount });
    });
  }
  return rows;
}
