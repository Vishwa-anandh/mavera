// ─── CCM — Cloud Cost Monitor ──────────────────────────────────────────────
// All content sourced from the CCM product brief.

export const heroContent = {
  headline: 'Turn Cloud Spend Into Actionable Savings.',
  subhead:
    'CCM gives enterprises a unified view of cloud costs, resources, savings opportunities, forecasting, smart alerts and AI-driven FinOps insights across Azure, AWS and SAP BTP.',
  tagline: 'Monitor. Understand. Optimize. Predict. Save.',
  primaryCta: 'Request a Demo',
  secondaryCta: 'Explore CCM',
  closingMessage:
    "Don't just monitor your cloud bill. Understand it, optimize it, and continuously reduce it.",
};

export const targetCustomers = [
  'CIO / CTO / CFO and executive leadership',
  'FinOps and cloud governance teams',
  'Cloud / Infrastructure / Operations teams',
  'SAP Basis and SAP BTP teams',
  'Cloud Solution Providers (CSPs) and Managed Service Providers (MSPs)',
  'Enterprises operating Azure, AWS and SAP BTP',
];

// ─── Core Value Proposition ────────────────────────────────────────────────
export const valueProps: string[] = [
  'Unified cloud cost and resource visibility',
  'Identify and quantify savings opportunities',
  'Detect abnormal cost and resource behavior',
  'Forecast future cloud spending and budget risk',
  'Track new, deleted, unused and changing resources',
  'Generate executive-ready daily health reports',
  'Provide AI-generated summaries and recommendations',
  'Extend FinOps visibility to SAP BTP',
];

// ─── Major Product Modules ─────────────────────────────────────────────────
export type Module = {
  icon: string;
  name: string;
  purpose: string;
  capabilities: string;
};

export const productModules: Module[] = [
  {
    icon: 'LayoutDashboard',
    name: 'Executive Dashboard',
    purpose: 'Single cloud-health view',
    capabilities: 'Spend, forecast, savings, alerts, resources, AI summary',
  },
  {
    icon: 'BarChart3',
    name: 'Cloud Cost Monitoring',
    purpose: 'Understand spending',
    capabilities: 'Daily/MTD cost, service and region analysis, trends',
  },
  {
    icon: 'PiggyBank',
    name: 'Savings Center',
    purpose: 'Reduce spend',
    capabilities: 'RI, Savings Plans, rightsizing, unused resources, storage optimization',
  },
  {
    icon: 'BellRing',
    name: 'Smart Alerts',
    purpose: 'Detect abnormal behavior',
    capabilities: 'Cost spikes, savings drops, resource growth, budget risks',
  },
  {
    icon: 'TrendingUp',
    name: 'Forecasting',
    purpose: 'Predict future spend',
    capabilities: 'Month-end forecast and budget-overrun prediction',
  },
  {
    icon: 'Server',
    name: 'Resource Monitoring',
    purpose: 'Track inventory',
    capabilities: 'Total resources, new/deleted resources, growth and cost impact',
  },
  {
    icon: 'FileText',
    name: 'Invoice Intelligence',
    purpose: 'Understand billing',
    capabilities: 'Invoice upload, breakdown, cost analysis and AI insights',
  },
  {
    icon: 'Sparkles',
    name: 'AI Executive Summary',
    purpose: 'Convert data into decisions',
    capabilities: 'What happened, why, impact and recommended action',
  },
  {
    icon: 'MessageSquare',
    name: 'AI Chat',
    purpose: 'Natural-language assistant',
    capabilities: 'Cost, savings, resources, alerts and forecast questions',
  },
  {
    icon: 'ClipboardCheck',
    name: 'Daily Cloud Health Report',
    purpose: 'Operational reporting',
    capabilities: 'Daily Excel/PDF report with cost, resources, alerts and savings',
  },
  {
    icon: 'Cloud',
    name: 'SAP BTP Monitoring',
    purpose: 'Monitor BTP landscape',
    capabilities: 'Subaccounts, services, apps, HANA Cloud and entitlements',
  },
];

// ─── AI Capabilities ───────────────────────────────────────────────────────
export type AICapability = {
  icon: string;
  title: string;
  description: string;
};

export const aiCapabilities: AICapability[] = [
  {
    icon: 'Sparkles',
    title: 'AI Executive Summary',
    description: 'Summarizes spend, changes, risks, savings and recommendations into an executive-ready overview.',
  },
  {
    icon: 'Activity',
    title: 'Smart Cost Anomaly Detection',
    description: 'Learns normal spending behavior and flags meaningful spikes or unusual trends automatically.',
  },
  {
    icon: 'TrendingUp',
    title: 'AI Forecasting',
    description: 'Predicts future spend and potential budget overruns before they happen.',
  },
  {
    icon: 'Lightbulb',
    title: 'AI Savings Recommendations',
    description: 'Identifies optimization opportunities such as commitments, rightsizing and unused resources.',
  },
  {
    icon: 'SearchCheck',
    title: 'AI Root Cause Analysis',
    description: 'Explains why a cost increased and identifies affected services and resources where data is available.',
  },
  {
    icon: 'MessageSquare',
    title: 'AI Chat Assistant',
    description: 'Allows users to ask questions about cost, savings, resources, alerts and forecasts in natural language.',
  },
];

// ─── Savings Center ────────────────────────────────────────────────────────
export const savingsOpportunities: string[] = [
  'Reserved Instance opportunities',
  'Savings Plan opportunities',
  'Rightsizing',
  'Unused / underutilized VM detection',
  'Unattached disk and snapshot cleanup',
  'Idle public IP detection',
  'Storage optimization',
  'Backup optimization',
  'CSP discounts and benefits',
  'Commitment / billing optimization where applicable',
];

// ─── Smart Alerts & Resource Change Monitoring ─────────────────────────────
export const alertTypes: string[] = [
  'Sudden daily cost spike',
  'Unusual service or region spend increase',
  'Budget overrun risk',
  'Savings opportunity change',
  'New high-cost resource created',
  'Unusual resource-count growth',
  'Resource deleted',
  'Unused/orphan resource detected',
  'SAP BTP entitlement or consumption risk',
];

// ─── SAP BTP Monitoring ────────────────────────────────────────────────────
export const btpItems: string[] = [
  'Subaccounts',
  'Service instances and plans',
  'Cloud Foundry applications',
  'HANA Cloud',
  'Destination Service',
  'Integration Suite',
  'Build Apps',
  'AI Core',
  'Entitlement and consumption tracking',
  'New/deleted service detection and smart alerts',
];

// ─── Daily Cloud Health Report ─────────────────────────────────────────────
export const healthReportItems: string[] = [
  'Date and monitoring time',
  'Cloud / subscription',
  'MTD and daily spend',
  'Forecasted cost',
  'Total resource count',
  'New and deleted resources',
  'Critical and warning alerts',
  'Potential savings',
  'Top cost driver',
  'AI executive summary',
  'Overall health/status',
];

// ─── Key Metrics ───────────────────────────────────────────────────────────
export type Metric = {
  label: string;
  value?: string;
  icon: string;
  accent: 'brand' | 'save' | 'warn' | 'danger';
};

export const keyMetrics: Metric[] = [
  { label: 'Total Cloud Spend', icon: 'DollarSign', accent: 'brand' },
  { label: 'Potential Monthly Savings', icon: 'PiggyBank', accent: 'save' },
  { label: 'Annual Savings Opportunity', icon: 'TrendingUp', accent: 'save' },
  { label: 'Forecasted Month-End Spend', icon: 'CalendarClock', accent: 'warn' },
  { label: 'FinOps Health Score', icon: 'Heart', accent: 'brand' },
  { label: 'Total Resources', icon: 'Server', accent: 'brand' },
  { label: 'New Resources Today', icon: 'PlusCircle', accent: 'warn' },
  { label: 'Smart Alerts', icon: 'BellRing', accent: 'danger' },
  { label: 'Unused Resources', icon: 'AlertTriangle', accent: 'danger' },
  { label: 'CSP Savings', icon: 'BadgePercent', accent: 'save' },
];

// ─── Key Differentiators ───────────────────────────────────────────────────
export const differentiators: string[] = [
  'AI-driven FinOps intelligence',
  'Savings-first approach',
  'Smart anomaly-based alerts',
  'Cloud resource change monitoring',
  'SAP BTP resource and consumption monitoring',
  'CSP savings visibility',
  'Executive and operational reporting',
  'Unified cost + resources + savings + risk view',
];

// ─── Subscription Model ────────────────────────────────────────────────────
export type Edition = {
  name: string;
  tagline: string;
  coreOffering: string;
  aiOffering: string;
  aiIncluded: boolean;
  features: string[];
  cta: string;
  highlighted: boolean;
};

export const editions: Edition[] = [
  {
    name: 'Standard',
    tagline: 'Core FinOps visibility and savings identification.',
    coreOffering: 'Cost monitoring, Savings Center, Resource Monitoring, Reports, Invoice Monitoring',
    aiOffering: 'Not included',
    aiIncluded: false,
    features: [
      'Executive Dashboard',
      'Cloud Cost Monitoring',
      'Savings Center',
      'Resource Monitoring',
      'Daily Cloud Health Reports',
      'Invoice Intelligence',
      'SAP BTP Monitoring',
      'Smart Alerts (rule-based)',
    ],
    cta: 'Request a Demo',
    highlighted: false,
  },
  {
    name: 'AI',
    tagline: 'Everything in Standard, powered by AI-driven FinOps intelligence.',
    coreOffering: 'Everything in Standard',
    aiOffering: 'AI Executive Summary, Smart Alerts, Forecasting, AI Recommendations, AI Chat and anomaly detection',
    aiIncluded: true,
    features: [
      'Everything in Standard edition',
      'AI Executive Summary',
      'Smart Alerts (anomaly detection)',
      'AI Forecasting',
      'AI Savings Recommendations',
      'AI Root Cause Analysis',
      'AI Chat Assistant',
    ],
    cta: 'Request a Demo',
    highlighted: true,
  },
];

// ─── Cloud Cost Problem ────────────────────────────────────────────────────
export const cloudProblems: string[] = [
  'Cloud bills keep growing with no clear explanation of why',
  'Savings opportunities are missed because nobody has time to find them',
  'Abnormal spend spikes go unnoticed until the invoice arrives',
  'No visibility into new, deleted, or changing resources driving cost',
  'Budget overruns are discovered after the month is already over',
  'SAP BTP costs sit in a blind spot outside of cloud FinOps tools',
];

// ─── Partners ──────────────────────────────────────────────────────────────
export const partners: string[] = [];

// ─── How It Works (4 steps) ─────────────────────────────────────────────────
export type HowItWorksStep = {
  number: string;
  icon: string;
  title: string;
  description: string;
};

export const howItWorksSteps: HowItWorksStep[] = [
  {
    number: '01',
    icon: 'Plug',
    title: 'Connect Your Clouds',
    description:
      'One-click read-only connection to Azure, AWS, and GCP. Historical spend ingested in minutes — no agents, no rewrites.',
  },
  {
    number: '02',
    icon: 'Search',
    title: 'Discover & Baseline',
    description:
      'CCM maps your hierarchy, normalises tags, and learns per-service baselines so anomalies and waste surface from day one.',
  },
  {
    number: '03',
    icon: 'Sparkles',
    title: 'Optimise & Forecast',
    description:
      'Prioritised savings, confidence-banded forecasts, and AI-generated briefs feed FinOps, engineering, and finance in their own language.',
  },
  {
    number: '04',
    icon: 'ClipboardCheck',
    title: 'Govern & Report',
    description:
      'Budgets bite, commits get optimised, invoices reconcile. Realised savings flow to the CFO deck — automatically.',
  },
];

// ─── Feature Tabs (5-tab showcase) ──────────────────────────────────────────
export type FeatureTab = {
  id: string;
  label: string;
  category: string;
  title: string;
  description: string;
  quote: string;
  bullets: string[];
};

export const featureTabs: FeatureTab[] = [
  {
    id: 'dashboard',
    label: 'Unified Dashboard',
    category: 'Visibility · 01 / 05',
    title: 'Unified Cloud Cost Dashboard',
    description:
      'A single pane of glass for Azure, AWS, and GCP — every dollar across every account, subscription, and project rolled up in real time. Stop reconciling three different billing portals at month-end. CCM ingests native billing APIs, normalises currency, tags, and resource hierarchies, then surfaces blended trends, anomaly bands, and run-rate forecasts on one editorial dashboard. Drill from total spend to CSP to service to tag to resource in two clicks.',
    quote: 'One pane. Three clouds. Zero spreadsheets.',
    bullets: [
      'Live Azure, AWS, GCP roll-up',
      'Tag-normalised drill-down',
      'Run-rate vs. budget bands',
    ],
  },
  {
    id: 'savings',
    label: 'Savings Center',
    category: 'Optimization · 02 / 05',
    title: 'Savings Center',
    description:
      'A prioritised queue of every actionable saving opportunity in your environment — rightsizing, reservations, idle shutdowns, storage tiering — ranked by dollar impact. Each opportunity is paired with a confidence score, projected monthly saving, implementation effort, and a one-click runbook. Approve, schedule, or ignore from inside the platform — no Terraform diffs to copy-paste. Track realised savings against forecast so finance can audit the FinOps program in numbers, not narrative.',
    quote: '$10,250 in pre-validated savings, waiting on a click.',
    bullets: [
      'Confidence-scored recommendations',
      'One-click runbook execution',
      'Realised vs. forecast tracking',
    ],
  },
  {
    id: 'alerts',
    label: 'Smart Alerts',
    category: 'Detection · 03 / 05',
    title: 'Smart Alerts & Anomaly Detection',
    description:
      "Models trained on your historical spend catch cost spikes the moment they form — not after the invoice lands. Per-service baselines learn weekday/weekend, business-hours, and seasonal patterns. Deviations beyond a configurable z-score fire to Slack, Teams, email, or webhook with a chart, a likely-cause hypothesis, and the responsible resource owner pre-tagged. Catch a rogue test cluster at hour 2, not at $42,000.",
    quote: 'Caught at hour 2 — not at the invoice.',
    bullets: [
      'Per-service learned baselines',
      'Multi-channel notification',
      'Cause hypothesis + owner tag',
    ],
  },
  {
    id: 'ai-summary',
    label: 'AI Executive Summary',
    category: 'Intelligence · 04 / 05',
    title: 'AI Executive Summary',
    description:
      "A board-ready paragraph generated weekly that explains what happened to spend — and why — in plain English. No more screenshotting charts for the CFO deck. CCM's LLM layer compresses thousands of cost events into a narrated brief: top movers, what drove them, which optimisations landed, and where attention is needed next week. Editable, exportable to PDF, and signed with the data window it was generated from.",
    quote: 'Your weekly cost story, written for you.',
    bullets: [
      'Narrated weekly brief',
      'Top-mover attribution',
      'Editable PDF export',
    ],
  },
  {
    id: 'forecasting',
    label: 'Cost Forecasting',
    category: 'Forecasting · 05 / 05',
    title: 'Cost Forecasting',
    description:
      'Confidence-banded forecasts at the account, service, and tag level — so finance plans against ranges, not vibes. An ensemble of seasonal-decomposition and gradient-boosted models projects 30, 60, and 90-day spend with P50/P80/P95 bands. Overlay planned releases, freeze windows, or reservation purchases to see their impact before commit. Export to FP&A in CSV or push directly into Anaplan / Workday Adaptive.',
    quote: 'Plan against ranges. Not against vibes.',
    bullets: [
      '30 / 60 / 90-day projections',
      'P50 / P80 / P95 bands',
      'FP&A-ready exports',
    ],
  },
];

// ─── Built For Scale (Enterprise-grade) ─────────────────────────────────────
export type ScaleFeature = {
  icon: string;
  title: string;
  description: string;
};

export const scaleFeatures: ScaleFeature[] = [
  {
    icon: 'Cloud',
    title: 'Multi-Cloud Native',
    description: 'Azure · AWS · GCP — read-only APIs',
  },
  {
    icon: 'BrainCircuit',
    title: 'AI / ML Engine',
    description: 'Anomaly + forecast + LLM brief',
  },
  {
    icon: 'ShieldCheck',
    title: 'Enterprise Security',
    description: 'SOC 2 · ISO 27001 · SSO · SCIM',
  },
  {
    icon: 'BarChart3',
    title: 'FinOps Aligned',
    description: 'Mapped to FinOps Foundation framework',
  },
];

// ─── Partner Guarantee ──────────────────────────────────────────────────────
export const partnerGuarantee = {
  reductionPercent: '5.2',
  description:
    'Average reduction on your cloud bill within the first 90 days of partnering with Maitsys — measured against your prior run-rate, audited in your own console.',
  before: { label: 'Before', value: '$842k', sub: 'baseline / mo' },
  after: { label: 'After', value: '$796k', sub: '−$45,468 / mo' },
  annualised: { label: 'Annualised', value: '$545k', sub: 'recovered' },
};

// ─── Demo Privacy Promise ───────────────────────────────────────────────────
export type PrivacyItem = {
  icon: string;
  title: string;
  description: string;
};

export const privacyPromise: {
  title: string;
  subtitle: string;
  items: PrivacyItem[];
  sessionLines: string[];
} = {
  title: 'Your bill never leaves your account.',
  subtitle:
    'During the demo we do not store your billing data and never expose line-item details. Analysis runs in an ephemeral session — when it ends, everything is wiped.',
  items: [
    {
      icon: 'EyeOff',
      title: 'No line-item exposure',
      description: 'Resource IDs and tags are hashed before any model sees them.',
    },
    {
      icon: 'Trash2',
      title: 'Zero data retention',
      description: 'Demo session is in-memory only. Nothing persists past disconnect.',
    },
    {
      icon: 'Lock',
      title: 'Read-only on your console',
      description: 'We only request billing-read scopes. No write, no resource access.',
    },
  ],
  sessionLines: [
    'ingest → memory only',
    'encryption → AES-256 in-transit',
    'retention → 0 days',
    'line-items → masked',
  ],
};
