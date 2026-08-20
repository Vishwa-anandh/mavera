import {
  LayoutDashboard,
  BarChart3,
  PiggyBank,
  BellRing,
  TrendingUp,
  Server,
  FileText,
  Sparkles,
  MessageSquare,
  ClipboardCheck,
  Cloud,
  type LucideIcon,
} from 'lucide-react';
import { productModules, valueProps } from '@/lib/content';
import { SectionHeading } from '../ui/SectionHeading';
import { useReveal } from '@/lib/hooks';

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  BarChart3,
  PiggyBank,
  BellRing,
  TrendingUp,
  Server,
  FileText,
  Sparkles,
  MessageSquare,
  ClipboardCheck,
  Cloud,
};

export default function Platform() {
  return (
    <section id="platform" className="py-16 lg:py-18 bg-slate-50 relative">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* Left: Sticky Sidebar */}
          <div className="lg:col-span-5 lg:sticky lg:top-32 space-y-10">
            <div className="text-left">
              <span className="inline-block rounded-full bg-brand-50 px-3.5 py-1 text-xs font-bold tracking-wider text-brand-700 mb-4">
                Platform Overview
              </span>
              <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl lg:text-[40px] lg:leading-[1.1]">
                One platform. <br className="hidden lg:block" /> Every FinOps capability.
              </h2>
              <p className="mt-5 text-lg font-medium text-slate-600 leading-relaxed">
                Mavera is more than a billing dashboard. It helps you understand where money is being spent, why costs change, what can be saved, what resources changed, and what actions should be taken.
              </p>
            </div>

            {/* Value props strip */}
            <div className="grid gap-4 sm:grid-cols-2">
              {valueProps.map((v, i) => (
                <ValuePropChip key={v} text={v} index={i} />
              ))}
            </div>
          </div>

          {/* Right: Scrolling Modules */}
          <div className="lg:col-span-7">
            <h3 className="text-[11px] font-black tracking-widest text-slate-400 mb-8 hidden lg:block">
              Explore our 11 product modules
            </h3>
            <div className="grid sm:grid-cols-2 gap-5 lg:gap-6">
              {productModules.map((m, i) => (
                <ModuleCard key={m.name} module={m} index={i} />
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

function ValuePropChip({ text, index }: { text: string; index: number }) {
  const { ref, shown } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-500 ${
        shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      style={{ transitionDelay: `${(index % 4) * 60}ms` }}
    >
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 mt-0.5">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
      <span className="text-[13px] font-bold text-slate-700 leading-snug">{text}</span>
    </div>
  );
}

function ModuleCard({ module, index }: { module: (typeof productModules)[number]; index: number }) {
  const { ref, shown } = useReveal<HTMLDivElement>();
  const Icon = iconMap[module.icon] ?? LayoutDashboard;

  return (
    <div
      ref={ref}
      className={`group rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm transition-all duration-300 hover:border-brand-300 hover:shadow-xl hover:-translate-y-1 ${
        shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
      style={{ transitionDelay: `${(index % 3) * 80}ms` }}
    >
      <div className="flex justify-between items-start sm:flex-col sm:justify-start">
        {/* Texts: Left on mobile, Bottom on desktop */}
        <div className="order-1 sm:order-2 flex flex-col pt-1 sm:pt-0">
          <h4 className="text-[15px] font-black text-slate-900 leading-tight">{module.name}</h4>
          <p className="text-[11px] font-bold tracking-wide text-brand-600 mt-1">{module.purpose}</p>
        </div>
        
        {/* Icon: Right on mobile, Top on desktop */}
        <div className="order-2 sm:order-1 flex h-11 w-11 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-600 border border-slate-100 transition-colors group-hover:bg-brand-50 group-hover:text-brand-600 group-hover:border-brand-100 sm:mb-5 ml-4 sm:ml-0">
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
      </div>
      <p className="mt-4 text-[13px] font-medium leading-relaxed text-slate-600">
        {module.capabilities}
      </p>
    </div>
  );
}
