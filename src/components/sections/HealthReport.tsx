import { ClipboardCheck, FileSpreadsheet, FileText, Download } from 'lucide-react';
import { healthReportItems } from '@/lib/content';
import { SectionHeading } from '../ui/SectionHeading';
import { useReveal } from '@/lib/hooks';

export default function HealthReport() {
  return (
    <section className="py-12 lg:py-16">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          {/* Left: copy + items */}
          <div>
            <span className="inline-block rounded-full bg-brand-50 px-3.5 py-1 text-xs font-semibold tracking-wider text-brand-700">
              Daily Cloud Health Report
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-navy-900 sm:text-4xl">
              Executive-ready reports, every morning
            </h2>
            <p className="mt-4 text-lg text-navy-500">
              Mavera generates a daily Excel/PDF report with cost, resources, alerts, savings and an AI executive summary — so your team starts every day with a clear picture of cloud health.
            </p>

            <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
              {healthReportItems.map((item, i) => (
                <ReportItem key={item} text={item} index={i} />
              ))}
            </div>
          </div>

          {/* Right: report mockup */}
          <HealthReportMockup />
        </div>
      </div>
    </section>
  );
}

function ReportItem({ text, index }: { text: string; index: number }) {
  const { ref, shown } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`flex items-center gap-2 transition-all duration-500 ${
        shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      }`}
      style={{ transitionDelay: `${(index % 5) * 50}ms` }}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-brand-500 flex-shrink-0" />
      <span className="text-xs font-medium text-navy-700">{text}</span>
    </div>
  );
}

function HealthReportMockup() {
  const { ref, shown } = useReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`relative transition-all duration-700 ${
        shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
    >
      <div className="absolute -inset-3 rounded-2xl bg-gradient-to-br from-brand-100/40 to-save-100/30 blur-xl" />
      <div className="relative rounded-2xl border border-navy-100 bg-white p-6 card-shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-navy-100 pb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-brand-700" />
            <div>
              <div className="text-sm font-bold text-navy-900">Cloud Health Report</div>
              <div className="text-[11px] text-navy-500">Date & monitoring time</div>
            </div>
          </div>
          <div className="flex gap-1.5">
            <span className="rounded-lg bg-save-50 px-2.5 py-1 text-[11px] font-bold text-save-700 flex items-center gap-1">
              <FileSpreadsheet className="h-3 w-3" /> Excel
            </span>
            <span className="rounded-lg bg-danger-50 px-2.5 py-1 text-[11px] font-bold text-danger-600 flex items-center gap-1">
              <Download className="h-3 w-3" /> PDF
            </span>
          </div>
        </div>

        {/* Health status banner — label from the brief */}
        <div className="mt-4 flex items-center justify-between rounded-xl bg-navy-50 border border-navy-100 p-4">
          <div>
            <div className="text-xs font-medium text-navy-600">Overall Health/Status</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-navy-500">FinOps Health Score</div>
          </div>
        </div>

        {/* Report rows — field labels from the brief, no fabricated values */}
        <div className="mt-4 space-y-2">
          {[
            'Cloud / subscription',
            'MTD and daily spend',
            'Forecasted cost',
            'Total resource count',
            'New and deleted resources',
            'Critical and warning alerts',
            'Potential savings',
            'Top cost driver',
            'AI executive summary',
          ].map((label) => (
            <div key={label} className="flex items-center justify-between rounded-lg border border-navy-100 bg-navy-50/30 px-3.5 py-2.5">
              <span className="text-xs text-navy-500">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
