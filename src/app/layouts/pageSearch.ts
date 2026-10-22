import type { ModuleId } from '../../features/access';
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
const EXTRA_PAGES: Array<PageResult & { module?: ModuleId }> = [
  { key: 'alerts', label: 'All alerts', path: '/alerts', where: 'Across modules', locked: false, keywords: 'alarms incidents critical warnings' },
  { key: 'ai-assistant', label: 'AI Assistant', path: '/ai-assistant', where: 'Across modules', locked: false, keywords: 'ask chat help copilot', module: 'assistant' },
  { key: 'account', label: 'Account', path: '/account', where: 'Your profile', locked: false, keywords: 'profile password email settings preferences' },
  { key: 'subscription', label: 'Subscription', path: '/subscription', where: 'Your profile', locked: false, keywords: 'plan upgrade modules seats licence license expiry renewal', module: 'subscription' },
];

/**
 * Flattens the user's resolved navigation — so search only ever offers pages their menus offer.
 * `canView` (role-based access) also filters the extra pages that sit outside the menus.
 */
export function buildPageIndex(entries: ResolvedNavEntry[], canView?: (module: ModuleId) => boolean): PageResult[] {
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
  const extras = EXTRA_PAGES.filter((page) => !seen.has(page.path) && (!page.module || !canView || canView(page.module)));
  return [...pages, ...extras.map(({ module: _module, ...page }) => page)];
}

/** Anything the palette can rank: a page or a command. */
export interface Searchable {
  label: string;
  where: string;
  keywords: string;
}

/**
 * Every word typed must appear somewhere in the item's name, location or keywords. Matches on
 * the name rank first, then name prefixes, then everything else in the order given. Commands pass
 * `matchWhere: false`: their location only describes them, so typing a page's name finds the page first.
 */
export function rankItems<T extends Searchable>(items: T[], query: string, { matchWhere = true }: { matchWhere?: boolean } = {}): T[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const scored: Array<{ item: T; score: number; order: number }> = [];
  items.forEach((item, order) => {
    const label = item.label.toLowerCase();
    const haystack = `${label} ${matchWhere ? item.where.toLowerCase() : ''} ${item.keywords.toLowerCase()}`;
    if (!words.every((word) => haystack.includes(word))) return;
    let score = 0;
    for (const word of words) {
      if (label.startsWith(word) || label.includes(` ${word}`)) score += 3;
      else if (label.includes(word)) score += 2;
    }
    scored.push({ item, score, order });
  });
  return scored.sort((a, b) => b.score - a.score || a.order - b.order).map((entry) => entry.item);
}

export function searchPages(index: PageResult[], query: string): PageResult[] {
  return rankItems(index, query);
}
