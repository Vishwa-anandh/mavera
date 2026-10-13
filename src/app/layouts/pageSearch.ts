import type { ResolvedNavEntry } from '../router/navConfig';

export interface PageResult {
  key: string;
  label: string;
  path: string;
  /** Where the page lives, e.g. "Cloud Cost › Optimization". */
  where: string;
  locked: boolean;
  keywords: string;
}

/** Pages reachable outside the module menus (header utilities, profile, dashboard links). */
const EXTRA_PAGES: PageResult[] = [
  { key: 'alerts', label: 'All alerts', path: '/alerts', where: 'Across modules', locked: false, keywords: 'alarms incidents critical warnings' },
  { key: 'ai-assistant', label: 'AI Assistant', path: '/ai-assistant', where: 'Across modules', locked: false, keywords: 'ask chat help copilot' },
  { key: 'account', label: 'Account', path: '/account', where: 'Your profile', locked: false, keywords: 'profile password email settings preferences' },
  { key: 'subscription', label: 'Subscription', path: '/subscription', where: 'Your profile', locked: false, keywords: 'plan upgrade modules seats licence license expiry renewal' },
];

/** Flattens the user's resolved navigation — so search only ever offers pages their menus offer. */
export function buildPageIndex(entries: ResolvedNavEntry[]): PageResult[] {
  const pages: PageResult[] = [];
  for (const entry of entries) {
    if (entry.type === 'leaf') {
      pages.push({ key: entry.key, label: entry.label, path: entry.path, where: 'Home', locked: entry.locked, keywords: '' });
      continue;
    }
    for (const leaf of entry.children) {
      pages.push({
        key: leaf.key,
        label: leaf.label,
        path: leaf.path,
        where: leaf.section ? `${entry.label} › ${leaf.section}` : entry.label,
        locked: leaf.locked,
        keywords: leaf.keywords ?? '',
      });
    }
  }
  const seen = new Set(pages.map((page) => page.path));
  return [...pages, ...EXTRA_PAGES.filter((page) => !seen.has(page.path))];
}

/**
 * Every word typed must appear somewhere in the page's name, location or keywords. Matches on
 * the page name rank first, then name prefixes, then everything else in menu order.
 */
export function searchPages(index: PageResult[], query: string): PageResult[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const scored: Array<{ page: PageResult; score: number; order: number }> = [];
  index.forEach((page, order) => {
    const label = page.label.toLowerCase();
    const haystack = `${label} ${page.where.toLowerCase()} ${page.keywords.toLowerCase()}`;
    if (!words.every((word) => haystack.includes(word))) return;
    let score = 0;
    for (const word of words) {
      if (label.startsWith(word) || label.includes(` ${word}`)) score += 3;
      else if (label.includes(word)) score += 2;
    }
    scored.push({ page, score, order });
  });
  return scored.sort((a, b) => b.score - a.score || a.order - b.order).map((item) => item.page);
}
