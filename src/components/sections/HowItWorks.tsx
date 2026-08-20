import { Plug, Search, Sparkles, ClipboardCheck, ArrowRight, Clock, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { howItWorksSteps } from '@/lib/content';
import { useReveal } from '@/lib/hooks';

const iconMap: Record<string, LucideIcon> = {
  Plug,
  Search,
  Sparkles,
  ClipboardCheck,
};

export default function HowItWorks() {
  return (
    <section className="py-12 lg:py-10">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full bg-brand-50 px-3.5 py-1 text-xs font-semibold tracking-wider text-brand-700">
            How It Works
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-navy-900 sm:text-4xl">
            From connection to compounding savings
          </h2>
          <p className="mt-4 text-lg text-navy-500">
            Four steps from read-only connection to a fully-instrumented FinOps program — typically live in under 48 hours.
          </p>
        </div>

        {/* Steps */}
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {howItWorksSteps.map((step, i) => (
            <StepCard key={step.number} step={step} index={i} isLast={i === howItWorksSteps.length - 1} />
          ))}
        </div>

        {/* Timeline indicator */}
        <div className="mt-10 flex items-center justify-center gap-3 text-sm text-navy-500">
          <div className="flex items-center gap-1.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-save-100 text-xs font-bold text-save-700">
              <Clock className="h-3.5 w-3.5" />
            </span>
            <span className="font-medium">Live in under 48 hours</span>
          </div>
          <ArrowRight className="h-4 w-4 text-navy-300" />
          <Link to="/contact" className="font-semibold text-brand-700 hover:text-brand-600 transition-colors">
            Start your connection
          </Link>
        </div>
      </div>
    </section>
  );
}

function StepCard({
  step,
  index,
  isLast,
}: {
  step: (typeof howItWorksSteps)[number];
  index: number;
  isLast: boolean;
}) {
  const { ref, shown } = useReveal<HTMLDivElement>();
  const Icon = iconMap[step.icon] ?? Plug;

  return (
    <div
      ref={ref}
      className={`relative transition-all duration-600 ${shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
      style={{ transitionDelay: `${index * 120}ms` }}
    >
      {/* Connector line */}
      {!isLast && (
        <div className="absolute top-8 left-[calc(50%+2.5rem)] hidden h-[2px] w-[calc(100%-5rem)] bg-gradient-to-r from-brand-200 to-brand-100 lg:block" />
      )}

      <div className="relative rounded-2xl border border-navy-100 bg-white p-6 card-shadow transition-all hover:card-shadow-lg hover:-translate-y-1">
        {/* Number badge */}
        <div className="flex items-center justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-navy-800 shadow-md">
            <Icon className="h-6 w-6 text-white" strokeWidth={2} />
          </div>
          <span className="font-display text-3xl font-extrabold text-navy-100">{step.number}</span>
        </div>

        <h3 className="mt-4 text-base font-bold text-navy-900">{step.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-navy-500">{step.description}</p>
      </div>
    </div>
  );
}
