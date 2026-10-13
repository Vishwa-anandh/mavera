import { useState } from 'react';
import type { BtpCostTabProps } from '../../model/BtpCostTabProps';
import type { BtpSubaccount } from '../../model/btpTypes';
import { btpRegionLabel, directoriesWithCosts, orphanSubaccounts, regionBreakdown, type DirectoryWithCost } from '../../model/btpDerivations';
import { MOCK_BTP_SERVICE_INSTANCES, MOCK_BTP_SM_CONFIGS } from '../../../../demo/btp/mockBtpData';
import { DonutChart } from '../../../../shared/ui/DonutChart';
import { BuildingIcon, HierarchyIcon } from '../../../../shared/ui/icons';

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
}

const ORPHAN_GUID = '__orphan__';

/**
 * Hierarchy tab — BTP's single biggest structural difference from Azure/
 * AWS/GCP: a 3-level drill-down (Global Account → Directory → Subaccount),
 * ported from the reference's `drillDir`/`drillSub` state machine. The
 * reference joins COST_API cost rows to CIS metadata client-side by
 * fragile name matching; this port does that join once, up front, in
 * mockBtpData.ts, so `data.subaccountHierarchy` already carries `cost` —
 * no matching logic lives in this component (see btpDerivations.ts's
 * module doc comment).
 */
export function HierarchyTab(props: BtpCostTabProps) {
  const { data, chartColors } = props;
  const currency = data.currency;
  const [drillDirGuid, setDrillDirGuid] = useState<string | null>(null);
  const [drillSubGuid, setDrillSubGuid] = useState<string | null>(null);

  const dirs = directoriesWithCosts(data);
  const orphans = orphanSubaccounts(data);
  const orphanDir: DirectoryWithCost | null = orphans.length > 0
    ? { guid: ORPHAN_GUID, displayName: 'Direct (No Directory)', subaccountGuids: orphans.map((o) => o.guid), subaccounts: orphans, cost: orphans.reduce((s, o) => s + o.cost, 0) }
    : null;
  const allDirs = orphanDir ? [...dirs, orphanDir] : dirs;

  const drillDir = allDirs.find((d) => d.guid === drillDirGuid) ?? null;
  const drillSub = drillDir?.subaccounts.find((s) => s.guid === drillSubGuid) ?? null;

  const goRoot = () => { setDrillDirGuid(null); setDrillSubGuid(null); };
  const goDir = (guid: string) => { setDrillDirGuid(guid); setDrillSubGuid(null); };
  const goSub = (dirGuid: string, subGuid: string) => { setDrillDirGuid(dirGuid); setDrillSubGuid(subGuid); };
  const selectOrphanSub = (subGuid: string) => { setDrillDirGuid(ORPHAN_GUID); setDrillSubGuid(subGuid); };

  const level = drillSub ? 2 : drillDir ? 1 : 0;

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        {['Global Account', 'Directory', 'Subaccount', 'Services / Instances'].map((label, i) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={`mv-status ${i === level ? 'mv-status--info' : 'mv-status--neutral'}`}>{label}</span>
            {i < 3 && <span className="mv-muted">›</span>}
          </span>
        ))}
      </div>

      {(drillDir || drillSub) && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 16, fontSize: 13 }}>
          <button className="mv-quiet-button" style={{ padding: '2px 8px' }} onClick={goRoot}>{data.globalAccount?.displayName ?? 'Global Account'}</button>
          {drillDir && <><span className="mv-muted">/</span><button className="mv-quiet-button" style={{ padding: '2px 8px' }} onClick={() => goDir(drillDir.guid)}>{drillDir.displayName}</button></>}
          {drillSub && <><span className="mv-muted">/</span><span className="mv-muted" style={{ padding: '2px 8px' }}>{drillSub.displayName}</span></>}
        </div>
      )}

      {level === 0 && <GlobalAccountView data={data} dirs={dirs} orphans={orphans} onOpenDir={goDir} onOpenOrphanSub={selectOrphanSub} chartColors={chartColors} currency={currency} />}
      {level === 1 && drillDir && <DirectoryView dir={drillDir} totalCost={data.totalCost} currency={currency} servicesBySubaccount={data.servicesBySubaccount} onOpenSub={(subGuid) => goSub(drillDir.guid, subGuid)} />}
      {level === 2 && drillDir && drillSub && (
        <SubaccountView
          sub={drillSub}
          dir={drillDir}
          currency={currency}
          servicesBySubaccount={data.servicesBySubaccount}
          globalServices={data.services}
          onSelectSibling={(guid) => goSub(drillDir.guid, guid)}
        />
      )}
    </div>
  );
}

function GlobalAccountView({ data, dirs, orphans, onOpenDir, onOpenOrphanSub, chartColors, currency }: {
  data: BtpCostTabProps['data'];
  dirs: DirectoryWithCost[];
  orphans: BtpSubaccount[];
  onOpenDir: (guid: string) => void;
  onOpenOrphanSub: (guid: string) => void;
  chartColors: BtpCostTabProps['chartColors'];
  currency: string;
}) {
  const regions = regionBreakdown(data);
  const regionSlices = regions.map((r, i) => ({ label: btpRegionLabel(r.name), value: r.cost, color: [chartColors.primary, chartColors.secondary, chartColors.tertiary, chartColors.axis][i % 4] }));
  const maxDirCost = Math.max(...dirs.map((d) => d.cost), 1);

  return (
    <div>
      <section className="mv-panel" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span className="mv-avatar" style={{ background: 'var(--mv-selected)', color: 'var(--mv-primary)' }}><BuildingIcon size={18} /></span>
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: 16 }}>{data.globalAccount?.displayName ?? 'Global Account'}</strong>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {data.globalAccount?.commercialModel && <span className="mv-status mv-status--neutral">{data.globalAccount.commercialModel}</span>}
              {data.globalAccount?.licenseType && <span className="mv-status mv-status--neutral">{data.globalAccount.licenseType}</span>}
              {data.globalAccount?.contractStatus && <span className={`mv-status ${data.globalAccount.contractStatus === 'ACTIVE' ? 'mv-status--success' : 'mv-status--neutral'}`}>{data.globalAccount.contractStatus}</span>}
            </div>
          </div>
        </div>
        <div className="mv-kpi-row-5">
          <article className="mv-kpi"><span className="mv-kpi-label">Total MTD Cost</span><strong className="mv-kpi-value">{formatCurrency(data.totalCost, currency)}</strong></article>
          <article className="mv-kpi"><span className="mv-kpi-label">Directories</span><strong className="mv-kpi-value">{dirs.length || '0'}</strong></article>
          <article className="mv-kpi"><span className="mv-kpi-label">Subaccounts</span><strong className="mv-kpi-value">{data.subaccountHierarchy.length || data.subaccounts.length}</strong></article>
          <article className="mv-kpi"><span className="mv-kpi-label">Services</span><strong className="mv-kpi-value">{data.services.length}</strong></article>
          <article className="mv-kpi"><span className="mv-kpi-label">Currency</span><strong className="mv-kpi-value">{data.globalAccount?.currency ?? currency}</strong></article>
        </div>
      </section>

      {dirs.length > 0 && (
        <section className="mv-panel" style={{ marginBottom: 16 }}>
          <div className="mv-panel-header"><h2 className="mv-panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><HierarchyIcon size={18} />Directories</h2></div>
          <div style={{ display: 'grid', gap: 10 }}>
            {dirs.map((dir) => {
              const pct = data.totalCost > 0 ? (dir.cost / data.totalCost) * 100 : 0;
              return (
                <button key={dir.guid} type="button" className="mv-account-row-body" style={{ width: '100%', border: '1px solid var(--mv-divider)', borderRadius: 8, padding: 12 }} onClick={() => onOpenDir(dir.guid)}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <strong>{dir.displayName}<span className="mv-muted" style={{ marginLeft: 8, fontWeight: 400 }}>{dir.subaccounts.length} subaccts</span></strong>
                      <span style={{ display: 'flex', gap: 10 }}><strong>{formatCurrency(dir.cost, currency)}</strong><span className="mv-muted">{pct.toFixed(1)}%</span></span>
                    </div>
                    <div style={{ height: 6, borderRadius: 999, background: 'var(--mv-divider)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 999, width: `${(dir.cost / maxDirCost) * 100}%`, background: 'var(--mv-primary)' }} />
                    </div>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {orphans.length > 0 && (
        <section className="mv-panel" style={{ marginBottom: 16 }}>
          <div className="mv-panel-header"><h2 className="mv-panel-title">Direct Sub-Accounts — No Directory</h2></div>
          <div style={{ display: 'grid', gap: 8 }}>
            {orphans.map((sub) => (
              <button key={sub.guid} type="button" className="mv-account-row-body" style={{ width: '100%', border: '1px solid var(--mv-divider)', borderRadius: 8, padding: 10 }} onClick={() => onOpenOrphanSub(sub.guid)}>
                <span className="mv-account-row-meta" style={{ flex: 1 }}>
                  <strong>{sub.displayName}</strong>
                  <span className="mv-muted">{btpRegionLabel(sub.region)}</span>
                </span>
                <strong>{formatCurrency(sub.cost, currency)}</strong>
              </button>
            ))}
          </div>
        </section>
      )}

      {!data.cisSucceeded && data.subaccounts.length > 0 && (
        <section className="mv-panel" style={{ marginBottom: 16 }}>
          <div className="mv-panel-header"><h2 className="mv-panel-title">Subaccounts (COST_API only)</h2></div>
          <p className="mv-muted" style={{ marginTop: -8, marginBottom: 12 }}>Configure CIS_Central to unlock directory/subaccount drill-down.</p>
          <div style={{ display: 'grid', gap: 8 }}>
            {[...data.subaccounts].sort((a, b) => b.cost - a.cost).map((sub) => {
              const pct = data.totalCost > 0 ? (sub.cost / data.totalCost) * 100 : 0;
              return (
                <div key={sub.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                  <span>{sub.name}</span>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ width: 120, height: 6, borderRadius: 999, background: 'var(--mv-divider)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 999, width: `${pct}%`, background: 'var(--mv-primary)' }} />
                    </div>
                    <strong>{formatCurrency(sub.cost, currency)}</strong>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {regions.length > 0 && (
        <section className="mv-panel">
          <div className="mv-panel-header"><h2 className="mv-panel-title">Region Breakdown</h2></div>
          <div className="mv-row-3col">
            <div style={{ display: 'grid', gap: 8, alignContent: 'start' }}>
              {regions.map((r) => {
                const pct = data.totalCost > 0 ? (r.cost / data.totalCost) * 100 : 0;
                return (
                  <div key={r.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13 }}>
                    <span>{btpRegionLabel(r.name)} <span className="mv-code mv-muted">{r.name}</span></span>
                    <span style={{ display: 'flex', gap: 8 }}><strong>{formatCurrency(r.cost, currency)}</strong><span className="mv-muted">{pct.toFixed(1)}%</span></span>
                  </div>
                );
              })}
            </div>
            <DonutChart title="Region breakdown" totalLabel="Spend" data={regionSlices} />
          </div>
        </section>
      )}
    </div>
  );
}

function DirectoryView({ dir, totalCost, currency, servicesBySubaccount, onOpenSub }: {
  dir: DirectoryWithCost;
  totalCost: number;
  currency: string;
  servicesBySubaccount: BtpCostTabProps['data']['servicesBySubaccount'];
  onOpenSub: (guid: string) => void;
}) {
  const pctOfGlobal = totalCost > 0 ? (dir.cost / totalCost) * 100 : 0;
  const activeServices = new Set(dir.subaccounts.flatMap((s) => servicesBySubaccount.find((sa) => sa.subaccountGuid === s.guid)?.services.map((sv) => sv.name) ?? [])).size;
  const regions = new Set(dir.subaccounts.map((s) => s.region));
  const maxCost = Math.max(...dir.subaccounts.map((s) => s.cost), 1);

  return (
    <div>
      <section className="mv-panel" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <strong style={{ fontSize: 16 }}>{dir.displayName}</strong>
          <strong>{formatCurrency(dir.cost, currency)}</strong>
        </div>
        <div className="mv-kpi-row-4">
          <article className="mv-kpi"><span className="mv-kpi-label">Directory MTD Cost</span><strong className="mv-kpi-value">{formatCurrency(dir.cost, currency)}</strong></article>
          <article className="mv-kpi"><span className="mv-kpi-label">% of Global Account</span><strong className="mv-kpi-value">{pctOfGlobal.toFixed(1)}%</strong></article>
          <article className="mv-kpi"><span className="mv-kpi-label">Subaccounts</span><strong className="mv-kpi-value">{dir.subaccounts.length}</strong></article>
          <article className="mv-kpi"><span className="mv-kpi-label">Active Services</span><strong className="mv-kpi-value">{activeServices}</strong></article>
        </div>
      </section>

      <section className="mv-panel" style={{ marginBottom: 16 }}>
        <div className="mv-panel-header"><h2 className="mv-panel-title">Sub-Accounts</h2></div>
        <div className="mv-table-wrap">
          <table className="mv-table">
            <thead><tr><th>Subaccount</th><th>Region</th><th>State</th><th>Env Type</th><th className="mv-num">Services</th><th className="mv-num">MTD Cost</th><th aria-label="Open" /></tr></thead>
            <tbody>
              {dir.subaccounts.map((sub) => {
                const svcCount = servicesBySubaccount.find((sa) => sa.subaccountGuid === sub.guid)?.services.length ?? 0;
                return (
                  <tr key={sub.guid}>
                    <td><strong>{sub.displayName}</strong><div className="mv-muted">{sub.subdomain}</div></td>
                    <td>{btpRegionLabel(sub.region)}</td>
                    <td><span className={`mv-status ${sub.state === 'OK' || sub.state === 'ACTIVE' ? 'mv-status--success' : 'mv-status--neutral'}`}>{sub.state}</span></td>
                    <td>{sub.environmentType || sub.licenseType || '—'}</td>
                    <td className="mv-num">{svcCount}</td>
                    <td className="mv-num">
                      {formatCurrency(sub.cost, currency)}
                      <div style={{ height: 4, borderRadius: 999, background: 'var(--mv-divider)', overflow: 'hidden', marginTop: 4 }}>
                        <div style={{ height: '100%', borderRadius: 999, width: `${(sub.cost / maxCost) * 100}%`, background: 'var(--mv-primary)' }} />
                      </div>
                    </td>
                    <td><button className="mv-quiet-button" onClick={() => onOpenSub(sub.guid)}>Open ›</button></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr><td colSpan={5} style={{ textAlign: 'right', fontWeight: 500 }}>Directory Total</td><td className="mv-num" style={{ fontWeight: 500 }}>{formatCurrency(dir.cost, currency)}</td><td /></tr>
            </tfoot>
          </table>
        </div>
      </section>

      {regions.size > 1 && (
        <section className="mv-panel">
          <div className="mv-panel-header"><h2 className="mv-panel-title">Regions In This Directory</h2></div>
          <div style={{ display: 'grid', gap: 8 }}>
            {[...regions].map((region) => {
              const cost = dir.subaccounts.filter((s) => s.region === region).reduce((sum, s) => sum + s.cost, 0);
              return (
                <div key={region} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span>{btpRegionLabel(region)}</span>
                  <strong>{formatCurrency(cost, currency)}</strong>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function SubaccountView({ sub, dir, currency, servicesBySubaccount, globalServices, onSelectSibling }: {
  sub: BtpSubaccount;
  dir: DirectoryWithCost;
  currency: string;
  servicesBySubaccount: BtpCostTabProps['data']['servicesBySubaccount'];
  globalServices: BtpCostTabProps['data']['services'];
  onSelectSibling: (guid: string) => void;
}) {
  const ownServices = servicesBySubaccount.find((sa) => sa.subaccountGuid === sub.guid);
  const smConfig = MOCK_BTP_SM_CONFIGS[sub.guid];
  const instances = MOCK_BTP_SERVICE_INSTANCES[sub.guid] ?? [];
  const siblings = dir.subaccounts.filter((s) => s.guid !== sub.guid);

  return (
    <div>
      <section className="mv-panel" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <strong style={{ fontSize: 16 }}>{sub.displayName}</strong>
            {sub.description && <p className="mv-muted" style={{ margin: '2px 0 0' }}>{sub.description}</p>}
          </div>
          <strong>{formatCurrency(sub.cost, currency)}</strong>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <span className="mv-status mv-status--success">{sub.state}</span>
          <span className="mv-status mv-status--neutral">{sub.licenseType}</span>
          <span className="mv-status mv-status--neutral">{sub.environmentType}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, fontSize: 13, marginBottom: 12 }}>
          <div><span className="mv-muted">MTD Cost</span><br /><strong>{formatCurrency(sub.cost, currency)}</strong></div>
          <div><span className="mv-muted">Region</span><br /><strong>{btpRegionLabel(sub.region)}</strong></div>
          <div><span className="mv-muted">Directory</span><br /><strong>{dir.displayName}</strong></div>
          <div><span className="mv-muted">State</span><br /><strong>{sub.state}</strong></div>
          <div><span className="mv-muted">Subdomain</span><br /><strong className="mv-code">{sub.subdomain}</strong></div>
          <div><span className="mv-muted">Technical Name</span><br /><strong className="mv-code">{sub.technicalName}</strong></div>
          <div><span className="mv-muted">License Type</span><br /><strong>{sub.licenseType}</strong></div>
          <div><span className="mv-muted">Environment</span><br /><strong>{sub.environmentType}</strong></div>
        </div>
        <p className="mv-muted" style={{ margin: 0 }}>GUID: <span className="mv-code">{sub.guid}</span></p>
      </section>

      <section className="mv-panel" style={{ marginBottom: 16 }}>
        <div className="mv-panel-header"><h2 className="mv-panel-title">Services / Instances</h2></div>
        {ownServices ? (
          <div className="mv-table-wrap">
            <table className="mv-table">
              <thead><tr><th>Service/Instance</th><th>Plan</th><th className="mv-num">Usage</th><th className="mv-num">MTD Cost</th><th className="mv-num">Share</th></tr></thead>
              <tbody>
                {ownServices.services.map((svc) => (
                  <tr key={svc.name}>
                    <td>{svc.name}</td>
                    <td className="mv-code">{svc.planName ?? '—'}</td>
                    <td className="mv-num">{svc.usage.toLocaleString()}{svc.unit ? ` ${svc.unit}` : ''}</td>
                    <td className="mv-num">{formatCurrency(svc.cost, currency)}</td>
                    <td className="mv-num">{ownServices.totalCost > 0 ? `${((svc.cost / ownServices.totalCost) * 100).toFixed(1)}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={3} style={{ textAlign: 'right', fontWeight: 500 }}>Subaccount Total</td><td className="mv-num" style={{ fontWeight: 500 }}>{formatCurrency(ownServices.totalCost, currency)}</td><td /></tr></tfoot>
            </table>
          </div>
        ) : (
          <>
            <div className="mv-notice" style={{ marginBottom: 12 }}>No per-subaccount service data in snapshot. Sync to reload — showing global services as reference.</div>
            <div className="mv-table-wrap">
              <table className="mv-table">
                <thead><tr><th>Service</th><th className="mv-num">Cost</th><th className="mv-num">Share</th></tr></thead>
                <tbody>
                  {[...globalServices].sort((a, b) => b.cost - a.cost).slice(0, 10).map((svc) => (
                    <tr key={svc.name}><td>{svc.name}</td><td className="mv-num">{formatCurrency(svc.cost, currency)}</td><td className="mv-num">—</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className="mv-panel" style={{ marginBottom: 16 }}>
        <div className="mv-panel-header"><h2 className="mv-panel-title">Service Manager Instances</h2></div>
        {!smConfig ? (
          <div className="mv-empty" style={{ margin: 0 }}><h2>Service Manager not configured</h2><p>Configure Service Manager credentials for this subaccount to discover its service instances.</p></div>
        ) : instances.length === 0 ? (
          <p className="mv-muted">No instances found.</p>
        ) : (
          <div className="mv-table-wrap">
            <table className="mv-table">
              <thead><tr><th>Instance</th><th>Offering</th><th>Plan</th><th>Platform</th><th>Status</th></tr></thead>
              <tbody>
                {instances.map((inst) => (
                  <tr key={inst.id}>
                    <td>{inst.name}</td>
                    <td>{inst.serviceOfferingName}</td>
                    <td className="mv-code">{inst.servicePlanName}</td>
                    <td><span className="mv-status mv-status--neutral">{inst.platformType}</span></td>
                    <td><span className={`mv-status mv-status--${inst.status.includes('succeeded') ? 'success' : inst.status.includes('failed') ? 'danger' : 'warning'}`}>{inst.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {siblings.length > 0 && (
        <section className="mv-panel">
          <div className="mv-panel-header"><h2 className="mv-panel-title">Other Sub-Accounts In {dir.displayName}</h2></div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {siblings.map((s) => (
              <button key={s.guid} type="button" className="mv-secondary-button" onClick={() => onSelectSibling(s.guid)}>{s.displayName}</button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
