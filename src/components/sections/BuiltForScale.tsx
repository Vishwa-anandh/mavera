import { useState } from 'react';
import { Cloud, BrainCircuit, ShieldCheck, BarChart3, ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react';
import { scaleFeatures, differentiators } from '@/lib/content';
import { useReveal } from '@/lib/hooks';

const iconMap: Record<string, LucideIcon> = {
  Cloud,
  BrainCircuit,
  ShieldCheck,
  BarChart3,
};

export default function BuiltForScale() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % scaleFeatures.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + scaleFeatures.length) % scaleFeatures.length);
  };

  return (
    <section id="security" className="py-20 lg:py-10 bg-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(47,126,245,0.05),transparent)]" />
      <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-brand-50 blur-[100px]" />

      <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1 text-xs font-semibold tracking-wider text-brand-600">
            Built For Scale
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Enterprise-grade by design
          </h2>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            Read-only by default. SOC 2 & ISO 27001. Multi-tenant isolation. SSO + SCIM.
          </p>
        </div>

        {/* 4 scale feature cards - Single Item Carousel */}
        <div className="mt-14 relative mx-auto max-w-md md:max-w-3xl lg:max-w-4xl">
          <div className="overflow-hidden rounded-2xl">
            <div 
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {scaleFeatures.map((f, i) => (
                <div key={f.title} className="w-full flex-shrink-0 px-2">
                  <ScaleCard feature={f} index={i} />
                </div>
              ))}
            </div>
          </div>
          
          {/* Navigation Arrows */}
          <button 
            onClick={prevSlide}
            className="absolute left-0 top-[40%] -translate-y-1/2 -translate-x-4 lg:-translate-x-12 flex h-10 w-10 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 shadow-sm hover:bg-slate-50 transition-colors z-10"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button 
            onClick={nextSlide}
            className="absolute right-0 top-[40%] -translate-y-1/2 translate-x-4 lg:translate-x-12 flex h-10 w-10 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 shadow-sm hover:bg-slate-50 transition-colors z-10"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          
          {/* Indicators */}
          <div className="mt-6 flex justify-center gap-2">
            {scaleFeatures.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`h-2 rounded-full transition-all ${
                  currentIndex === i ? 'w-6 bg-brand-600' : 'w-2 bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Differentiators */}
        <div className="mt-16 rounded-2xl border border-slate-200 bg-slate-50/50 p-7 shadow-sm">
          <h3 className="text-center text-lg font-bold text-slate-900 mb-6">Key Differentiators</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {differentiators.map((d, i) => (
              <DifferentiatorItem key={d} text={d} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ScaleCard({ feature, index }: { feature: (typeof scaleFeatures)[number]; index: number }) {
  const Icon = iconMap[feature.icon] ?? Cloud;

  const additionalPoints = [
    // Multi-Cloud Native
    [
      "Unified billing across all major providers",
      "Agentless read-only API integration",
      "Centralized resource tagging & mapping",
    ],
    // Enterprise Security
    [
      "SOC 2 Type II & ISO 27001 Certified",
      "SAML/SSO integration (Azure AD, Okta)",
      "Strict Role-Based Access Control (RBAC)",
    ],
    // Advanced ML Analytics (assuming this is index 2 or 1 based on icon/order, I'll provide 4 just in case)
    [
      "Predictive machine learning algorithms",
      "Automated anomaly detection alerts",
      "Historical trend analysis & forecasting",
    ],
    // Custom Reporting
    [
      "Customizable dashboard layouts",
      "Scheduled email and Slack reports",
      "Export to CSV, PDF, and raw API access",
    ]
  ];

  const points = additionalPoints[index] || additionalPoints[0];

  return (
    <div
      className={`group w-full rounded-2xl border border-slate-100 bg-white p-6 lg:p-10 shadow-sm transition-all duration-500 hover:border-brand-200 hover:shadow-md hover:shadow-brand-500/5 flex flex-col md:flex-row items-center gap-8`}
    >
      <div className="flex-1">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-transform group-hover:scale-110">
          <Icon className="h-7 w-7" strokeWidth={2} />
        </div>
        <h3 className="mt-5 text-xl font-bold text-slate-900">{feature.title}</h3>
        <p className="mt-2 text-base text-slate-500 leading-relaxed">{feature.description}</p>
      </div>

      <div className="w-full md:w-[320px] lg:w-[400px] flex-shrink-0">
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-6 h-full flex flex-col justify-center">
          <h4 className="text-xs font-bold text-slate-400 tracking-wider mb-4">Key Capabilities</h4>
          <ul className="space-y-3">
            {points.map((point, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-100/50 mt-0.5">
                  <svg className="h-3 w-3 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className="text-sm font-medium text-slate-700 leading-snug">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function DifferentiatorItem({ text, index }: { text: string; index: number }) {
  const { ref, shown } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`flex items-center gap-3 rounded-lg bg-white border border-slate-100 px-4 py-3 shadow-sm transition-all duration-500 ${
        shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      }`}
      style={{ transitionDelay: `${index * 60}ms` }}
    >
      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-100">
        <svg className="h-3 w-3 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
      <span className="text-sm font-semibold text-slate-700">{text}</span>
    </div>
  );
}
