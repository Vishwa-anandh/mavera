import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { HanaBackupEntry, HanaBackupKind, HanaBackupStatus } from '../../../data-access';
import { DetailList } from '../../../shared/ui/DetailDrawer';
import { InsightList } from '../../../shared/ui/InsightList';
import {
  BACKUP_KINDS, backupInsights, backupsInWindow, formatBackupStamp, formatDuration, stampMs, summariseBackups,
} from '../model/hanaDetail';
import { ViewDataButton } from './ChartDataDialog';
import { SegmentedSwitch } from './SegmentedSwitch';

type WindowDays = '7' | '14';

const DAY_MS = 86_400_000;
const STATUS_LABEL: Record<HanaBackupStatus, string> = { success: 'Success', warning: 'Warning', failed: 'Failed' };
const LANE_LABEL: Record<HanaBackupKind, string> = { 'Data backup': 'Data', 'Log backup': 'Log', 'Catalog backup': 'Catalog' };

function describe(b: HanaBackupEntry): string {
  const size = b.sizeGb > 0 ? `${b.sizeGb.toFixed(b.sizeGb < 1 ? 2 : 1)} GB` : 'no data written';
  return `${b.kind} · ${formatBackupStamp(b.startedAt)} · ${formatDuration(b.durationSec)} · ${size} · ${STATUS_LABEL[b.status]}`;
}

/**
 * Backup Timeline: one lane per backup type with a marker per backup, placed by start time. Status is
 * carried by shape as well as colour (circle, triangle, square). Each marker is a real button: hover, focus
 * or click it for its time, duration, size and status. Each lane is one Tab stop and the arrow keys move
 * along it. View data lists every backup in a table.
 */
export function HanaBackupTimeline({ backups }: { backups: HanaBackupEntry[] }) {
  const [days, setDays] = useState<WindowDays>('14');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const windowDays = Number(days);

  const view = useMemo(() => {
    const inWindow = backupsInWindow(backups, windowDays);
    const newest = backups.length > 0 ? Math.max(...backups.map((b) => stampMs(b.startedAt))) : 0;
    const end = Math.floor(newest / DAY_MS) * DAY_MS + DAY_MS;
    const start = end - windowDays * DAY_MS;
    const dayTicks = Array.from({ length: windowDays }, (_, i) => start + i * DAY_MS);
    return { inWindow, start, end, dayTicks, summary: summariseBackups(inWindow), insights: backupInsights(inWindow) };
  }, [backups, windowDays]);

  const selected = view.inWindow.find((b) => b.id === selectedId);
  const dotRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  /** Left and right arrows, Home and End move between the markers of one lane, oldest to newest. */
  const onLaneKeyDown = (event: KeyboardEvent<HTMLDivElement>, lane: HanaBackupEntry[]) => {
    const ordered = [...lane].sort((a, b) => stampMs(a.startedAt) - stampMs(b.startedAt));
    const current = ordered.findIndex((b) => b.id === (document.activeElement as HTMLElement | null)?.dataset.backupId);
    const target = event.key === 'ArrowRight' ? current + 1 : event.key === 'ArrowLeft' ? current - 1 : event.key === 'Home' ? 0 : event.key === 'End' ? ordered.length - 1 : null;
    if (target === null || ordered.length === 0) return;
    event.preventDefault();
    const next = ordered[Math.min(Math.max(target, 0), ordered.length - 1)];
    setSelectedId(next.id);
    dotRefs.current[next.id]?.focus();
  };
  const position = (b: HanaBackupEntry) => `${(((stampMs(b.startedAt) - view.start) / (view.end - view.start)) * 100).toFixed(2)}%`;
  const dayLabel = (ms: number) => {
    const d = new Date(ms);
    return `${d.getUTCDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()]}`;
  };
  const tickStep = windowDays > 7 ? 2 : 1;

  return (
    <section className="mv-panel" aria-labelledby="hana-backup-title">
      <div className="mv-panel-header">
        <div>
          <h2 id="hana-backup-title" className="mv-panel-title">Backup Timeline</h2>
          <p className="mv-muted" style={{ margin: 0 }}>Recovery point intelligence · data, log and catalog backups</p>
        </div>
        <SegmentedSwitch
          label="Backup window"
          value={days}
          onChange={(next) => { setDays(next); setSelectedId(null); }}
          options={[{ value: '7', label: '7 days' }, { value: '14', label: '14 days' }]}
        />
      </div>

      <dl className="mv-stat-strip" role="group" aria-label={`Backups in the last ${windowDays} days`}>
        <div><dt>Successful</dt><dd>{view.summary.success}</dd></div>
        <div><dt>Warnings</dt><dd>{view.summary.warning}</dd></div>
        <div><dt>Failed</dt><dd>{view.summary.failed}</dd></div>
        <div><dt>Success rate</dt><dd>{view.summary.successRatePercent}<small>%</small></dd></div>
        <div><dt>Avg duration</dt><dd>{formatDuration(view.summary.avgDurationSec)}</dd></div>
      </dl>

      <InsightList items={view.insights} label="Backup findings" />

      <div className="mv-backup-chart">
        {BACKUP_KINDS.map((kind) => {
          const lane = view.inWindow.filter((b) => b.kind === kind);
          // One Tab stop per lane: the selected marker if it is in this lane, else the newest.
          const stop = lane.find((b) => b.id === selectedId) ?? [...lane].sort((a, b) => stampMs(b.startedAt) - stampMs(a.startedAt))[0];
          return (
            <div key={kind} className="mv-backup-row">
              <span className="mv-backup-lane-label">{LANE_LABEL[kind]}</span>
              <div className="mv-backup-lane" role="group" aria-label={`${kind} lane: ${lane.length} backups in ${windowDays} days, ${lane.filter((b) => b.status === 'success').length} successful`} onKeyDown={(event) => onLaneKeyDown(event, lane)}>
                {lane.map((b) => (
                  <button
                    key={b.id}
                    ref={(el) => { dotRefs.current[b.id] = el; }}
                    type="button"
                    data-backup-id={b.id}
                    tabIndex={stop?.id === b.id ? 0 : -1}
                    className={`mv-backup-dot mv-backup-dot--${b.status}${selectedId === b.id ? ' is-selected' : ''}`}
                    style={{ left: position(b) }}
                    aria-label={describe(b)}
                    aria-pressed={selectedId === b.id}
                    title={describe(b)}
                    onMouseEnter={() => setSelectedId(b.id)}
                    onFocus={() => setSelectedId(b.id)}
                    onClick={() => setSelectedId(b.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
        <div className="mv-backup-row" aria-hidden="true">
          <span className="mv-backup-lane-label" />
          <div className="mv-backup-axis">
            {view.dayTicks.map((ms, i) => (i % tickStep === 0 ? <span key={ms} style={{ left: `${((ms - view.start) / (view.end - view.start)) * 100}%` }}>{dayLabel(ms)}</span> : null))}
          </div>
        </div>
      </div>

      <div className="mv-backup-detail" role="status" aria-live="polite">
        {selected ? (
          <DetailList
            items={[
              { label: 'Type', value: selected.kind },
              { label: 'Started', value: formatBackupStamp(selected.startedAt) },
              { label: 'Duration', value: formatDuration(selected.durationSec) },
              { label: 'Size', value: selected.sizeGb > 0 ? `${selected.sizeGb.toFixed(selected.sizeGb < 1 ? 2 : 1)} GB` : 'No data written' },
              { label: 'Status', value: STATUS_LABEL[selected.status] },
              ...(selected.message ? [{ label: 'Note', value: selected.message }] : []),
            ]}
          />
        ) : (
          'Hover, focus or click a marker for time, duration, size and status.'
        )}
      </div>

      <div className="mv-backup-foot">
        <ul className="mv-backup-legend" aria-label="Legend">
          {(Object.keys(STATUS_LABEL) as HanaBackupStatus[]).map((status) => (
            <li key={status}><span className={`mv-backup-dot mv-backup-dot--${status} mv-backup-dot--static`} aria-hidden="true" />{STATUS_LABEL[status]}</li>
          ))}
        </ul>
        <ViewDataButton
          title={`HANA backups, last ${windowDays} days`}
          columns={[{ header: 'Type' }, { header: 'Started' }, { header: 'Duration', numeric: true }, { header: 'Size', numeric: true }, { header: 'Status' }, { header: 'Note' }]}
          rows={[...view.inWindow].sort((a, b) => stampMs(b.startedAt) - stampMs(a.startedAt)).map((b) => [
            b.kind, formatBackupStamp(b.startedAt), formatDuration(b.durationSec), b.sizeGb > 0 ? `${b.sizeGb.toFixed(2)} GB` : '—', STATUS_LABEL[b.status], b.message ?? '',
          ])}
        />
      </div>
    </section>
  );
}
