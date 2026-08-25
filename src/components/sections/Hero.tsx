import { 
  ArrowRight, Play, ShieldCheck, CheckCircle2, Sparkles, LayoutDashboard,
  Cloud, PiggyBank, Bell, Settings, CreditCard, Users, Sun, RefreshCw, Plus,
  Target, TrendingUp, AlertTriangle, Lightbulb, Bot, ChevronDown
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { heroContent } from '@/lib/content';

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden py-12 lg:py-12">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-navy-50 via-white to-white" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(47,126,245,0.10),transparent)]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[400px] w-[700px] rounded-full bg-brand-100/40 blur-[100px]" />

      <div className="relative mx-auto max-w-[1400px] px-5 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left: copy */}
          <div className="text-center lg:text-left z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-xs font-semibold text-brand-700">
              <Sparkles className="h-3.5 w-3.5" />
              AI-Powered Cloud & SAP BTP FinOps Platform
            </div>

            <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-navy-900 sm:text-5xl lg:text-[52px]">
              Turn Cloud Spend Into{' '}
              <span className="text-brand-600">Actionable Savings.</span>
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-relaxed text-navy-600 lg:mx-0 mx-auto">
              {heroContent.subhead}
            </p>

            {/* Tagline */}
            <div className="mt-5 flex flex-wrap justify-center gap-2 lg:justify-start">
              {heroContent.tagline.split('. ').filter(Boolean).map((word) => (
                <span key={word} className="rounded-lg bg-navy-900 px-3 py-1 text-xs font-bold tracking-wider text-white">
                  {word.replace('.', '')}
                </span>
              ))}
            </div>

            {/* CTAs */}
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start justify-center">
              <Link
                to="/contact"
                className="group inline-flex items-center gap-2 rounded-xl bg-navy-900 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-navy-900/20 transition-all hover:bg-navy-800 hover:-translate-y-0.5"
              >
                {heroContent.primaryCta}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="#platform"
                className="inline-flex items-center gap-2 rounded-xl border border-navy-200 bg-white px-7 py-3.5 text-sm font-semibold text-navy-800 shadow-sm transition-all hover:border-brand-300 hover:bg-brand-50 hover:-translate-y-0.5"
              >
                <Play className="h-4 w-4 text-brand-600" />
                {heroContent.secondaryCta}
              </a>
            </div>

            {/* Trust line */}
            <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-navy-500 lg:justify-start">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-save-500" /> Azure, AWS & SAP BTP
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-save-500" /> Enterprise-grade security
              </span>
            </div>
          </div>

          {/* Right: dashboard mockup */}
          <div className="relative mt-12 lg:mt-0 w-full max-w-[800px] xl:max-w-[900px] mx-auto lg:ml-auto lg:mr-0">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-brand-200/30 to-save-200/20 blur-2xl" />
            <div className="relative">
              <HeroDashboard />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroDashboard() {
  return (
    <div className="relative flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 overflow-hidden w-full text-slate-800">
      
      {/* Browser Top Bar */}
      <div className="flex items-center gap-3 border-b border-slate-100 bg-white px-3 py-2">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
          <div className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
          <div className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
        </div>
        <div className="flex-1 flex ml-2">
          <div className="flex items-center rounded bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-400 max-w-[180px] truncate">
            mavera.maitsys.com/dashboard
          </div>
        </div>
        <div className="flex items-center gap-1 rounded bg-brand-50 px-2 py-1 text-[10px] font-bold text-brand-600 border border-brand-100">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse" /> Live Azure
        </div>
      </div>

      <div className="flex flex-1 h-[480px] bg-[#fafbfe]">
        
        {/* Sidebar */}
        <div className="w-[180px] hidden md:flex flex-shrink-0 border-r border-slate-100 bg-white flex-col p-3 overflow-y-auto">
          {/* Logo area */}
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-4">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-rose-500 text-white font-bold text-xs">M</div>
            <div>
              <div className="font-bold text-xs text-slate-900">Maitsys</div>
              <div className="text-[8px] text-slate-400">Cloud Cost Monitor</div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-brand-50 text-brand-600 px-2 py-1.5 font-bold text-xs mb-4">
            <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
          </div>

          <div className="space-y-4 flex-1">
            <NavSection title="Cloud Costs">
              <NavItem icon={<Cloud className="h-3 w-3" />} label="Azure Costs" active />
            </NavSection>

            <NavSection title="Optimisation">
              <div className="flex items-center justify-between px-1.5 py-1 text-xs text-slate-600 font-medium">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full border border-slate-300" />
                  Savings <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[8px] px-1 rounded font-bold">MSP</span>
                </div>
                <ChevronDown className="h-3 w-3" />
              </div>
              <NavItem icon={<Bell className="h-3 w-3 text-amber-500" />} label="Smart Alerts" bg="bg-slate-50 mt-1" />
            </NavSection>

            <NavSection title="Governance">
              <NavItem icon={<div className="h-2.5 w-2.5 bg-cyan-500 rounded-sm" />} label="Budgets" />
            </NavSection>

            <NavSection title="Account">
              <NavItem icon={<CreditCard className="h-3 w-3 text-slate-400" />} label="Subscription" />
            </NavSection>
          </div>

          {/* Bottom Sidebar */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="flex items-center gap-2 px-1.5">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white font-bold text-[10px]">A</div>
              <span className="text-xs font-bold text-slate-900">Anbarasu</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 overflow-y-auto relative pb-16">
          {/* Header */}
          <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Cloud Cost Overview</h2>
              <div className="inline-flex items-center gap-1 mt-1 rounded-full px-1 py-0.5 text-[9px] font-bold text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Showing: 1 Account - 1 Provider <span className="text-slate-400 font-medium">(Azure)</span>
              </div>
            </div>
            <div className="flex gap-1.5">
              <button className="flex items-center gap-1 rounded bg-white border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 shadow-sm">
                <RefreshCw className="h-3 w-3" /> Refresh
              </button>
              <button className="flex items-center gap-1 rounded bg-brand-600 px-2 py-1 text-[10px] font-bold text-white shadow-sm">
                <Plus className="h-3 w-3" /> Connect
              </button>
            </div>
          </div>

          {/* Grid Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            <div className="rounded-lg border border-slate-100 bg-white p-3 shadow-sm min-w-0">
              <div className="flex justify-between items-start mb-1.5">
                <div className="p-0.5 rounded bg-brand-50 text-brand-600 flex-shrink-0"><div className="text-xs font-bold w-3.5 h-3.5 text-center leading-none">$</div></div>
                <span className="text-[8px] text-slate-400 font-medium truncate ml-1">Total Spend</span>
              </div>
              <div className="text-lg font-bold text-slate-900 truncate" title="$53,396.54">$53,396.54</div>
              <div className="mt-1.5 text-[9px] font-bold text-rose-600 truncate" title="↗ 1976.2% vs prev">↗ 1976.2% vs prev</div>
            </div>

            <div className="rounded-lg border border-slate-100 bg-white p-3 shadow-sm min-w-0">
              <div className="flex justify-between items-start mb-1.5">
                <div className="p-0.5 rounded bg-rose-50 text-rose-600 flex-shrink-0"><Target className="h-3.5 w-3.5" /></div>
                <span className="text-[8px] text-slate-400 font-medium truncate ml-1">Budget</span>
              </div>
              <div className="text-lg font-bold text-slate-900 truncate">100%</div>
              <div className="mt-1.5 h-1 w-full rounded-full bg-slate-100">
                <div className="h-full w-full rounded-full bg-rose-600" />
              </div>
            </div>

            <div className="rounded-lg border border-slate-100 bg-white p-3 shadow-sm hidden md:block min-w-0">
              <div className="flex justify-between items-start mb-1.5">
                <div className="p-0.5 rounded bg-emerald-50 text-emerald-600 flex-shrink-0"><Sparkles className="h-3.5 w-3.5" /></div>
                <span className="text-[8px] font-bold text-emerald-700 truncate ml-1">MSP Savings</span>
              </div>
              <div className="text-lg font-bold text-slate-900 truncate" title="$3,737.76">$3,737.76</div>
              <div className="text-[9px] font-bold text-emerald-600 mt-1 flex items-center gap-1 truncate"><span className="h-1 w-1 rounded-full bg-emerald-500 flex-shrink-0"/> <span className="truncate">CSP Azure</span></div>
            </div>

            <div className="rounded-lg border border-slate-100 bg-white p-3 shadow-sm hidden md:block min-w-0">
              <div className="flex justify-between items-start mb-1.5">
                <div className="p-0.5 rounded bg-amber-50 text-amber-500 flex-shrink-0"><Bell className="h-3.5 w-3.5" /></div>
                <span className="text-[8px] text-slate-400 font-medium truncate ml-1">Active Alerts</span>
              </div>
              <div className="text-lg font-bold text-slate-900 truncate">10</div>
              <div className="text-[9px] font-bold text-rose-600 mt-1 truncate">15 critical</div>
            </div>
          </div>

          {/* Spend Trend Chart */}
          <div className="rounded-lg border border-slate-100 bg-white p-3 shadow-sm mb-3">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xs font-bold text-slate-900">Spend Trend</h3>
              <div className="flex bg-slate-50 rounded-md p-0.5 border border-slate-100 text-[9px] font-bold text-slate-500">
                {['30D', '3M'].map(t => <button key={t} className="px-1.5 py-0.5 rounded hover:bg-slate-100">{t}</button>)}
                <button className="px-1.5 py-0.5 rounded bg-brand-600 text-white shadow-sm">6M</button>
              </div>
            </div>
            
            <div className="relative h-[140px] w-full">
              {/* Forecast overlay card */}
              <div className="absolute right-0 top-0 bottom-2 w-[120px] rounded-lg border border-slate-100 bg-slate-50/90 p-2 z-10 flex flex-col justify-center shadow-sm">
                <div className="text-[8px] text-slate-500 font-medium">End-of-Month</div>
                <div className="text-[9px] font-bold text-slate-700">Forecast</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">$78,823.46</div>
                <div className="text-[8px] font-bold text-rose-600 mt-0.5">157.6% vs budget</div>
                <div className="mt-1.5 rounded bg-rose-50 border border-rose-100 p-1.5 text-[7px] font-bold text-rose-700 leading-tight">
                  <AlertTriangle className="inline h-2 w-2 text-amber-500 mb-0.5" /> Over budget.
                </div>
              </div>

              {/* Chart SVG */}
              <div className="absolute inset-0 pr-[120px]">
                <svg viewBox="0 0 600 200" className="w-full h-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,160 L120,160 L240,165 L360,110 L480,50 L480,200 L0,200 Z" fill="url(#chartGrad)" />
                  <path d="M0,160 L120,160 L240,165 L360,110 L480,50" fill="none" stroke="#2563eb" strokeWidth="3" />
                  <path d="M480,50 L600,20" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeDasharray="4,4" />
                  <circle cx="480" cy="50" r="4" fill="#2563eb" />
                </svg>
              </div>
            </div>
          </div>

          {/* Bottom Insights Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-100 bg-white p-2 shadow-sm flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-amber-50 flex items-center justify-center text-amber-500">
                <Sparkles className="h-3 w-3" />
              </div>
              <div>
                <h4 className="text-[9px] font-bold text-slate-900">AI Insights</h4>
                <p className="text-[8px] text-slate-500 truncate w-[100px]">Spend increased 1976%...</p>
              </div>
            </div>
          </div>

          {/* Floating Chatbot */}
          <div className="absolute bottom-4 right-4 h-9 w-9 bg-brand-600 rounded-full shadow-lg flex items-center justify-center text-white border-2 border-white cursor-pointer z-20">
            <Bot className="h-4 w-4" />
            <div className="absolute top-0 right-0 h-2 w-2 bg-rose-500 rounded-full border-2 border-white"></div>
          </div>

        </div>
      </div>
    </div>
  );
}

function NavSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[8px] font-bold text-slate-400 tracking-wider mb-1.5 px-1.5">{title}</div>
      {children}
    </div>
  );
}

function NavItem({ icon, label, active, bg }: { icon: React.ReactNode; label: string; active?: boolean; bg?: string }) {
  return (
    <div className={`flex items-center gap-1.5 px-1.5 py-1 rounded-md text-[11px] font-medium cursor-pointer ${active ? 'text-brand-600 bg-brand-50/50' : 'text-slate-600'} ${bg || ''}`}>
      <span className={active ? 'text-brand-600' : 'text-slate-400'}>{icon}</span>
      {label}
    </div>
  );
}
