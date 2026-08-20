import {
  Sparkles,
  Activity,
  TrendingUp,
  Lightbulb,
  Search,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';
import { aiCapabilities } from '@/lib/content';
import { SectionHeading } from '../ui/SectionHeading';
import { useReveal } from '@/lib/hooks';

const iconMap: Record<string, LucideIcon> = {
  Sparkles,
  Activity,
  TrendingUp,
  Lightbulb,
  SearchCheck: Search,
  MessageSquare,
};

export default function AIFinOps() {
  return (
    <section id="ai" className="py-12 lg:py-12 bg-navy-50/50 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(47,126,245,0.08),transparent)]" />
      <div className="absolute top-0 right-1/4 h-72 w-72 rounded-full bg-brand-400/10 blur-[100px]" />

      <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full bg-brand-50 px-3.5 py-1 text-xs font-semibold tracking-wider text-brand-700">
            AI FinOps
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-navy-900 sm:text-4xl">
            AI that converts data into decisions
          </h2>
          <p className="mt-4 text-lg text-navy-600">
            Mavera's AI engine goes beyond dashboards — it explains what happened, why it happened, and what you should do next.
          </p>
        </div>

        <div className="mt-16 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {aiCapabilities.map((cap, i) => (
            <AIFeature key={cap.title} capability={cap} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function AIFeature({ capability, index }: { capability: (typeof aiCapabilities)[number]; index: number }) {
  const { ref, shown } = useReveal<HTMLDivElement>();
  const Icon = iconMap[capability.icon] ?? Sparkles;

  return (
    <div
      ref={ref}
      className={`group flex gap-4 transition-all duration-500 ${
        shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
      style={{ transitionDelay: `${(index % 3) * 100}ms` }}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-100">
        <Icon className="h-6 w-6" strokeWidth={2} />
      </div>
      <div>
        <h3 className="text-base font-bold text-navy-900 group-hover:text-brand-700 transition-colors">{capability.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-navy-600">{capability.description}</p>
      </div>
    </div>
  );
}

function AIExecutiveSummaryDemo() {
  const { ref, shown } = useReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`mt-10 rounded-2xl border border-navy-100 bg-white p-6 sm:p-8 shadow-sm transition-all duration-700 ${
        shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
    >
      <div className="grid gap-6 lg:grid-cols-2 lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            <Sparkles className="h-3.5 w-3.5" /> AI Executive Summary
          </div>
          <h3 className="mt-4 text-xl font-bold text-navy-900">
            What happened, why, and what to do about it
          </h3>
          <p className="mt-3 text-sm text-navy-600">
            Every morning, Mavera's AI delivers an executive summary that turns raw billing data into a clear narrative — so your leadership team knows exactly where things stand without opening a dashboard.
          </p>
          <ul className="mt-5 space-y-2 text-sm text-navy-600">
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> What happened — spend changes and anomalies</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> Why it happened — root cause analysis</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> Impact — cost and budget risk assessment</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> Recommended action — what to do next</li>
          </ul>
        </div>

        {/* Demo card */}
        <div className="rounded-xl border border-navy-100 bg-navy-50 p-5 font-mono text-xs text-navy-600 shadow-inner">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-brand-600" />
            <span className="font-semibold text-navy-900 text-[13px] font-sans">AI Executive Summary</span>
          </div>
          <div className="space-y-2 leading-relaxed">
            <p><span className="text-brand-600 font-semibold">What happened:</span> <span>Spend changes, anomalies, and top movers</span></p>
            <p><span className="text-brand-600 font-semibold">Why:</span> <span>Root cause analysis — affected services and resources</span></p>
            <p><span className="text-save-600 font-semibold">Impact:</span> <span>Cost and budget risk assessment</span></p>
            <p><span className="text-save-600 font-semibold">Recommended action:</span> <span>What to do next</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
