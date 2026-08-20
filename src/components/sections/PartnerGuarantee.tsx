import { ArrowRight, ArrowDown, EyeOff, Trash2, Lock, Terminal, ShieldCheck } from 'lucide-react';
import { partnerGuarantee, privacyPromise } from '@/lib/content';
import { useReveal } from '@/lib/hooks';

export default function PartnerGuarantee() {
  return (
    <section className="py-12 lg:py-16">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          {/* Left: Partner Guarantee */}
          <GuaranteeSection />

          {/* Right: Demo Privacy Promise */}
          <PrivacySection />
        </div>
      </div>
    </section>
  );
}

function GuaranteeSection() {
  const { ref, shown } = useReveal<HTMLDivElement>();
  const g = partnerGuarantee;

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
    >
      <span className="inline-flex items-center gap-1.5 rounded-full bg-save-50 px-3.5 py-1 text-xs font-semibold tracking-wider text-save-700">
        <ShieldCheck className="h-3.5 w-3.5" /> Partner Guarantee
      </span>
      <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-navy-900 sm:text-4xl">
        Partner with Maitsys
      </h2>

      {/* Big percentage */}
      <div className="mt-6 flex items-baseline gap-2">
        <span className="font-display text-6xl font-extrabold text-gradient-save">−{g.reductionPercent}%</span>
      </div>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-navy-600">{g.description}</p>

      {/* Before / After / Annualised cards */}
      <div className="mt-8 space-y-4">
        {/* Before → After */}
        <div className="flex items-center gap-4">
          <div className="flex-1 rounded-xl border border-navy-100 bg-white p-4 card-shadow">
            <div className="text-xs font-medium text-navy-500">{g.before.label}</div>
            <div className="mt-1 text-2xl font-bold text-navy-900">{g.before.value}</div>
            <div className="text-[11px] text-navy-400">{g.before.sub}</div>
          </div>

          <div className="flex flex-col items-center">
            <ArrowRight className="hidden h-5 w-5 text-brand-500 sm:block" />
            <ArrowDown className="block h-5 w-5 text-brand-500 sm:hidden" />
            <span className="mt-1 text-[10px] font-bold text-save-600">−{g.reductionPercent}%</span>
          </div>

          <div className="flex-1 rounded-xl border border-save-200 bg-save-50 p-4 card-shadow">
            <div className="text-xs font-medium text-save-700">{g.after.label}</div>
            <div className="mt-1 text-2xl font-bold text-save-700">{g.after.value}</div>
            <div className="text-[11px] text-save-600">{g.after.sub}</div>
          </div>
        </div>

        {/* Annualised */}
        <div className="rounded-xl border border-navy-200 bg-gradient-to-r from-navy-900 to-navy-800 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-navy-300">{g.annualised.label}</div>
              <div className="mt-1 text-3xl font-bold text-white">{g.annualised.value}</div>
              <div className="text-xs text-save-400">{g.annualised.sub}</div>
            </div>
            <div className="hidden h-16 w-16 rounded-full border-4 border-save-500/30 border-t-save-500 animate-spin" style={{ animationDuration: '3s' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PrivacySection() {
  const { ref, shown } = useReveal<HTMLDivElement>();
  const p = privacyPromise;

  const iconMap: Record<string, typeof EyeOff> = {
    EyeOff,
    Trash2,
    Lock,
  };

  return (
    <div
      ref={ref}
      className={`rounded-2xl border border-navy-100 bg-navy-50/50 p-6 sm:p-8 card-shadow-lg transition-all duration-700 ${
        shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
      style={{ transitionDelay: '100ms' }}
    >
      <span className="inline-flex items-center gap-1.5 rounded-full bg-navy-900 px-3.5 py-1 text-xs font-semibold tracking-wider text-white">
        <Lock className="h-3.5 w-3.5" /> Demo Privacy Promise
      </span>
      <h3 className="mt-4 text-xl font-bold text-navy-900">{p.title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-navy-600">{p.subtitle}</p>

      {/* 3 privacy items */}
      <div className="mt-6 space-y-3">
        {p.items.map((item) => {
          const Icon = iconMap[item.icon] ?? EyeOff;
          return (
            <div key={item.title} className="flex items-start gap-3 rounded-xl border border-navy-100 bg-white p-4">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50">
                <Icon className="h-4.5 w-4.5 text-brand-700" />
              </span>
              <div>
                <div className="text-sm font-bold text-navy-900">{item.title}</div>
                <div className="mt-0.5 text-xs text-navy-500">{item.description}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Terminal session */}
      <div className="mt-5 rounded-xl border border-navy-800 bg-navy-950 p-4 font-mono text-xs">
        <div className="flex items-center gap-1.5 mb-3">
          <Terminal className="h-3.5 w-3.5 text-brand-400" />
          <span className="font-sans text-[11px] font-semibold text-navy-300">demo · session</span>
        </div>
        <div className="space-y-1.5">
          {p.sessionLines.map((line) => (
            <div key={line} className="flex items-center gap-2 text-navy-300">
              <span className="text-save-400">✓</span>
              <span>{line}</span>
            </div>
          ))}
          <div className="pt-1.5 mt-1.5 border-t border-white/[0.06] text-brand-300">
            <span className="text-navy-400">$</span> session.end() <span className="text-navy-500">→</span> all_data.wipe()
          </div>
        </div>
      </div>
    </div>
  );
}
