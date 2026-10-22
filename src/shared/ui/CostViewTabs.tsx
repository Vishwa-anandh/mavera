import { COST_VIEW_ID_PREFIX, COST_VIEW_ITEMS, type CostView } from '../lib/useCostView';
import { TabBar } from './TabBar';

interface CostViewTabsProps<T extends CostView> {
  views: readonly T[];
  active: T;
  onChange: (view: T) => void;
}

/**
 * The Executive / Operations / Technical switch every provider account page shares: tabs, with who each view
 * is for next to its name. Pair it with `useCostView` for the active view, and wrap the view's content in
 * `costViewPanelProps(active)` from useCostView.
 */
export function CostViewTabs<T extends CostView>({ views, active, onChange }: CostViewTabsProps<T>) {
  return (
    <div className="mv-cost-view-tabs">
      <TabBar
        label="Cost view"
        idPrefix={COST_VIEW_ID_PREFIX}
        items={views.map((id) => ({ id, label: COST_VIEW_ITEMS[id].label, hint: COST_VIEW_ITEMS[id].hint }))}
        activeId={active}
        onChange={(id) => onChange(id as T)}
      />
    </div>
  );
}
