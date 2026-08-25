import { useState } from 'react';
import { Cloud, BrainCircuit, ShieldCheck, BarChart3, ChevronDown, type LucideIcon } from 'lucide-react';
import { scaleFeatures, differentiators } from '@/lib/content';
import { useReveal } from '@/lib/hooks';

const iconMap: Record<string, LucideIcon> = {
  Cloud,
  BrainCircuit,
  ShieldCheck,
  BarChart3,
};

export default function BuiltForScale() {
  const additionalPoints = [
    // Multi-Cloud Native
    [
      "Unified billing across all major providers",
      "Agentless read-only API integration",
      "Centralized resource tagging & mapping",
    ],
    // Enterprise Security (or AI Engine based on order)
    [
      "Predictive machine learning algorithms",
      "Automated anomaly detection alerts",
      "Historical trend analysis & forecasting",
    ],
    // Enterprise Security
    [
      "SOC 2 Type II & ISO 27001 Certified",
      "SAML/SSO integration (Azure AD, Okta)",
      "Strict Role-Based Access Control (RBAC)",
    ],
    // FinOps Aligned
    [
      "Mapped to FinOps Foundation framework",
      "Customizable dashboard layouts",
      "Scheduled email and Slack reports",
    ]
  ];

  return (
    <section id="security" className="py-20 lg:py-10 bg-slate-50 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(47,126,245,0.05),transparent)] pointer-events-none" />

      <div className="relative mx-auto max-w-[1400px] px-5 lg:px-8 z-10">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <span className="inline-block rounded-full border border-brand-200 bg-brand-100/50 px-3.5 py-1 text-xs font-semibold tracking-wider text-brand-700">
            Built For Scale
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Enterprise-grade by design
          </h2>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            Read-only by default. SOC 2 & ISO 27001. Multi-tenant isolation. SSO + SCIM. Built for the most demanding cloud environments.
          </p>
        </div>

        {/* 4 Cards Per Row Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {scaleFeatures.map((feature, i) => {
            const Icon = iconMap[feature.icon] ?? Cloud;
            const points = additionalPoints[i] || additionalPoints[0];

            return (
              <div 
                key={feature.title} 
                className="flex flex-col rounded-3xl bg-white border border-slate-200 shadow-sm p-8 transition-all hover:shadow-lg hover:-translate-y-1 hover:border-brand-200"
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-xl font-bold text-slate-900">{feature.title}</h3>
                  <div className="flex shrink-0 h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 border border-brand-100">
                    <Icon className="h-6 w-6" strokeWidth={1.5} />
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed flex-1">
                  {feature.description}
                </p>

                <div className="mt-5 pt-5 border-t border-slate-100">
                  <h4 className="text-[11px] font-bold tracking-widest text-slate-400 mb-4">Key Capabilities</h4>
                  <ul className="space-y-3">
                    {points.map((p, idx) => (
                      <li key={idx} className="flex gap-3 text-slate-700 text-[13px] font-medium items-start">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-100 mt-0.5">
                          <svg className="h-2.5 w-2.5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                        <span className="leading-snug">{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* Differentiators */}
        <div className="mt-16 mx-auto rounded-3xl border border-slate-200 bg-white p-8 lg:p-10 shadow-sm relative overflow-hidden">
          <h3 className="text-center text-xl font-bold text-slate-900 mb-8 relative z-10">Key Differentiators</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 relative z-10">
            {differentiators.map((d, i) => (
              <DifferentiatorItem key={d} text={d} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function DifferentiatorItem({ text, index }: { text: string; index: number }) {
  const { ref, shown } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-100 px-4 py-4 transition-all duration-700 ${
        shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 ring-1 ring-brand-200">
        <svg className="h-3.5 w-3.5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
      <span className="text-sm font-semibold text-slate-700">{text}</span>
    </div>
  );
}
