import { BellRing, TrendingUp, Server, AlertTriangle, ArrowUp, ArrowDown, Plus, Trash2, DollarSign } from 'lucide-react';
import { alertTypes } from '@/lib/content';
import { SectionHeading } from '../ui/SectionHeading';
import { useReveal } from '@/lib/hooks';

export default function AlertsForecast() {
  return (
    <section className="py-12 lg:py-16">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <SectionHeading
          eyebrow="Smart Alerts & Monitoring"
          title="Detect anomalies before they become invoices"
          subtitle="Mavera monitors cost behavior, resource changes, and budget risk in real time — so you catch problems the moment they happen, not when the bill arrives."
        />

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {/* Smart Alerts */}
          <AlertsPanel />
          {/* Forecasting */}
          <ForecastPanel />
          {/* Resource Monitoring */}
          <ResourcePanel />
        </div>
      </div>
    </section>
  );
}

function AlertsPanel() {
  const { ref, shown } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`rounded-2xl border border-navy-100 bg-white p-6 card-shadow-lg transition-all duration-700 ${
        shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-danger-50">
          <BellRing className="h-4.5 w-4.5 text-danger-600" />
        </div>
        <h3 className="text-sm font-bold text-navy-900">Smart Alerts</h3>
      </div>

      <div className="space-y-2.5">
        {[
          { sev: 'critical', title: 'Sudden daily cost spike' },
          { sev: 'warning', title: 'Budget overrun risk' },
          { sev: 'warning', title: 'Unusual resource-count growth' },
          { sev: 'info', title: 'Savings opportunity change' },
        ].map((a, i) => (
          <div key={i} className="flex items-start gap-2.5 rounded-lg border border-navy-100 bg-navy-50/40 p-3">
            <span
              className={`mt-0.5 h-2 w-2 flex-shrink-0 rounded-full ${
                a.sev === 'critical' ? 'bg-danger-500 animate-pulse-dot' :
                a.sev === 'warning' ? 'bg-warn-500' : 'bg-brand-500'
              }`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-navy-900">{a.title}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ForecastPanel() {
  const { ref, shown } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`rounded-2xl border border-navy-100 bg-white p-6 card-shadow-lg transition-all duration-700 ${
        shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
      style={{ transitionDelay: '100ms' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warn-50">
          <TrendingUp className="h-4.5 w-4.5 text-warn-600" />
        </div>
        <h3 className="text-sm font-bold text-navy-900">Forecasting</h3>
      </div>

      {/* Forecast — labels from the brief, no fabricated values */}
      <div className="rounded-xl bg-warn-50 border border-warn-200 p-4 mb-4">
        <div className="text-xs font-medium text-navy-600">Month-end forecast & budget-overrun prediction</div>
      </div>

      <div className="space-y-1.5">
        {[
          { label: 'Actual (MTD)', color: 'bg-brand-500' },
          { label: 'Forecasted', color: 'bg-warn-500' },
          { label: 'Budget', color: 'bg-navy-300' },
        ].map((f) => (
          <div key={f.label}>
            <div className="mb-1 flex justify-between text-[11px]">
              <span className="text-navy-600">{f.label}</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-navy-100">
              <div className={`h-full rounded-full ${f.color}`} style={{ width: '70%' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResourcePanel() {
  const { ref, shown } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`rounded-2xl border border-navy-100 bg-white p-6 card-shadow-lg transition-all duration-700 ${
        shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
      style={{ transitionDelay: '200ms' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50">
          <Server className="h-4.5 w-4.5 text-brand-700" />
        </div>
        <h3 className="text-sm font-bold text-navy-900">Resource Monitoring</h3>
      </div>

      {/* Stats — labels from the brief, no fabricated values */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="rounded-lg border border-navy-100 bg-navy-50/40 p-3">
          <div className="text-xs font-medium text-navy-600">Total Resources</div>
        </div>
        <div className="rounded-lg border border-save-200 bg-save-50 p-3">
          <div className="text-xs font-medium text-save-700">Unused Resources</div>
        </div>
      </div>

      {/* Resource changes — labels from the brief */}
      <div className="space-y-2">
        {[
          { icon: Plus, text: 'New high-cost resource created', color: 'text-warn-600', bg: 'bg-warn-50' },
          { icon: Trash2, text: 'Resource deleted', color: 'text-save-600', bg: 'bg-save-50' },
          { icon: AlertTriangle, text: 'Unused/orphan resource detected', color: 'text-save-600', bg: 'bg-save-50' },
        ].map((r, i) => (
          <div key={i} className="flex items-center gap-2.5 rounded-lg border border-navy-100 bg-navy-50/40 p-2.5">
            <span className={`flex h-6 w-6 items-center justify-center rounded ${r.bg}`}>
              <r.icon className={`h-3.5 w-3.5 ${r.color}`} />
            </span>
            <span className="flex-1 text-xs text-navy-700">{r.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlertTypeChip({ text, index }: { text: string; index: number }) {
  const { ref, shown } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`flex items-center gap-2.5 rounded-xl border border-navy-100 bg-white p-3.5 card-shadow transition-all duration-500 ${
        shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      style={{ transitionDelay: `${(index % 3) * 60}ms` }}
    >
      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-danger-50">
        <BellRing className="h-3.5 w-3.5 text-danger-500" />
      </span>
      <span className="text-xs font-medium text-navy-700">{text}</span>
    </div>
  );
}
