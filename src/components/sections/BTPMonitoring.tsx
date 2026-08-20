import { Cloud, Boxes, Database, Layers, Cpu, Route, AppWindow, Brain } from 'lucide-react';
import { btpItems } from '@/lib/content';
import { SectionHeading } from '../ui/SectionHeading';
import { useReveal } from '@/lib/hooks';

const btpIcons = [Cloud, Boxes, AppWindow, Database, Route, Layers, AppWindow, Brain, Database, Cpu];

export default function BTPMonitoring() {
  const leftItems = btpItems.slice(0, 5);
  const rightItems = btpItems.slice(5, 10);

  return (
    <section id="btp" className="py-12 lg:py-12 bg-navy-50/50">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <SectionHeading
          eyebrow="SAP BTP Monitoring"
          title="Extend FinOps to your SAP BTP landscape"
          subtitle="Mavera brings the same cost and resource visibility to SAP BTP that it brings to Azure and AWS — closing the blind spot that most FinOps tools ignore."
        />

        <div className="mt-14 grid gap-8 lg:grid-cols-2">
          {/* Left Card: 5 items */}
          <BTPCard 
            title="Core Services & Applications" 
            items={leftItems} 
            delay={0}
            startIndex={0}
          />
          
          {/* Right Card: 5 items */}
          <BTPCard 
            title="Integration, AI & Analytics" 
            items={rightItems} 
            delay={150}
            startIndex={5}
          />
        </div>
      </div>
    </section>
  );
}

function BTPCard({ title, items, delay, startIndex }: { title: string, items: string[], delay: number, startIndex: number }) {
  const { ref, shown } = useReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`rounded-2xl border border-navy-100 bg-white p-6 sm:p-8 card-shadow-lg transition-all duration-700 ${
        shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-navy-900 shadow-md">
          <Cloud className="h-5 w-5 text-white" />
        </div>
        <h3 className="text-base sm:text-lg font-bold text-navy-900">{title}</h3>
      </div>

      <div className="space-y-3">
        {items.map((text, idx) => {
          const Icon = btpIcons[(startIndex + idx) % btpIcons.length];
          return (
            <div key={text} className="flex items-center gap-3 rounded-xl border border-navy-100 bg-white p-4 card-shadow-sm transition-all hover:border-brand-200">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50">
                <Icon className="h-4 w-4 text-brand-700" />
              </span>
              <span className="text-sm font-medium text-navy-700">{text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
