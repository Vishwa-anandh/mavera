import type { SapQueueIndicator, SapQueues } from '../../../data-access';
import { TcodeBadge } from './TcodeBadge';

function state(queue: SapQueueIndicator): { label: string; tone: 'success' | 'warning' | 'danger' } {
  if (queue.workers === 0) return { label: 'No workers', tone: 'danger' };
  if (queue.queued > 0) return { label: `${queue.queued} waiting`, tone: queue.queued > queue.workers ? 'danger' : 'warning' };
  return { label: queue.busy > 0 ? 'Working' : 'Idle', tone: 'success' };
}

function Row({ code, name, queue }: { code: string; name: string; queue: SapQueueIndicator }) {
  const s = state(queue);
  return (
    <li className="mv-queue-row">
      <div>
        <strong>{name}</strong> <TcodeBadge code={code} />
        <p className="mv-muted" style={{ margin: 0 }}>{queue.busy} of {queue.workers} {queue.workers === 1 ? 'process' : 'processes'} busy · {queue.queued} queued</p>
      </div>
      <span className={`mv-status mv-status--${s.tone}`}>{s.label}</span>
    </li>
  );
}

/** Update (UPD) and enqueue (ENQ) queues: are workers keeping up, or are requests waiting. */
export function QueueIndicators({ queues }: { queues: SapQueues }) {
  return (
    <section className="mv-panel mv-mini-chart" aria-labelledby="queues-title">
      <div className="mv-mini-chart-head">
        <h3 id="queues-title" className="mv-panel-title">UPD / ENQ queues</h3>
        <p className="mv-muted">Requests waiting for a worker</p>
      </div>
      <ul className="mv-queue-list" aria-label="Update and enqueue queues">
        <Row code="SM13" name="Update (UPD)" queue={queues.upd} />
        <Row code="SM12" name="Enqueue (ENQ)" queue={queues.enq} />
      </ul>
    </section>
  );
}
