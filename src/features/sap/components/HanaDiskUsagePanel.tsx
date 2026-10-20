import { useState } from 'react';
import type { HanaDiskPartition } from '../../../data-access';
import { DonutChart } from '../../../shared/ui/DonutChart';
import { BarList } from '../../../shared/ui/BarList';
import { diskTone, partitionPercent, summariseDisks } from '../model/hanaDetail';
import { SegmentedSwitch } from './SegmentedSwitch';

type DiskView = 'donut' | 'bar';

const TONE_LABEL = { success: 'Healthy', warning: 'Filling up', danger: 'Almost full' } as const;

/** "LOG_BACKUP+CATALOG_BACKUP" -> "Log backup + catalog backup". */
function usageLabel(usage: string): string {
  const text = usage.split('+').map((part) => part.toLowerCase().replace(/_/g, ' ')).join(' + ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Disk Usage for the HANA host: overall used/free, then every partition with its utilisation, size,
 * host, path, mount and device. The switch changes only the picture (donut of the overall split, or
 * one bar per partition); the per-partition rows are the same in both views.
 */
export function HanaDiskUsagePanel({ partitions }: { partitions: HanaDiskPartition[] }) {
  const [view, setView] = useState<DiskView>('donut');
  const summary = summariseDisks(partitions);

  return (
    <section className="mv-panel mv-disk-panel" aria-labelledby="hana-disk-title">
      <div className="mv-panel-header">
        <div>
          <h2 id="hana-disk-title" className="mv-panel-title">Disk Usage</h2>
          <p className="mv-muted" style={{ margin: 0 }}>Storage partitions</p>
        </div>
        <SegmentedSwitch
          label="Disk usage view"
          value={view}
          onChange={setView}
          options={[{ value: 'donut', label: 'Donut' }, { value: 'bar', label: 'Bar' }]}
        />
      </div>

      <p className="mv-disk-headline">
        <span className={`mv-status mv-status--${summary.tone}`}>{TONE_LABEL[summary.tone]}</span>
        <strong>{summary.usedGb.toFixed(1)}</strong> / {summary.totalGb.toFixed(1)} GB
      </p>
      <dl className="mv-stat-strip" role="group" aria-label="Overall disk capacity">
        <div><dt>Partitions</dt><dd>{summary.partitions}</dd></div>
        <div><dt>Used</dt><dd>{summary.usedGb.toFixed(1)}<small> GB</small></dd></div>
        <div><dt>Free</dt><dd>{summary.freeGb.toFixed(1)}<small> GB</small></dd></div>
        <div><dt>Utilization</dt><dd>{summary.percent}<small>%</small></dd></div>
      </dl>

      {view === 'donut' ? (
        <DonutChart
          title="HANA disk, used and free across all devices"
          totalLabel="GB total"
          data={[
            { label: 'Used', value: summary.usedGb, color: 'var(--mv-primary)' },
            { label: 'Free', value: summary.freeGb, color: 'var(--mv-success)' },
          ]}
        />
      ) : (
        <BarList
          label="Disk utilization by partition"
          items={partitions.map((p) => {
            const percent = partitionPercent(p);
            return { key: p.usage, label: usageLabel(p.usage), value: percent, display: `${percent}%`, tone: diskTone(percent) === 'success' ? 'primary' : diskTone(percent) };
          })}
        />
      )}

      {summary.shared.length > 0 && (
        <p className="mv-muted mv-disk-note">
          {summary.shared.map((s) => `${s.usages.length} partitions share ${s.device} (${s.mount})`).join('; ')}, so the totals above count that volume once.
        </p>
      )}

      <ul className="mv-partition-list" aria-label="Partition details">
        {partitions.map((p) => {
          const percent = partitionPercent(p);
          return (
            <li key={p.usage} className="mv-partition">
              <div className="mv-partition-head">
                <strong>{usageLabel(p.usage)}</strong>
                <span className={`mv-status mv-status--${diskTone(percent)}`}>{percent}% used</span>
              </div>
              <p className="mv-muted mv-partition-sizes">Used {p.usedGb.toFixed(2)} GB · Free {p.freeGb.toFixed(2)} GB · Total {p.totalGb.toFixed(2)} GB</p>
              <dl className="mv-partition-facts">
                <div><dt>Host</dt><dd>{p.host}</dd></div>
                <div><dt>Path</dt><dd className="mv-mono">{p.path}</dd></div>
                <div><dt>Mount</dt><dd className="mv-mono">{p.mount}</dd></div>
                <div><dt>Device</dt><dd className="mv-mono">{p.device}</dd></div>
              </dl>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
