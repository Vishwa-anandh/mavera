import { PiggyBank, Check, ArrowRight, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { savingsOpportunities } from '@/lib/content';
import { SectionHeading } from '../ui/SectionHeading';
import { useReveal } from '@/lib/hooks';

export default function Savings() {
  return (
    <section id="savings" className="py-12 lg:py-12">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <SectionHeading
          eyebrow="Savings Center"
          title="Savings-first. Always."
          subtitle="Savings is one of the strongest themes of Mavera. The Savings Center continuously identifies and quantifies every opportunity to reduce your cloud spend."
        />

        <div className="mt-14 grid gap-8 lg:grid-cols-2 lg:items-start">
          {/* Left: savings opportunities list */}
          <div>
            <h3 className="text-lg font-bold text-navy-900 mb-4">Every savings opportunity, identified</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {savingsOpportunities.map((s, i) => (
                <SavingsItem key={s} text={s} index={i} />
              ))}
            </div>
          </div>

          {/* Right: ROI highlight card */}
          <SavingsHighlight />
        </div>
      </div>
    </section>
  );
}

function SavingsItem({ text, index }: { text: string; index: number }) {
  const { ref, shown } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`flex items-start gap-2.5 rounded-xl border border-navy-100 bg-white p-4 card-shadow transition-all duration-500 hover:border-save-200 ${shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      style={{ transitionDelay: `${(index % 5) * 60}ms` }}
    >
      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-save-100 mt-0.5">
        <Check className="h-3 w-3 text-save-600" strokeWidth={3} />
      </span>
      <span className="text-sm font-medium text-navy-700">{text}</span>
    </div>
  );
}

function SavingsHighlight() {
  const { ref, shown } = useReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`rounded-2xl border border-save-200 bg-gradient-to-br from-save-50 via-white to-brand-50 p-8 card-shadow-lg transition-all duration-700 ${shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
    >
      <div className="flex items-center gap-2 mb-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-save-500 shadow-md shadow-save-500/30">
          <PiggyBank className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-base font-bold text-navy-900">Potential Savings</h3>
          <p className="text-xs text-navy-500">Identified across your cloud estate</p>
        </div>
      </div>

      {/* Description — from the brief, no fabricated numbers */}
      <p className="text-sm leading-relaxed text-navy-600">
        Mavera identifies and quantifies every savings opportunity — so you know exactly what can be saved and where to act first.
      </p>

      {/* Breakdown bars — category labels from the brief, no fabricated amounts */}
      <div className="mt-6 space-y-3">
        {[
          { label: 'Rightsizing' },
          { label: 'Unused / underutilized VMs' },
          { label: 'RI / Savings Plans' },
          { label: 'Storage & backup optimization' },
          { label: 'Idle IPs & unattached disks' },
        ].map((s, i) => (
          <div key={s.label}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="font-medium text-navy-700">{s.label}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-navy-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-save-400 to-save-500 transition-all duration-1000"
                style={{ width: `${90 - i * 15}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <Link
        to="/contact"
        className="group mt-6 inline-flex items-center gap-2 rounded-xl bg-save-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-save-600/20 transition-all hover:-translate-y-0.5 hover:bg-save-700"
      >
        Start identifying your savings
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </Link>
    </div>
  );
}
