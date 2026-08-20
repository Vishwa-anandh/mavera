import {
  DollarSign,
  PiggyBank,
  TrendingUp,
  CalendarClock,
  Heart,
  Server,
  PlusCircle,
  BellRing,
  AlertTriangle,
  BadgePercent,
  type LucideIcon,
} from 'lucide-react';
import { keyMetrics, type Metric } from '@/lib/content';

const iconMap: Record<string, LucideIcon> = {
  DollarSign,
  PiggyBank,
  TrendingUp,
  CalendarClock,
  Heart,
  Server,
  PlusCircle,
  BellRing,
  AlertTriangle,
  BadgePercent,
};

const accentMap = {
  brand: { bg: 'bg-brand-50', text: 'text-brand-700', ring: 'ring-brand-100' },
  save: { bg: 'bg-save-50', text: 'text-save-700', ring: 'ring-save-100' },
  warn: { bg: 'bg-warn-50', text: 'text-warn-600', ring: 'ring-warn-100' },
  danger: { bg: 'bg-danger-50', text: 'text-danger-600', ring: 'ring-danger-100' },
};

export default function Metrics() {
  return (
    <section className="py-12 lg:py-16 bg-navy-50/50 overflow-hidden">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">
            Key metrics Mavera surfaces for your enterprise
          </h2>
          <p className="mt-3 text-navy-500">Real-time visibility into the numbers that matter for FinOps</p>
        </div>
      </div>

      <div className="group relative flex overflow-hidden w-full pb-4 pt-2">
        {/* Fading edges */}
        <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-24 sm:w-40 bg-gradient-to-r from-navy-50/50 to-transparent"></div>
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-24 sm:w-40 bg-gradient-to-l from-navy-50/50 to-transparent"></div>
        
        {/* Marquee track */}
        <div className="flex w-max animate-marquee items-center gap-4 hover:[animation-play-state:paused] px-2">
          {[...keyMetrics, ...keyMetrics].map((m, i) => (
            <MetricCard key={`${m.label}-${i}`} metric={m} />
          ))}
        </div>
      </div>
    </section>
  );
}

function MetricCard({ metric }: { metric: Metric }) {
  const Icon = iconMap[metric.icon] ?? DollarSign;
  const a = accentMap[metric.accent];

  return (
    <div className="flex items-center gap-3.5 shrink-0 rounded-2xl border border-navy-100 bg-white p-3 pr-6 card-shadow transition-all duration-300 hover:-translate-y-0.5 hover:card-shadow-md cursor-default">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${a.bg} ring-1 ${a.ring}`}>
        <Icon className={`h-4.5 w-4.5 ${a.text}`} strokeWidth={2} />
      </div>
      <div className="flex flex-col justify-center">
        {metric.value && <div className={`text-lg font-bold ${a.text}`}>{metric.value}</div>}
        <div className={`text-[13px] font-bold text-navy-700 tracking-wide`}>{metric.label}</div>
      </div>
    </div>
  );
}
