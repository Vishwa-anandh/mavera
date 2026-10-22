import { useState } from 'react';
import type { HanaService } from '../../../data-access';
import { orderServices, serviceMemorySummary } from '../model/hanaDetail';
import { SegmentedSwitch } from './SegmentedSwitch';
import { ServiceMemoryChart } from './ServiceMemoryChart';

type ServicesView = 'chart' | 'list';

const gb = (mb: number) => (mb > 0 ? `${(mb / 1024).toFixed(1)} GB` : '—');

/**
 * Active Core Services: the three memory totals, then either the per-service memory chart or the plain
 * list. The list keeps stopped services first so they are hard to miss; the chart ranks by heap.
 */
export function HanaCoreServicesPanel({ services }: { services: HanaService[] }) {
  const [view, setView] = useState<ServicesView>('chart');
  const running = services.filter((s) => s.status === 'running').length;
  const summary = serviceMemorySummary(services);
  const ordered = orderServices(services);

  return (
    <section className="mv-panel" aria-labelledby="hana-services-title">
      <div className="mv-panel-header">
        <div>
          <h2 id="hana-services-title" className="mv-panel-title">Active Core Services</h2>
          <p className="mv-muted" style={{ margin: 0 }}>Memory and resource allocation · {running} of {services.length} running</p>
        </div>
        <SegmentedSwitch
          label="Core services view"
          value={view}
          onChange={setView}
          options={[{ value: 'chart', label: 'Chart' }, { value: 'list', label: 'List' }]}
        />
      </div>

      <dl className="mv-stat-strip" role="group" aria-label="Memory totals across services">
        <div><dt>Heap used</dt><dd>{summary.heapUsedGb.toFixed(1)}<small> GB</small></dd></div>
        <div><dt>Allocated</dt><dd>{summary.allocatedGb.toFixed(1)}<small> GB</small></dd></div>
        <div><dt>Shared</dt><dd>{summary.sharedGb.toFixed(1)}<small> GB</small></dd></div>
      </dl>

      {view === 'chart' ? (
        <ServiceMemoryChart services={services} />
      ) : (
        <div className="mv-table-wrap">
          <table className="mv-table mv-table--stack">
            <thead><tr><th>Service</th><th>Status</th><th className="mv-num">Heap used</th><th className="mv-num">Allocated</th><th className="mv-num">Shared</th></tr></thead>
            <tbody>
              {ordered.map((service) => (
                <tr key={service.name}>
                  <td data-label="Service" className="mv-stack-title">{service.name}</td>
                  <td data-label="Status"><span className={`mv-status ${service.status === 'running' ? 'mv-status--success' : 'mv-status--warning'}`}>{service.status === 'running' ? 'Running' : 'Stopped'}</span></td>
                  <td data-label="Heap used" className="mv-num">{gb(service.memoryMb)}</td>
                  <td data-label="Allocated" className="mv-num">{gb(service.allocatedMb)}</td>
                  <td data-label="Shared" className="mv-num">{gb(service.sharedMb)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
