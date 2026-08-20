import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  PiggyBank,
  BellRing,
  Sparkles,
  TrendingUp,
  Check,
  ArrowRight,
  RefreshCw,
  Plus,
  Flame,
  Package,
  FileText,
  CreditCard,
  Lightbulb,
  Activity,
  type LucideIcon,
} from 'lucide-react';
import { featureTabs } from '@/lib/content';
import { useReveal } from '@/lib/hooks';

const tabIcons: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  savings: PiggyBank,
  alerts: BellRing,
  'ai-summary': Sparkles,
  forecasting: TrendingUp,
};

export default function FeatureTabs() {
  const [active, setActive] = useState(0);
  const { ref, shown } = useReveal<HTMLDivElement>();

  return (
    <section className="py-12 lg:py-16 bg-navy-50/50">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full bg-brand-50 px-3.5 py-1 text-xs font-semibold tracking-wider text-brand-700">
            Platform Deep Dive
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-navy-900 sm:text-4xl">
            Every capability, in one platform
          </h2>
          <p className="mt-4 text-lg text-navy-500">
            Explore Mavera's core modules — from unified dashboards to AI-generated executive briefs and confidence-banded forecasting.
          </p>
        </div>

        {/* Tabs */}
        <div className="mt-10 sm:mt-12 flex overflow-x-auto snap-x snap-mandatory gap-3 sm:flex-wrap sm:justify-center [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-2">
          {featureTabs.map((tab, i) => {
            const Icon = tabIcons[tab.id] ?? LayoutDashboard;
            return (
              <button
                key={tab.id}
                onClick={() => setActive(i)}
                className={`snap-start shrink-0 whitespace-nowrap inline-flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${active === i
                    ? 'bg-navy-900 text-white shadow-md'
                    : 'bg-white text-navy-600 border border-slate-200 hover:border-brand-300 hover:text-brand-700 hover:bg-brand-50/50'
                  }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Active panel */}
        <div
          ref={ref}
          className={`mt-10 transition-all duration-500 ${shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        >
          {featureTabs.map((tab, i) => (
            active === i && <FeaturePanel key={tab.id} tab={tab} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturePanel({ tab, index }: { tab: (typeof featureTabs)[number]; index: number }) {
  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:items-center" key={tab.id + index}>
      <div className="animate-fade-up">
        <span className="text-xs font-bold tracking-[0.18em] text-brand-600">{tab.category}</span>
        <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-navy-900">{tab.title}</h3>
        <p className="mt-4 text-sm leading-relaxed text-navy-600">{tab.description}</p>

        <div className="mt-5 rounded-xl border-l-4 border-save-500 bg-save-50 py-3 pl-4 pr-4">
          <p className="text-sm font-bold text-save-700">"{tab.quote}"</p>
        </div>

        <ul className="mt-5 space-y-2.5">
          {tab.bullets.map((b) => (
            <li key={b} className="flex items-center gap-2.5 text-sm text-navy-700">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-save-100">
                <Check className="h-3 w-3 text-save-600" strokeWidth={3} />
              </span>
              {b}
            </li>
          ))}
        </ul>

        <Link
          to="/contact"
          className="group mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-600"
        >
          See it in action
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      <div className="animate-fade-in relative mt-4 sm:mt-0 min-w-0 w-full">
        <div className="absolute -inset-2 sm:-inset-4 bg-gradient-to-tr from-brand-50 to-save-50 opacity-50 rounded-[1.5rem] sm:rounded-[2.5rem] -z-10" />
        <div className="relative w-full min-w-0">
          <FeatureMockup id={tab.id} />
        </div>
      </div>
    </div>
  );
}

function FeatureMockup({ id }: { id: string }) {
  switch (id) {
    case 'dashboard': return <DashboardMockup />;
    case 'savings': return <SavingsMockup />;
    case 'alerts': return <AlertsMockup />;
    case 'ai-summary': return <AISummaryMockup />;
    case 'forecasting': return <ForecastMockup />;
    default: return null;
  }
}

function MockupShell({ path, children }: { path: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[1.5rem] bg-white shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden ring-1 ring-brand-100/50 flex flex-col">
      {/* Browser Toolbar */}
      <div className="flex items-center gap-2 sm:gap-4 bg-white px-3 sm:px-4 py-3 border-b border-slate-100 flex-shrink-0">
        <div className="flex gap-1.5 flex-shrink-0">
          <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-[#ff5f56]" />
          <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-[#ffbd2e]" />
          <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-[#27c93f]" />
        </div>
        <div className="flex-1 flex justify-center min-w-0">
          <div className="flex items-center w-full max-w-sm rounded-md bg-slate-50 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-medium text-slate-400 truncate">
            <span className="truncate">{path}</span>
          </div>
        </div>
        <div className="flex items-center text-[10px] sm:text-xs font-bold text-red-500 flex-shrink-0">
          Live
        </div>
      </div>
      {/* Mockup Content */}
      <div className="p-3 sm:p-5 bg-white">
        <div className="space-y-3 sm:space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}

function DashboardMockup() {
  return (
    <MockupShell path="ccm.maitsys.com/dashboard">
      <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-white p-2 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-brand-50 text-brand-600 text-[10px] font-bold">M</div>
          Maitsys <span className="text-slate-300 font-normal hidden sm:inline">• Cloud Cost Monitor</span>
        </div>
        <span className="rounded bg-brand-50 px-2 py-1 text-[10px] font-medium text-brand-600">3 Clouds</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-0">
        <div>
          <p className="text-[10px] text-slate-500">Welcome back, there 👋</p>
          <h4 className="text-lg font-bold text-slate-900 mt-1">Cloud Cost Overview</h4>
          <p className="text-[10px] font-medium text-emerald-600 flex items-center gap-1 mt-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" /> Showing: 3 Accounts - 3 Providers (Azure, AWS, GCP)
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button className="flex-1 sm:flex-initial flex items-center justify-center gap-1 rounded border border-slate-200 px-2 py-1.5 sm:py-1 text-[10px] font-semibold text-slate-600">
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
          <button className="flex-1 sm:flex-initial flex items-center justify-center gap-1 rounded bg-brand-600 px-2 py-1.5 sm:py-1 text-[10px] font-semibold text-white">
            <Plus className="h-3 w-3" /> Connect Cloud
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="rounded-lg border border-slate-100 bg-white p-3 shadow-sm">
          <p className="text-[10px] text-slate-500">Total Spend (MTD)</p>
          <p className="mt-1 text-base sm:text-lg font-bold text-slate-900">$142,850.20</p>
          <p className="mt-1 text-[10px] font-medium text-emerald-600">↓ 4.2% vs pacing</p>
        </div>
        <div className="rounded-lg border border-slate-100 bg-white p-3 shadow-sm">
          <p className="text-[10px] text-slate-500">Budget Utilization</p>
          <p className="mt-1 text-base sm:text-lg font-bold text-slate-900">84%</p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
            <div className="h-full w-[84%] rounded-full bg-emerald-500" />
          </div>
        </div>
        <div className="rounded-lg border border-slate-100 bg-white p-3 shadow-sm">
          <p className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 inline-block px-1.5 rounded">MSP Savings</p>
          <p className="mt-1 text-base sm:text-lg font-bold text-slate-900">$12,480.00</p>
          <p className="mt-1 text-[10px] font-medium text-brand-600">182 recs ›</p>
        </div>
        <div className="rounded-lg border border-slate-100 bg-white p-3 shadow-sm">
          <p className="text-[10px] text-slate-500">Active Alerts</p>
          <p className="mt-1 text-base sm:text-lg font-bold text-slate-900">7</p>
          <p className="mt-1 text-[10px] font-medium text-amber-500">3 critical</p>
        </div>
      </div>

      <div className="rounded-lg border border-slate-100 bg-white p-3 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2 sm:gap-0">
          <span className="text-xs font-bold text-slate-900">Spend Trend</span>
          <div className="flex gap-3 text-[10px] font-medium">
            <span className="flex items-center gap-1 text-brand-600"><span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> Multi-Cloud</span>
            <span className="flex items-center gap-1 text-slate-500">--- Forecast</span>
          </div>
        </div>
        <div className="relative h-24 w-full">
          <svg viewBox="0 0 400 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
            <path d="M0,80 L80,75 L160,70 L240,60 L320,55 L400,45" fill="none" stroke="#2563eb" strokeWidth="2" />
            <path d="M0,80 L80,75 L160,70 L240,60 L320,55 L400,45 L400,100 L0,100 Z" fill="url(#grad)" opacity="0.1" />
            <path d="M320,55 L400,45" fill="none" stroke="#2563eb" strokeWidth="2" strokeDasharray="4,4" />
            <circle cx="320" cy="55" r="3" fill="#2563eb" />
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="1" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className="flex justify-between mt-2 text-[8px] sm:text-[9px] text-slate-400">
          <span>Feb 26</span>
          <span>Mar 26</span>
          <span>Apr 26</span>
          <span>Jun 26</span>
          <span>Jul 26</span>
          <span>Aug 26</span>
        </div>
      </div>
    </MockupShell>
  );
}

function SavingsMockup() {
  return (
    <MockupShell path="ccm.maitsys.com/savings">
      <div className="rounded-lg border border-slate-100 bg-white p-3 sm:p-4 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
          <div>
            <h4 className="text-base font-bold text-slate-900">Savings Overview</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Optimization opportunities + Maitsys MSP savings (Azure 7.0% · AWS 3.5% · BTP 2.0% · GCP 2.0%).</p>
          </div>
          <button className="flex items-center justify-center gap-1 rounded border border-slate-200 px-2 py-1.5 sm:py-1 text-[11px] font-semibold text-slate-700 w-full sm:w-auto">
            All Providers ▾
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="rounded border border-slate-100 p-2 sm:p-3 bg-slate-50/50">
            <p className="text-[10px] text-slate-500">Total Amount</p>
            <div className="flex justify-between items-center mt-1">
              <p className="text-sm sm:text-base font-bold text-slate-900">$98,420</p>
              <CreditCard className="h-4 w-4 text-brand-400 hidden sm:block" />
            </div>
            <p className="text-[9px] text-slate-400 mt-1">USD</p>
          </div>
          <div className="rounded border border-slate-100 p-2 sm:p-3">
            <p className="text-[10px] text-slate-500">Pre-tax Charges</p>
            <div className="flex justify-between items-center mt-1">
              <p className="text-sm font-bold text-slate-900">$92,118.50</p>
              <FileText className="h-4 w-4 text-emerald-200 hidden sm:block" />
            </div>
          </div>
          <div className="rounded border border-slate-100 p-2 sm:p-3">
            <p className="text-[10px] text-slate-500">Sales Tax (7%)</p>
            <div className="flex justify-between items-center mt-1">
              <p className="text-sm font-bold text-slate-900">$6,301.50</p>
              <Lightbulb className="h-4 w-4 text-amber-200 hidden sm:block" />
            </div>
          </div>
          <div className="rounded border border-slate-100 p-2 sm:p-3">
            <p className="text-[10px] text-slate-500 leading-tight">Total Savings (Potential)</p>
            <div className="flex justify-between items-center mt-1">
              <p className="text-sm font-bold text-emerald-600">$24,850 ↗</p>
            </div>
            <p className="text-[8px] sm:text-[9px] text-slate-400 mt-1">4.12% of annual spend</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="col-span-1 rounded border border-slate-100 p-3">
            <div className="flex justify-between items-center">
              <p className="text-[11px] font-bold text-slate-900">Savings Trend</p>
              <span className="text-[9px] text-slate-500 border rounded px-1 py-0.5">Last 6 Months ▾</span>
            </div>
            <div className="relative h-16 w-full mt-4">
              <svg viewBox="0 0 100 50" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
                <path d="M0,40 L20,38 L40,39 L60,45 L80,10" fill="none" stroke="#10b981" strokeWidth="2" />
                <circle cx="80" cy="10" r="2" fill="#10b981" />
              </svg>
            </div>
          </div>
          
          <div className="col-span-1 rounded border border-slate-100 p-3">
            <p className="text-[11px] font-bold text-slate-900">Savings by Category</p>
            <div className="flex items-center gap-3 mt-3">
              <div className="relative h-12 w-12 rounded-full border-[4px] border-brand-500 border-r-amber-400 border-b-rose-400 border-l-emerald-400 flex items-center justify-center shrink-0">
                <span className="text-[8px] font-bold">$24.8k</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-start gap-1.5 text-[9px]"><div className="h-1.5 w-1.5 rounded-full bg-brand-500 mt-1 shrink-0" /> <span className="leading-tight">RI & Savings.. 42.10%</span></div>
                <div className="flex items-start gap-1.5 text-[9px]"><div className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-1 shrink-0" /> <span className="leading-tight">Unused Res.. 24.50%</span></div>
                <div className="flex items-start gap-1.5 text-[9px]"><div className="h-1.5 w-1.5 rounded-full bg-rose-400 mt-1 shrink-0" /> <span className="leading-tight">Orphaned Dis.. 6.20%</span></div>
              </div>
            </div>
          </div>

          <div className="col-span-1 rounded border border-slate-100 p-3">
            <p className="text-[11px] font-bold text-slate-900">Top Recommendations</p>
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between rounded bg-rose-50/50 p-1.5 border border-rose-100 text-[9px]">
                <span className="flex items-center gap-1 text-slate-700 truncate mr-2">⚡ Rightsize 14 EC2 instanc...</span>
                <span className="text-rose-600 font-bold shrink-0">High</span>
              </div>
              <div className="flex items-center justify-between rounded bg-rose-50/50 p-1.5 border border-rose-100 text-[9px]">
                <span className="flex items-center gap-1 text-slate-700 truncate mr-2">⚡ Delete 184 unattached vo...</span>
                <span className="text-rose-600 font-bold shrink-0">High</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          <div className="flex items-center justify-between rounded border border-slate-100 p-3">
            <div className="pr-2">
              <p className="text-[11px] font-bold text-slate-900">Savings by Optimization</p>
              <p className="text-[9px] text-slate-400 mt-1 leading-tight">RI 15% · Right-sizing 8% · Orphaned disks 2%</p>
            </div>
            <p className="text-sm font-bold text-emerald-600 shrink-0">$18,600.00</p>
          </div>
          <div className="flex items-center justify-between rounded border border-slate-100 p-3">
            <div className="pr-2">
              <p className="text-[11px] font-bold text-slate-900">Maitsys MSP Savings</p>
              <p className="text-[9px] text-slate-400 mt-1 leading-tight">Azure 7.0% · AWS 3.5% · BTP 2.0%</p>
            </div>
            <p className="text-sm font-bold text-emerald-600 shrink-0">$6,250.00</p>
          </div>
        </div>
      </div>
    </MockupShell>
  );
}

function AlertsMockup() {
  return (
    <MockupShell path="ccm.maitsys.com/alerts">
      <div className="rounded-lg border border-slate-100 bg-white p-3 sm:p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3 sm:gap-0">
          <div>
            <h4 className="text-base font-bold text-slate-900">Smart Alerts & Anomalies</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Automated detection of billing spikes, unusual spend, budget breaches, and new resource creation.</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button className="flex-1 sm:flex-initial flex items-center justify-center gap-1 rounded border border-slate-200 px-2 py-1.5 sm:py-1 text-[10px] font-semibold text-brand-600">
              ✓ Mark All Read
            </button>
            <button className="flex-1 sm:flex-initial flex items-center justify-center gap-1 rounded border border-slate-200 px-2 py-1.5 sm:py-1 text-[10px] font-semibold text-slate-700">
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded border border-slate-100 p-3 relative overflow-hidden">
            <p className="text-xl font-bold text-slate-900">38</p>
            <p className="text-[10px] text-slate-500 mt-1">Total Active</p>
            <Activity className="absolute bottom-2 right-2 h-5 w-5 text-amber-500 opacity-20 sm:opacity-100 sm:h-4 sm:w-4" />
          </div>
          <div className="rounded border border-slate-100 p-3 relative overflow-hidden">
            <p className="text-xl font-bold text-slate-900">12</p>
            <p className="text-[10px] text-slate-500 mt-1">Unread</p>
            <BellRing className="absolute bottom-2 right-2 h-5 w-5 text-amber-400 opacity-20 sm:opacity-100 sm:h-4 sm:w-4" />
          </div>
          <div className="rounded border border-slate-100 p-3 relative overflow-hidden">
            <p className="text-xl font-bold text-slate-900">5</p>
            <p className="text-[10px] text-slate-500 mt-1">Critical</p>
            <Flame className="absolute bottom-2 right-2 h-5 w-5 text-rose-500 opacity-20 sm:opacity-100 sm:h-4 sm:w-4" />
          </div>
          <div className="rounded border border-slate-100 p-3 relative overflow-hidden">
            <p className="text-xl font-bold text-slate-900">21</p>
            <p className="text-[10px] text-slate-500 mt-1">New Resources</p>
            <Package className="absolute bottom-2 right-2 h-5 w-5 text-amber-700 opacity-20 sm:opacity-100 sm:h-4 sm:w-4" />
          </div>
        </div>

        <div className="mt-4 w-full overflow-x-auto pb-3 rounded-b-lg">
          <div className="min-w-[450px]">
            <div className="grid grid-cols-12 gap-2 text-[9px] font-bold text-slate-400 border-b border-slate-100 pb-2 mb-2 px-2">
              <div className="col-span-3">Type</div>
              <div className="col-span-2">Severity</div>
              <div className="col-span-2">Provider</div>
              <div className="col-span-3">Message</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            
            <div className="space-y-1">
              <div className="grid grid-cols-12 gap-2 text-[10px] text-slate-700 items-center p-2 rounded hover:bg-slate-50">
                <div className="col-span-3 flex items-center gap-1.5 font-medium"><Package className="h-3 w-3 text-amber-700" /> New Resource</div>
                <div className="col-span-2"><span className="px-1.5 py-0.5 rounded text-[8px] font-bold border border-amber-200 text-amber-700">Medium</span></div>
                <div className="col-span-2 font-bold text-brand-600">AZURE</div>
                <div className="col-span-3 truncate text-slate-500">3 new resource(s) detected on Prod...</div>
                <div className="col-span-2 text-right text-brand-600 text-[9px]">Read · Resolve</div>
              </div>
              
              <div className="grid grid-cols-12 gap-2 text-[10px] text-slate-700 items-center p-2 rounded bg-rose-50/30">
                <div className="col-span-3 flex items-center gap-1.5 font-medium"><Activity className="h-3 w-3 text-brand-400" /> Forecast Alert</div>
                <div className="col-span-2"><span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-rose-100 text-rose-700">Critical</span></div>
                <div className="col-span-2 font-bold text-amber-600">AWS</div>
                <div className="col-span-3 truncate text-slate-500">Forecast alert for Prod_AWS_US...</div>
                <div className="col-span-2 text-right text-brand-600 text-[9px]">Read · Resolve</div>
              </div>

              <div className="grid grid-cols-12 gap-2 text-[10px] text-slate-700 items-center p-2 rounded bg-rose-50/30">
                <div className="col-span-3 flex items-center gap-1.5 font-medium"><Flame className="h-3 w-3 text-amber-500" /> Unusual Spend</div>
                <div className="col-span-2"><span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-rose-100 text-rose-700">Critical</span></div>
                <div className="col-span-2 font-bold text-blue-500">GCP</div>
                <div className="col-span-3 truncate text-slate-500">Unusual spend detected on BigQuery...</div>
                <div className="col-span-2 text-right text-brand-600 text-[9px]">Read · Resolve</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MockupShell>
  );
}

function AISummaryMockup() {
  return (
    <MockupShell path="ccm.maitsys.com/executive-summary">
      <div className="rounded-xl border border-rose-100 bg-white shadow-sm overflow-hidden">
        <div className="bg-rose-50 px-3 sm:px-4 py-3 border-b border-rose-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-rose-600" />
            <span className="text-sm font-bold text-slate-900">Weekly Executive Brief</span>
          </div>
          <span className="text-[10px] font-medium text-slate-500">Wk 21 • 2026</span>
        </div>
        
        <div className="p-3 sm:p-4 space-y-4">
          <div>
            <h5 className="text-[10px] font-bold text-rose-600 mb-1.5">Headline</h5>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
              Cloud spend ended the week at <strong className="text-slate-900">$184,250</strong>, <span className="text-rose-600 font-medium">4.2% under</span> pacing. Azure absorbed the largest movement (<span className="text-amber-500 font-medium">+12%</span>) driven by a BigQuery workload migration; this is on-plan.
            </p>
          </div>

          <div>
            <h5 className="text-[10px] font-bold text-rose-600 mb-1.5">Top Movers</h5>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-center gap-2">
                <span className="text-rose-500 font-bold text-[10px]">▲</span>
                <span className="leading-tight">EC2 rightsizing landed — $42k realised</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-500 font-bold text-[10px]">▲</span>
                <span className="leading-tight">Azure Storage egress +18% — investigate</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold text-[10px]">▼</span>
                <span className="leading-tight">GCP idle VMs cleaned — $11k saved</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3">
            <button className="flex-1 rounded-md bg-[#0f172a] px-4 py-2 text-[11px] font-bold text-white hover:bg-slate-800 text-center">
              Export PDF
            </button>
            <button className="flex-1 rounded-md border border-slate-200 bg-white px-4 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50 text-center">
              Edit brief
            </button>
          </div>
        </div>
      </div>
    </MockupShell>
  );
}

function ForecastMockup() {
  return (
    <MockupShell path="ccm.maitsys.com/forecast">
      <div className="rounded-lg border border-slate-100 bg-white p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-rose-500" />
            90-Day Forecast
          </h4>
          <span className="text-[9px] text-slate-400 font-medium border border-slate-100 rounded px-1.5 py-0.5">P50 / P80 / P95</span>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5 sm:mb-6 text-center">
          <div className="rounded border border-slate-100 p-2">
            <p className="text-[9px] text-slate-500 mb-1">30d</p>
            <p className="text-sm sm:text-base font-bold text-slate-900">$874k</p>
          </div>
          <div className="rounded border border-slate-100 p-2 bg-slate-50/50">
            <p className="text-[9px] text-slate-500 mb-1">60d</p>
            <p className="text-sm sm:text-base font-bold text-rose-600">$921k</p>
          </div>
          <div className="rounded border border-slate-100 p-2">
            <p className="text-[9px] text-slate-500 mb-1">90d</p>
            <p className="text-sm sm:text-base font-bold text-rose-700">$968k</p>
          </div>
        </div>

        <div className="relative h-24 sm:h-32 w-full mt-4">
          <div className="absolute top-0 bottom-0 left-[50%] border-l border-dashed border-slate-300"></div>
          
          <div className="absolute top-0 left-0 text-[8px] text-slate-400">Actual</div>
          <div className="absolute top-0 right-0 text-[8px] text-rose-500">Forecast</div>

          <svg viewBox="0 0 400 120" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
            {/* Confidence Band */}
            <path d="M200,65 L400,30 L400,60 L200,80 Z" fill="#fda4af" opacity="0.3" />
            
            {/* Historical Solid Line */}
            <path d="M0,95 L40,90 L80,92 L120,80 L160,85 L200,65" fill="none" stroke="#0f172a" strokeWidth="3" />
            
            {/* Projected Dotted Line */}
            <path d="M200,65 L400,45" fill="none" stroke="#e11d48" strokeWidth="3" strokeDasharray="8,6" />
          </svg>
        </div>
      </div>
    </MockupShell>
  );
}
