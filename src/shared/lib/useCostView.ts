import { tabPanelProps } from '../ui/TabBar';
import { useHashTab } from './useHashTab';

export type CostView = 'executive' | 'operations' | 'hierarchy' | 'technical';

/** The views of a provider account page, with who each one is for. */
export const COST_VIEW_ITEMS: Record<CostView, { label: string; hint: string }> = {
  executive: { label: 'Executive', hint: 'CEO / Leadership' },
  operations: { label: 'Operations', hint: 'Manager / Dept. Head' },
  hierarchy: { label: 'Hierarchy', hint: 'Directory / Subaccount' },
  technical: { label: 'Technical', hint: 'Engineer / In-depth' },
};

/**
 * The view (Executive, Operations, Technical...) open on a provider account page. It is in the URL hash
 * (`#operations`) so it can be linked to, and it is remembered per account for the rest of the session: going
 * back to an account reopens the view last used, so the choice costs one click once, not one per visit.
 */
export function useCostView<T extends CostView>(provider: string, accountId: string | undefined, views: readonly T[]): [T, (view: T) => void] {
  return useHashTab(views, views[0], { remember: `cost-view:${provider}:${accountId ?? ''}` });
}

/** Prefix of the ids that tie each view's tab to its panel. */
export const COST_VIEW_ID_PREFIX = 'cost-view';

/** The attributes of the panel that holds a view's content (ties it to its tab in `CostViewTabs`). */
export function costViewPanelProps(view: CostView) {
  return tabPanelProps(COST_VIEW_ID_PREFIX, view);
}
