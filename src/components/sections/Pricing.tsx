import { Check, Sparkles, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { editions } from '@/lib/content';
import { SectionHeading } from '../ui/SectionHeading';
import { useReveal } from '@/lib/hooks';

export default function Pricing() {
  return (
    <section id="pricing" className="py-12 lg:py-12 bg-navy-50/50">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <SectionHeading
          eyebrow="Subscription Model"
          title="Two editions. One platform."
          subtitle="Start with Standard for core FinOps visibility, or choose the AI edition for AI-driven intelligence across every capability."
        />

        <div className="mt-14 grid gap-6 lg:grid-cols-2 lg:items-stretch max-w-4xl mx-auto">
          {editions.map((e, i) => (
            <EditionCard key={e.name} edition={e} index={i} />
          ))}
        </div>

        {/* Comparison table */}
        <div className="mt-10 max-w-4xl mx-auto">
          <div className="overflow-hidden rounded-xl border border-navy-100 bg-white card-shadow">
            <div className="grid grid-cols-3 border-b border-navy-100 bg-navy-50/50">
              <div className="p-4 text-xs font-bold tracking-wider text-navy-700">Capability</div>
              <div className="p-4 text-center text-xs font-bold tracking-wider text-navy-700">Standard</div>
              <div className="p-4 text-center text-xs font-bold tracking-wider text-brand-700">AI</div>
            </div>
            {comparisonRows.map((row) => (
              <div key={row.label} className="grid grid-cols-3 border-b border-navy-50 last:border-0">
                <div className="p-3.5 text-sm text-navy-700">{row.label}</div>
                <div className="p-3.5 text-center">
                  {row.standard ? (
                    <Check className="h-4 w-4 text-save-500 mx-auto" strokeWidth={3} />
                  ) : (
                    <span className="text-xs text-navy-300">—</span>
                  )}
                </div>
                <div className="p-3.5 text-center">
                  {row.ai ? (
                    <Check className="h-4 w-4 text-brand-600 mx-auto" strokeWidth={3} />
                  ) : (
                    <span className="text-xs text-navy-300">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const comparisonRows = [
  { label: 'CCM', standard: true, ai: true },
  { label: 'Savings Center', standard: true, ai: true },
  { label: 'Resource Monitoring', standard: true, ai: true },
  { label: 'Daily Health Reports', standard: true, ai: true },
  { label: 'Invoice Intelligence', standard: true, ai: true },
  { label: 'SAP BTP Monitoring', standard: true, ai: true },
  { label: 'Smart Alerts (rule-based)', standard: true, ai: true },
  { label: 'AI Executive Summary', standard: false, ai: true },
  { label: 'Smart Anomaly Detection', standard: false, ai: true },
  { label: 'AI Forecasting', standard: false, ai: true },
  { label: 'AI Savings Recommendations', standard: false, ai: true },
  { label: 'AI Root Cause Analysis', standard: false, ai: true },
  { label: 'AI Chat Assistant', standard: false, ai: true },
];

function EditionCard({ edition, index }: { edition: (typeof editions)[number]; index: number }) {
  const { ref, shown } = useReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`relative flex flex-col rounded-2xl border p-7 transition-all duration-500 hover:-translate-y-1 ${
        edition.highlighted
          ? 'border-brand-300 bg-white card-shadow-lg ring-2 ring-brand-200'
          : 'border-navy-100 bg-white card-shadow'
      } ${shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
      style={{ transitionDelay: `${index * 120}ms` }}
    >
      {edition.highlighted && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-600 to-navy-800 px-3.5 py-1 text-xs font-bold text-white shadow-md">
            <Sparkles className="h-3 w-3" /> Recommended
          </span>
        </div>
      )}

      <div className="flex items-center gap-2">
        {edition.aiIncluded ? (
          <Zap className="h-5 w-5 text-brand-600" />
        ) : (
          <div className="h-5 w-5 rounded-full border-2 border-navy-300" />
        )}
        <h3 className="text-xl font-extrabold text-navy-900">{edition.name} Edition</h3>
      </div>
      <p className="mt-2 text-sm text-navy-500">{edition.tagline}</p>

      {/* Core offering */}
      <div className="mt-5 rounded-xl bg-navy-50/60 border border-navy-100 p-4">
        <div className="text-[10px] font-bold tracking-wider text-navy-400 mb-1">Core Offering</div>
        <div className="text-xs text-navy-700">{edition.coreOffering}</div>
      </div>

      {/* AI offering */}
      <div
        className={`mt-3 rounded-xl border p-4 ${
          edition.aiIncluded ? 'border-brand-200 bg-brand-50' : 'border-navy-100 bg-navy-50/30'
        }`}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <Sparkles className={`h-3.5 w-3.5 ${edition.aiIncluded ? 'text-brand-600' : 'text-navy-300'}`} />
          <span className="text-[10px] font-bold tracking-wider text-navy-400">AI Offering</span>
        </div>
        <div className={`text-xs ${edition.aiIncluded ? 'text-navy-800 font-medium' : 'text-navy-400'}`}>
          {edition.aiOffering}
        </div>
      </div>

      {/* Features list */}
      <ul className="mt-5 flex-1 space-y-2.5">
        {edition.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-navy-700">
            <span
              className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${
                edition.aiIncluded && !f.includes('Standard') ? 'bg-brand-100' : 'bg-save-100'
              }`}
            >
              <Check
                className={`h-3 w-3 ${edition.aiIncluded && !f.includes('Standard') ? 'text-brand-600' : 'text-save-600'}`}
                strokeWidth={3}
              />
            </span>
            {f}
          </li>
        ))}
      </ul>

      <Link
        to="/contact"
        className={`mt-6 block rounded-xl py-3 text-center text-sm font-semibold transition-all hover:-translate-y-0.5 ${
          edition.highlighted
            ? 'bg-navy-900 text-white shadow-lg shadow-navy-900/20 hover:bg-navy-800'
            : 'border border-navy-200 bg-white text-navy-800 hover:border-brand-300 hover:bg-brand-50'
        }`}
      >
        {edition.cta}
      </Link>
    </div>
  );
}
