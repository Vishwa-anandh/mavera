/**
 * Helpers that give the cloud cost fixtures a second dimension without disturbing the numbers that already exist.
 * They use their own small PRNG, so adding a breakdown never changes the values drawn for the rest of a fixture.
 */

export function seededRandom(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Splits `total` by `weights` to the cent; the rounding remainder goes to the largest part so the parts add up exactly. */
export function splitToTheCent(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  const parts = weights.map((weight) => Math.round(((total * weight) / sum) * 100) / 100);
  const remainder = Math.round((total - parts.reduce((a, b) => a + b, 0)) * 100) / 100;
  if (remainder !== 0) {
    const largest = parts.indexOf(Math.max(...parts));
    parts[largest] = Math.round((parts[largest] + remainder) * 100) / 100;
  }
  return parts;
}

/**
 * Splits every day's cost across the services. The split is shaped (iterative proportional fitting) so the service
 * totals over the days land close to the given service totals, then each day is divided to the cent: a day's
 * services always add up to that day's cost exactly, so the month-to-date total does not change.
 */
export function splitDailyByService<T extends { date: string; cost: number }>(
  daily: T[],
  services: Array<{ name: string; cost: number }>,
  seed: number,
): Array<T & { byService: Record<string, number> }> {
  const random = seededRandom(seed);
  const weights = daily.map(() => services.map((service) => Math.max(service.cost, 0.01) * (0.7 + random() * 0.6)));
  const dayTotals = daily.map((day) => day.cost);
  const serviceTotal = services.reduce((sum, service) => sum + service.cost, 0) || 1;
  const grand = dayTotals.reduce((sum, cost) => sum + cost, 0) || 1;
  const columnTargets = services.map((service) => (service.cost / serviceTotal) * grand);
  for (let round = 0; round < 25; round += 1) {
    services.forEach((_, column) => {
      const have = weights.reduce((sum, row) => sum + row[column], 0) || 1;
      weights.forEach((row) => { row[column] *= columnTargets[column] / have; });
    });
    weights.forEach((row, index) => {
      const have = row.reduce((sum, value) => sum + value, 0) || 1;
      row.forEach((_, column) => { row[column] *= dayTotals[index] / have; });
    });
  }
  return daily.map((day, index) => {
    const parts = splitToTheCent(day.cost, weights[index]);
    return { ...day, byService: Object.fromEntries(services.map((service, column) => [service.name, parts[column]])) };
  });
}
