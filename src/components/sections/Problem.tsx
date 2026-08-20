import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Lightbulb, TrendingUp, PiggyBank, BellRing, Server, CalendarClock, Database } from 'lucide-react';
import { cloudProblems } from '@/lib/content';

const problemData = [
  { icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', desc: "Lack of visibility makes it difficult to understand what's driving your cloud spend." },
  { icon: PiggyBank, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', desc: "Valuable opportunities remain hidden in complex usage and configurations." },
  { icon: BellRing, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100', desc: "No real-time alerts mean surprises show up at the end of the month." },
  { icon: Server, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-100', desc: "Resource sprawl and changes go untracked, leading to unnecessary spend." },
  { icon: CalendarClock, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', desc: "Delayed insights make it impossible to take action before it's too late." },
  { icon: Database, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', desc: "SAP BTP isn't covered by traditional tools, leaving a critical gap in your FinOps strategy." }
];

export default function Problem() {
  return (
    <section className="py-12 lg:py-12 bg-[#fafbfe] relative overflow-hidden">
      <div className="mx-auto max-w-[1200px] px-5 lg:px-8 relative z-10">

        {/* Header - Compact */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3.5 py-1 text-xs font-semibold tracking-wider text-brand-700 mb-4">
            The Challenges
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-3">
            The FinOps Disconnect
          </h2>
          <p className="text-[15px] text-slate-600 max-w-2xl mx-auto">
            Hidden issues that lead to overspending and lost opportunities.
          </p>
        </div>

        {/* High-Density Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {cloudProblems.map((p, i) => {
            const data = problemData[i];

            return (
              <div
                key={i}
                className="bg-white rounded-xl p-5 border border-slate-200/60 hover:border-brand-200 shadow-sm hover:shadow-md transition-all duration-200 flex items-start gap-4 group"
              >
                <div className={`w-10 h-10 rounded-lg ${data.bg} ${data.border} border flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                  <data.icon className={`w-5 h-5 ${data.color}`} strokeWidth={2} />
                </div>

                <div>
                  <h3 className="text-[15px] font-bold text-slate-900 leading-tight mb-1.5 group-hover:text-brand-600 transition-colors">
                    {p}
                  </h3>
                  <p className="text-[13px] text-slate-500 leading-relaxed">
                    {data.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA - Compact */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-sm">
          <div className="flex items-center gap-4 w-full sm:w-auto text-center sm:text-left">
            <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center text-brand-600 flex-shrink-0 border border-brand-100">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-[16px] font-bold text-slate-900">
                You can't optimize what you can't see.
              </h4>
              <p className="text-[13px] text-slate-500 mt-0.5">
                Mavera brings full visibility and control to your cloud spend.
              </p>
            </div>
          </div>
          <Link
            to="/contact"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm transition-all hover:bg-brand-600 whitespace-nowrap"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

      </div>
    </section>
  );
}
