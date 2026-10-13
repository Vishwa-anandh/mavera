import type { GcpCosts } from './gcpTypes';

export interface AiInsight {
  type: 'warning' | 'success' | 'info';
  title: string;
  detail: string;
}

/**
 * Client-side heuristics matching the reference's `buildGcpAiInsights` —
 * with two of its bugs deliberately NOT reproduced: (1) the reference
 * hardcodes "3.5%" in insight copy even though the actual computed rate is
 * 2% (AWS's rate, pasted into the GCP page by mistake) — this version
 * always interpolates the real `mspRate`; (2) the reference's
 * `buildAiInsights` reads `mspRates` from outer component scope it was
 * never given as a parameter (a latent `ReferenceError`) — this version
 * takes `mspRate` as an explicit parameter instead.
 */
export function buildAiInsights(data: GcpCosts, mspRate: number): AiInsight[] {
  const insights: AiInsight[] = [];
  const mspSavings = data.totalCost * mspRate;

  const eomForecast = data.forecastData[0]?.projected_cost ?? null;
  if (eomForecast !== null && data.totalCost > 0) {
    const pct = ((eomForecast - data.totalCost) / data.totalCost) * 100;
    if (eomForecast > data.totalCost * 1.3) {
      insights.push({ type: 'warning', title: 'Forecast trending high', detail: `Projected month-end spend is ${pct.toFixed(0)}% above Month-to-Date — review recent usage spikes.` });
    }
  }

  const topService = [...data.services].sort((a, b) => b.cost - a.cost)[0];
  if (topService && data.totalCost > 0) {
    const share = (topService.cost / data.totalCost) * 100;
    if (share > 50) {
      insights.push({ type: 'warning', title: 'Service concentration risk', detail: `${topService.name} is ${share.toFixed(0)}% of spend — consider Committed Use Discounts if this is sustained.` });
    } else {
      insights.push({ type: 'info', title: 'Top cost driver', detail: `${topService.name} accounts for ${share.toFixed(1)}% of this month's spend.` });
    }
  }

  const topProject = [...data.projects].sort((a, b) => b.cost - a.cost)[0];
  if (topProject && data.totalCost > 0) {
    const share = (topProject.cost / data.totalCost) * 100;
    insights.push({ type: 'info', title: 'Top project', detail: `${topProject.name} accounts for ${share.toFixed(1)}% of total spend.` });
  }

  if (mspSavings > 0) {
    insights.push({ type: 'success', title: 'Maitsys CSP savings', detail: `Maitsys CSP saves ${formatCurrency(mspSavings)} this month — ${(mspRate * 100).toFixed(1)}% discount on ${formatCurrency(data.totalCost)} GCP spend.` });
  }

  return insights.slice(0, 6);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}
