import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { cloudInsightsRepository, type CloudResource } from '../../../data-access';
import { AppBreadcrumb } from '../../../shared/ui/AppBreadcrumb';
import { CopyButton } from '../../../shared/ui/CopyButton';
import { DetailDrawer, DetailList } from '../../../shared/ui/DetailDrawer';
import { Select } from '../../../shared/ui/Select';
import { StatusTag } from '../../../shared/ui/StatusTag';
import { SearchIcon } from '../../../shared/ui/icons';
import { downloadCsv } from '../../../shared/lib/csv';
import { oneOf, useRememberedState } from '../../../shared/lib/useRememberedState';
import { PROVIDERS, PROVIDER_LABEL, formatMoney } from '../model/cloudFormat';

const ALL = 'All';
const TAG_FILTERS = ['All', 'Tagged', 'Untagged'] as const;
const STATE_TONE: Record<string, 'success' | 'warning' | 'neutral'> = { Active: 'success', Running: 'success', Stopped: 'warning', Unused: 'warning' };
const isUntagged = (r: CloudResource) => Object.keys(r.tags).length === 0;
const sumByCurrency = (resources: CloudResource[]) => resources.reduce<Record<string, number>>((acc, r) => {
  if (r.monthlyCost !== null) acc[r.currency] = (acc[r.currency] ?? 0) + r.monthlyCost;
  return acc;
}, {});

/**
 * CLOUD-07 — every resource across providers with its cost and governance context. Missing tags
 * show as "Untagged"; a resource without reported cost shows "Not reported" (not free).
 */
export function ResourceInventoryPage() {
  const all = useMemo(() => cloudInsightsRepository.listResources(), []);
  const [search, setSearch] = useRememberedState('cloud', 'resources-search', '');
  const [provider, setProvider] = useRememberedState('cloud', 'resources-provider', ALL, oneOf([ALL, ...PROVIDERS]));
  const [type, setType] = useRememberedState('cloud', 'resources-type', ALL);
  const [state, setState] = useRememberedState('cloud', 'resources-state', ALL);
  const [tags, setTags] = useRememberedState<(typeof TAG_FILTERS)[number]>('cloud', 'resources-tags', 'All', oneOf(TAG_FILTERS));
  const [sort, setSort] = useRememberedState<'name' | 'cost'>('cloud', 'resources-sort', 'name', oneOf(['name', 'cost']));
  const [open, setOpen] = useState<CloudResource | null>(null);

  const types = [...new Set(all.filter((r) => provider === ALL || r.provider === provider).map((r) => r.type))].sort();
  const states = [...new Set(all.map((r) => r.state))].sort();
  const query = search.trim().toLowerCase();
  const visible = all
    .filter((r) => (provider === ALL || r.provider === provider) && (type === ALL || r.type === type) && (state === ALL || r.state === state))
    .filter((r) => tags === 'All' || (tags === 'Untagged' ? isUntagged(r) : !isUntagged(r)))
    .filter((r) => !query || `${r.name} ${r.id} ${r.group} ${Object.values(r.tags).join(' ')}`.toLowerCase().includes(query))
    .sort((a, b) => (sort === 'cost' ? (b.monthlyCost ?? -1) - (a.monthlyCost ?? -1) : a.name.localeCompare(b.name)));
  const filtersActive = Boolean(query) || provider !== ALL || type !== ALL || state !== ALL || tags !== 'All';
  const clear = () => { setSearch(''); setProvider(ALL); setType(ALL); setState(ALL); setTags('All'); };
  const totals = sumByCurrency(visible);
  const notReported = visible.filter((r) => r.monthlyCost === null).length;

  const exportRows = () => downloadCsv('cloud-resources.csv', ['Name', 'ID', 'Provider', 'Type', 'Group', 'Account', 'Region', 'State', 'Month-to-date cost', 'Currency', 'Tags'],
    visible.map((r) => [r.name, r.id, PROVIDER_LABEL[r.provider], r.type, r.group, r.account, r.region ?? '', r.state, r.monthlyCost ?? 'Not reported', r.currency, isUntagged(r) ? 'Untagged' : Object.entries(r.tags).map(([k, v]) => `${k}=${v}`).join('; ')]));

  return (
    <div>
      <AppBreadcrumb items={[{ label: 'Cloud Cost', path: '/cloud/overview' }, { label: 'Resource Inventory' }]} />
      <div className="mv-page-heading">
        <div>
          <h1 className="mv-title">Resource Inventory</h1>
          <p className="mv-subtitle">Find any resource across your clouds, with its cost, owner and tags.</p>
        </div>
        <button type="button" className="mv-secondary-button" onClick={exportRows} disabled={visible.length === 0}>Export CSV</button>
      </div>

      <div className="mv-kpi-row-4">
        <article className="mv-kpi"><span className="mv-kpi-label">Resources</span><strong className="mv-kpi-value">{visible.length}</strong><span className="mv-muted">{filtersActive ? `of ${all.length}` : 'across all providers'}</span></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Untagged</span><strong className="mv-kpi-value">{visible.filter(isUntagged).length}</strong><span className="mv-muted">no env, owner or cost-center tag</span></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Month-to-date cost</span><strong className="mv-kpi-value mv-kpi-value--multi">{Object.keys(totals).length ? Object.entries(totals).map(([cur, amount]) => <span key={cur}>{formatMoney(amount, cur, { compact: true })}</span>) : '—'}</strong><span className="mv-muted">{notReported} without reported cost</span></article>
        <article className="mv-kpi"><span className="mv-kpi-label">Stopped or unused</span><strong className="mv-kpi-value">{visible.filter((r) => r.state === 'Stopped' || r.state === 'Unused').length}</strong><Link className="mv-kpi-link" to="/cloud/optimization">Find savings</Link></article>
      </div>

      <section className="mv-panel" aria-label="Resources">
        <div className="mv-filter-bar" role="search" aria-label="Filter resources">
          <label className="mv-filter-search">
            <SearchIcon size={16} aria-hidden />
            <input aria-label="Search resource name, ID, group or tag" placeholder="Name, ID, group or tag…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <Select label="Provider" hideLabel value={provider} onChange={(v) => { setProvider(v); setType(ALL); }} options={[{ value: ALL, label: 'All providers' }, ...PROVIDERS.map((p) => ({ value: p, label: PROVIDER_LABEL[p] }))]} />
          <Select label="Type" hideLabel value={types.includes(type) ? type : ALL} onChange={setType} options={[{ value: ALL, label: 'All types' }, ...types.map((t) => ({ value: t, label: t }))]} />
          <Select label="State" hideLabel value={state} onChange={setState} options={[{ value: ALL, label: 'All states' }, ...states.map((s) => ({ value: s, label: s }))]} />
          <Select label="Tags" hideLabel value={tags} onChange={setTags} options={TAG_FILTERS.map((t) => ({ value: t, label: t === 'All' ? 'Tagged and untagged' : t }))} />
          <Select label="Sort" hideLabel value={sort} onChange={setSort} options={[{ value: 'name', label: 'Name A–Z' }, { value: 'cost', label: 'Highest cost' }]} />
          {filtersActive && <button type="button" className="mv-quiet-button" onClick={clear}>Clear filters</button>}
        </div>
        {visible.length === 0 ? (
          <div className="mv-empty-inline"><p><strong>No resources match these filters.</strong></p><button type="button" className="mv-quiet-button" onClick={clear}>Clear filters</button></div>
        ) : (
          <div className="mv-table-wrap">
            <table className="mv-table mv-table--stack">
              <caption className="mv-sr-only">Cloud resources</caption>
              <thead><tr><th>Name</th><th>Provider</th><th>Type</th><th className="mv-hide-phone">Group</th><th className="mv-hide-phone">Region</th><th>Owner</th><th>State</th><th className="mv-num">Cost (MTD)</th></tr></thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={`${r.provider}:${r.id}`}>
                    <td data-label="Name" className="mv-stack-title"><button type="button" className="mv-link-button" onClick={() => setOpen(r)}>{r.name}</button></td>
                    <td data-label="Provider">{PROVIDER_LABEL[r.provider]}</td>
                    <td data-label="Type">{r.type}</td>
                    <td className="mv-hide-phone" data-label="Group">{r.group}</td>
                    <td className="mv-hide-phone" data-label="Region">{r.region ?? <span className="mv-muted">—</span>}</td>
                    <td data-label="Owner">{r.tags.owner ?? <span className="mv-muted">Untagged</span>}</td>
                    <td data-label="State"><StatusTag tone={STATE_TONE[r.state] ?? 'neutral'}>{r.state}</StatusTag></td>
                    <td data-label="Cost (MTD)" className="mv-num">{r.monthlyCost === null ? <span className="mv-muted">Not reported</span> : formatMoney(r.monthlyCost, r.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {open && (
        <DetailDrawer title={open.name} subtitle={`${PROVIDER_LABEL[open.provider]} · ${open.type}`} onClose={() => setOpen(null)} footer={<CopyButton value={open.id} label="Copy resource ID" />}>
          <DetailList items={[
            { label: 'Resource ID', value: <span className="mv-mono mv-break">{open.id}</span> },
            { label: 'Account', value: open.account },
            { label: 'Group', value: open.group },
            { label: 'Region', value: open.region ?? 'Not reported' },
            { label: 'State', value: open.state },
            { label: 'Month-to-date cost', value: open.monthlyCost === null ? 'Not reported by the provider (this doesn’t mean it’s free)' : formatMoney(open.monthlyCost, open.currency) },
          ]} />
          <h3 className="mv-detail-heading">Tags</h3>
          {isUntagged(open) ? <p className="mv-muted">Untagged — no env, owner or cost-center tag.</p> : (
            <ul className="mv-tag-list">{Object.entries(open.tags).map(([k, v]) => <li key={k}><span className="mv-muted">{k}</span> {v}</li>)}</ul>
          )}
          <h3 className="mv-detail-heading">Related</h3>
          <p className="mv-selection-links">
            <Link to="/cloud/analytics">Cost analytics</Link>
            <Link to="/cloud/optimization">Recommendations for this provider</Link>
          </p>
        </DetailDrawer>
      )}
    </div>
  );
}
