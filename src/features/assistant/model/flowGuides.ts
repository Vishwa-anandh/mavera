/** One stop in a page tour: what to outline, and what to say about it. */
export interface TourStep {
  /** What to outline — `css:<selector>`, `btn:<label>` or `panel:<heading>` (see tourTargets.ts). */
  target: string;
  title: string;
  /** A one-word label shown beside the title, e.g. "Filters", "Action", "Chart". */
  tag?: string;
  body: string;
}

/** A task-specific tour on a page that has several (e.g. "Add a user", "Deactivate a user"). */
export interface FlowTour {
  key: string;
  /** Short task name, used as the chip text and the tour card's title. */
  label: string;
  steps: TourStep[];
}

export interface FlowGuide {
  key: string;
  /** Route prefix this guide applies to; the longest matching prefix wins. */
  pathPrefix: string;
  /** Short page name used in the tour card, e.g. "Cost Overview". */
  pageName: string;
  /** The assistant's own proactive question, shown before any message is sent. */
  prompt: string;
  /** Suggestion chip text — also the "user" message sent when it's clicked. Clicking it starts the tour. */
  chipLabel: string;
  /** Written walkthrough kept in the conversation (and used where a tour can't run). */
  reply: string;
  /** The on-page overview tour started by the chip. */
  steps: TourStep[];
  /** Further tours for specific tasks on this page, offered as chips in the chat. */
  flows?: FlowTour[];
}

/** A numbered written summary of a tour, used as the chat reply for guides without a hand-written one. */
function replyFromSteps(pageName: string, steps: TourStep[]): string {
  return [`Here's a quick tour of ${pageName}:`, ...steps.map((step, i) => `${i + 1}. ${step.title} — ${step.body}`)].join('\n');
}

type GuideInput = Omit<FlowGuide, 'reply'> & { reply?: string };
const guide = (input: GuideInput): FlowGuide => ({ ...input, reply: input.reply ?? replyFromSteps(input.pageName, input.steps) });

/**
 * Per-page help the floating Assistant offers proactively. Clicking a page's help chip starts a guided tour
 * of that page (see GuidedTour). These are authored guidance, not answers over live data, so they can be
 * genuine; free-form questions are answered separately (see assistantAnswers.ts).
 */
export const FLOW_GUIDES: FlowGuide[] = [
  // ───────────────────────────── Dashboard
  guide({
    key: 'dashboard',
    pathPrefix: '/',
    pageName: 'Dashboard',
    prompt: 'New here? Want a quick tour of your dashboard?',
    chipLabel: 'Show me around the dashboard',
    steps: [
      { target: 'css:.mv-pulse', title: 'Operations pulse', tag: 'Overview', body: 'One readout per module you have. Cloud Cost shows current spend, recommendations and active alerts; SAP Monitoring shows how many systems are healthy, warning or critical. The bar under the figures is the same story at a glance.' },
      { target: 'css:.mv-glance-strip', title: 'Your key figures', tag: 'Key figures', body: 'Spend so far this month (with a small trend line), forecast against budget, savings you could make, SAP health, HANA memory and open alerts. Each link under a figure opens the page behind it.' },
      { target: 'panel:Needs attention', title: 'What needs you', tag: 'Priority', body: 'One list across SAP, cost alerts, budgets, savings and expiring reservations, most urgent first. Click a row to jump straight to the page where you can deal with it.' },
      { target: 'panel:System & Service Health Overview', title: 'System health', tag: 'SAP', body: 'Your SAP systems with their CPU and memory. Critical and warning systems are listed first.' },
      { target: 'panel:Cloud Cost by Provider', title: 'Where the money goes', tag: 'Cloud', body: 'Month-to-date spend split by provider. Use View data for the exact numbers.' },
      { target: 'css:.mv-dashboard-sidebar', title: 'Shortcuts and plan', tag: 'Tip', body: 'Your plan and active modules, quick links for common jobs, and support — always on the left of the dashboard.' },
    ],
  }),

  // ───────────────────────────── Cloud Cost
  guide({
    key: 'connect-cloud-account',
    pathPrefix: '/cloud/overview',
    pageName: 'Cost Overview',
    prompt: 'Want help connecting a cloud account?',
    chipLabel: 'Help me connect a cloud account',
    reply: [
      "Here's how to connect a cloud account:",
      '1. Click "Connect cloud account" at the top right of the page.',
      '2. Pick the provider — Azure, AWS, SAP BTP or Google Cloud — and give the account a name.',
      "3. Enter that provider's credentials; Mavera validates them before saving, so you'll see an inline error right away if something's off.",
      '4. Once validated, click Save — the account shows up in your cost dashboards within moments.',
    ].join('\n'),
    steps: [
      { target: 'btn:Connect cloud account', title: 'Connect an account', tag: 'Action', body: 'Start here. Choose the provider, name the account and enter its credentials — Mavera validates them before saving, so a mistake shows up straight away.' },
      { target: 'css:.mv-kpi-row-4', title: 'Your four headline numbers', tag: 'Key figures', body: 'Month-to-date spend by provider, how much of your budget is used, savings from Maitsys MSP rates, and active cost alerts.' },
      { target: 'panel:Cost at a glance', title: 'Cost at a glance', tag: 'Overview', body: 'The monthly trend with the end-of-month forecast, a plain-language read of what changed, and your MSP savings by provider — three views of the same month side by side.' },
      { target: 'panel:Spend by provider', title: 'Spend by provider', tag: 'Chart', body: 'The last six months stacked by provider, so you can see which one moves the total. Use View data for exact figures.' },
      { target: 'panel:Biggest movers', title: 'Biggest movers', tag: 'Change', body: 'How each provider changed against last month, largest change first. Red means spend went up; green means it went down.' },
    ],
  }),
  guide({
    key: 'cost-analytics',
    pathPrefix: '/cloud/analytics',
    pageName: 'Cost Analytics',
    prompt: 'Want a quick tour of Cost Analytics?',
    chipLabel: 'Show me how Cost Analytics works',
    steps: [
      { target: 'css:.mv-filter-bar', title: 'Choose what to analyse', tag: 'Filters', body: 'Pick the providers, the time range and how to group the breakdown (by service, region or account). Everything below follows these choices. SAP BTP bills in EUR, so it is analysed on its own, never added to USD totals.' },
      { target: 'css:.mv-kpi-row-4', title: 'The headline numbers', tag: 'Key figures', body: 'This month so far, the change against last month, the total for the range and the monthly average. A note appears when a provider has no history to compare.' },
      { target: 'panel:Monthly cost by provider', title: 'Cost over time', tag: 'Chart', body: 'One line per provider across the range. A provider with only the current month synced shows as a single point.' },
      { target: 'panel:Cost by', title: 'The breakdown', tag: 'Table', body: 'Every service, region or account with its cost, share of the total and change against last month.' },
      { target: 'btn:Export report', title: 'Take it with you', tag: 'Action', body: 'Export the current view as a CSV, and use Save view to keep your filter choices for next time.' },
    ],
  }),
  guide({
    key: 'recommendations',
    pathPrefix: '/cloud/optimization',
    pageName: 'Savings & Optimization',
    prompt: 'Want help finding savings on this page?',
    chipLabel: 'Help me act on a recommendation',
    reply: [
      "Here's how to use Savings & Optimization:",
      '1. In Savings overview, filter by provider if you only want Azure, AWS, BTP or GCP savings.',
      "2. The figures split savings into what you control (right-sizing, orphaned disks, etc.) and what Maitsys' MSP rates already save you automatically — click a category to see the line items.",
      '3. Under Opportunities, open any recommendation to assign an owner, start a review or dismiss it with a reason.',
      "4. Nothing here changes your cloud resources automatically, so it's safe to explore.",
    ].join('\n'),
    steps: [
      { target: 'css:#savings', title: 'Savings overview', tag: 'Overview', body: 'Month-to-date spend, the savings you could make, and the savings Maitsys MSP rates already give you. Use the provider filter to look at one cloud.' },
      { target: 'panel:Savings Breakdown', title: 'Where the savings come from', tag: 'Chart', body: 'The potential savings split by type — reserved instances, unused resources, orphaned disks and more. Click a category in the lists beside it to see the resources behind each number.' },
      { target: 'css:#opportunities .mv-filter-bar', title: 'Narrow the list', tag: 'Filters', body: 'Filter opportunities by category, impact, provider and status (open, in review or dismissed).' },
      { target: 'css:#opportunities table', title: 'Act on an opportunity', tag: 'Action', body: 'Open any recommendation to see why it was raised. There you can assign an owner, start a review, or dismiss it with a reason. Nothing changes in your cloud — the decision is recorded for the resource owner.' },
      { target: 'panel:Saving by category', title: 'Saving by category', tag: 'Summary', body: 'The same opportunities totalled by category. Click a bar to filter the list to it.' },
    ],
  }),
  guide({
    key: 'reservations',
    pathPrefix: '/cloud/reservations',
    pageName: 'Reserved Instances',
    prompt: 'Want to know what you are looking at here?',
    chipLabel: 'Explain reserved instances',
    steps: [
      { target: 'css:.mv-kpi-row-4', title: 'Commitment health', tag: 'Key figures', body: 'How many reservations and savings plans you hold, their average utilisation, how many expire within 90 days and how many are underused (below 80%).' },
      { target: 'panel:Reservations', title: 'Your reservations', tag: 'Table', body: 'Nearest expiry first. The state tells you what needs doing: Expires soon, Underused or Active. Choose a reservation to see its utilisation over the last 30 days.' },
      { target: 'panel:Commitment recommendations', title: 'Should you commit more?', tag: 'Tip', body: 'Estimates from the provider or Maitsys analysis. These are not purchases — review the terms before committing.' },
    ],
  }),
  guide({
    key: 'resources',
    pathPrefix: '/cloud/resources',
    pageName: 'Resource Inventory',
    prompt: 'Looking for a specific resource?',
    chipLabel: 'Help me find a resource',
    steps: [
      { target: 'css:.mv-kpi-row-4', title: 'Inventory at a glance', tag: 'Key figures', body: 'How many resources you have across all clouds, how many are untagged, month-to-date cost and how many are stopped or unused.' },
      { target: 'css:.mv-filter-bar', title: 'Search and filter', tag: 'Filters', body: 'Search by name, ID, group or tag, then narrow by provider, type, state or tagging. Sort by name or cost.' },
      { target: 'css:table', title: 'The resources', tag: 'Table', body: 'Each resource with its provider, type, group, region, owner, state and month-to-date cost. "Untagged" and "Not reported" are shown honestly instead of as blanks or zeros.' },
      { target: 'btn:Export CSV', title: 'Export what you see', tag: 'Action', body: 'Download the filtered list as a CSV.' },
    ],
  }),

  // ───────────────────────────── Providers (Azure, AWS, Google Cloud, SAP BTP)
  ...(['azure', 'aws', 'gcp', 'btp'] as const).flatMap((p) => {
    const label = { azure: 'Azure', aws: 'AWS', gcp: 'Google Cloud', btp: 'SAP BTP' }[p];
    const unit = { azure: 'subscriptions', aws: 'accounts', gcp: 'projects', btp: 'accounts' }[p];
    const one = unit.slice(0, -1);
    return [
      guide({
        key: `${p}-overview`,
        pathPrefix: `/${p}`,
        pageName: `${label} overview`,
        prompt: `Want a quick tour of your ${label} ${unit}?`,
        chipLabel: `Show me the ${label} overview`,
        steps: [
          { target: 'css:.mv-kpi-row-4, .mv-kpi-row-5', title: 'Headline numbers', tag: 'Key figures', body: `Total ${label} spend this month, today's spend and how many ${unit} are connected.` },
          { target: `panel:${p === 'gcp' ? 'Projects' : p === 'btp' ? 'BTP Accounts' : 'Environments'}`, title: `Your ${unit}`, tag: 'Table', body: `Each connected ${label} ${one} with its current spend. Open one to see its full cost breakdown.` },
          { target: 'btn:Manage', title: `Add or manage ${unit}`, tag: 'Action', body: `Connect another ${label} ${one}, rename one or remove it.` },
          { target: 'panel:Cost Trend', title: 'Cost trend', tag: 'Chart', body: 'Spend over the period. Use View data for the exact numbers.' },
          { target: 'panel:Top Services', title: 'Top services', tag: 'Breakdown', body: `The ${label} services costing the most, so you know where to look first.` },
        ],
      }),
      guide({
        key: `${p}-account`,
        pathPrefix: p === 'azure' ? '/azure/' : `/${p}/account/`,
        pageName: `${label} account`,
        prompt: `Want help reading this ${label} account?`,
        chipLabel: 'Walk me through this account',
        steps: [
          { target: 'css:.mv-cost-tabs', title: 'Three views of the same account', tag: 'Tabs', body: 'Executive for leadership (totals, forecast, savings), Operations for managers (monthly spend and top services) and Technical for engineers (usage detail).' },
          { target: 'btn:Switch account', title: 'Switch account', tag: 'Action', body: 'Jump to another connected account without going back to the overview.' },
          { target: 'btn:Month-to-Date', title: 'Choose the period', tag: 'Filters', body: 'Look at the current month or pick a past month. A banner reminds you when you are viewing history.' },
          { target: 'btn:AI Insights', title: 'AI insights', tag: 'Insight', body: 'A short written summary of what changed and what to watch for on this account.' },
          { target: 'btn:Sync', title: 'Refresh the data', tag: 'Action', body: 'Pull the latest cost data from the provider now instead of waiting for the next scheduled sync.' },
        ],
      }),
      ...(p === 'azure' ? [] : [
        guide({
          key: `${p}-accounts`,
          pathPrefix: `/${p}/accounts`,
          pageName: `${label} account manager`,
          prompt: `Need help connecting or editing a ${label} account?`,
          chipLabel: 'Help me manage accounts',
          steps: [
            { target: 'panel:Connected', title: 'Connected accounts', tag: 'List', body: 'Everything currently connected, with its region or project. Credentials are always shown masked.' },
            { target: 'css:button[aria-label^="Rename"]', title: 'Rename', tag: 'Action', body: 'Give an account a clearer name — useful when you have several for the same provider.' },
            { target: 'css:button[aria-label^="Delete"]', title: 'Remove', tag: 'Action', body: 'Disconnect an account. Its historical data is no longer shown here once removed.' },
            { target: 'btn:Connect Account', title: 'Connect a new account', tag: 'Action', body: `Add another ${label} account. Mavera checks the credentials before saving and tells you straight away if something is wrong.` },
          ],
        }),
      ]),
    ];
  }),

  // ───────────────────────────── Governance and billing
  guide({
    key: 'budgets',
    pathPrefix: '/budgets',
    pageName: 'Budgets & Alerts',
    prompt: 'Need a hand setting up a budget or alert on this page?',
    chipLabel: 'Help me create a budget',
    reply: [
      "Here's how to set up a budget:",
      '1. On the Budgets tab, give it a name.',
      '2. Choose a scope — Organization Wide covers every connected cloud account, or pick one specific account.',
      '3. Set the target amount and the alert threshold (e.g. 80% warns you before the cap).',
      '4. Click "Add Budget" — it appears in the list on the right immediately.',
      '5. Switch to Alert Integrations to add an email or Microsoft Teams channel for threshold notifications.',
    ].join('\n'),
    steps: [
      { target: 'panel:Create New Budget', title: 'Describe the budget', tag: 'Form', body: 'Name it, choose a scope — Organization Wide covers every connected account, or pick one account — then set the target amount and the alert threshold (80% warns you before the cap).' },
      { target: 'btn:Add Budget', title: 'Save it', tag: 'Action', body: 'The budget appears in the list on the right straight away, and alerts start firing when spend crosses the threshold.' },
      { target: 'css:button[aria-label^="Delete"]', title: 'Your budgets', tag: 'List', body: 'Each budget with its target, alert threshold and scope. Use the bin to remove one you no longer need.' },
      { target: 'btn:Alert Integrations', title: 'Where alerts go', tag: 'Tip', body: 'Add an email address or a Microsoft Teams channel so threshold alerts reach the right people.' },
    ],
  }),
  guide({
    key: 'smart-alerts',
    pathPrefix: '/smart-alerts',
    pageName: 'Smart Alerts',
    prompt: 'Need a hand working through your alerts?',
    chipLabel: 'Help me manage alerts',
    reply: [
      "Here's how to work through Smart Alerts:",
      '1. Use the Status and Type filters above the table to narrow things down — e.g. just Critical, or just Budget alerts.',
      "2. Each row has quick actions on the right: view details, acknowledge, or ignore (ignoring also widens that account's threshold so it doesn't fire again immediately).",
      '3. "Mark All Read" clears the unread count without acknowledging each one individually.',
      '4. Switch to Recipients to control who gets notified, and Settings to adjust detection sensitivity.',
    ].join('\n'),
    steps: [
      { target: 'css:.mv-kpi-row-4', title: 'Alert counts', tag: 'Key figures', body: 'Total active, unread, critical and new-resource alerts.' },
      { target: 'css:.mv-alert-filter-bar', title: 'Filter the list', tag: 'Filters', body: 'Narrow by status (unread, critical, high and above) and by type (spike, unusual spend, forecast, budget, new resource, removed).' },
      { target: 'css:table', title: 'Work through the alerts', tag: 'Table', body: "Each row has quick actions on the right: view details, resolve, or ignore. Ignoring also widens that account's threshold so it doesn't fire again straight away." },
      { target: 'btn:Mark All Read', title: 'Clear the unread count', tag: 'Action', body: 'Marks everything as read without resolving each alert individually.' },
      { target: 'btn:Recipients', title: 'Who gets told', tag: 'Tip', body: 'Choose who is notified. Settings next to it adjusts detection sensitivity.' },
    ],
  }),
  guide({
    key: 'invoices',
    pathPrefix: '/invoices',
    pageName: 'Cloud Invoices',
    prompt: 'Want help uploading or reading an invoice?',
    chipLabel: 'Help me with invoices',
    steps: [
      { target: 'btn:Upload Invoice', title: 'Upload an invoice', tag: 'Action', body: 'Add an Azure, AWS, SAP BTP or Google Cloud invoice (PDF or CSV). Mavera reads it and builds the cost breakdown for you.' },
      { target: 'panel:Invoice Records', title: 'Your invoices', tag: 'List', body: 'Filter by provider, then choose a record to see its breakdown. Use the page controls under the list when there are more than a few.' },
      { target: 'panel:Select an invoice', title: 'Breakdown and savings', tag: 'Detail', body: "The selected invoice's costs by service and the savings from Maitsys CSP rates appear here." },
    ],
  }),
  guide({
    key: 'billing',
    pathPrefix: '/billing',
    pageName: 'Billing',
    prompt: 'Need help with an invoice here?',
    chipLabel: 'Help me pay an invoice',
    reply: [
      "Here's how Billing works:",
      '1. This page lists every invoice Maitsys has sent your organization.',
      '2. Anything unpaid shows a Pay Now action — the rest is just for your records.',
      "3. Invoices are created and sent by Maitsys directly, so there's nothing to set up here.",
      "4. Contact Maitsys support if a charge looks wrong — this page only reflects what was sent, it can't edit an invoice.",
    ].join('\n'),
    steps: [
      { target: 'panel:Your Invoices', title: 'Invoices from Maitsys', tag: 'List', body: 'Every invoice Maitsys has sent your organisation, newest first, with its status. Choose one to see the detail.' },
      { target: 'panel:INV-', title: 'Invoice detail', tag: 'Detail', body: 'Dates, payment terms, totals and each line item. Anything unpaid shows a Pay Now action; paid invoices are for your records.' },
    ],
  }),

  // ───────────────────────────── SAP Monitoring
  guide({
    key: 'sap-overview',
    pathPrefix: '/sap/systems',
    pageName: 'SAP Overview',
    prompt: 'Want a quick tour of SAP Overview?',
    chipLabel: 'Show me the SAP overview',
    steps: [
      { target: 'btn:GRC', title: 'Pick the destination', tag: 'Filters', body: 'SAP pages follow the destination you pick here, and the choice is remembered as you move between SAP pages.' },
      { target: 'css:.mv-kpi-row-4', title: 'Health at a glance', tag: 'Key figures', body: 'HANA memory, ABAP response time, work processes in use and unread alerts.' },
      { target: 'panel:Resource load by system', title: 'Where the load is', tag: 'Chart', body: 'CPU and memory for every system, busiest first. The dashed line is the 80% mark — systems above it need capacity or tuning.' },
      { target: 'panel:Needs attention', title: 'What needs you', tag: 'Priority', body: 'Critical systems, unread alerts, failed or running jobs, full disks and security notes, most urgent first. Click a row to open the page that deals with it.' },
      { target: 'panel:Operations', title: 'Operations today', tag: 'Summary', body: 'Unread alerts by severity and the state of your background jobs, with a link to Jobs & Dumps.' },
      { target: 'panel:Systems', title: 'Every system', tag: 'Table', body: 'All connected systems with their condition, CPU, memory and when they were last collected.' },
    ],
  }),
  guide({
    key: 'sap-hana',
    pathPrefix: '/sap/databases',
    pageName: 'HANA/DB Monitoring',
    prompt: 'Want to know how to read the HANA page?',
    chipLabel: 'Walk me through HANA monitoring',
    steps: [
      { target: 'css:.mv-kpi-row-4', title: 'Host vitals', tag: 'Key figures', body: 'Memory, CPU, active alerts and live sessions (with who is connected), each with a status tag and the numbers behind it. The host line above shows when the data was last fetched and a countdown to the next sync; Refresh restarts it.' },
      { target: 'panel:Last 24 hours', title: 'The last 24 hours in words', tag: 'Insight', body: 'When CPU peaked, the range memory stayed in, how much headroom you have and any stopped services or active alerts.' },
      { target: 'panel:System Vitals Timeline', title: 'CPU and memory over time', tag: 'Chart', body: 'Hourly CPU and memory for the last day. Use View data for the exact values.' },
      { target: 'panel:Memory composition', title: 'Used and free memory', tag: 'Chart', body: "How much of the host's memory is in use against what is free." },
      { target: 'panel:Active Core Services', title: 'Service memory and status', tag: 'Chart', body: 'Heap used, allocated and shared memory per service. Switch to List to see whether each service is running; stopped services come first so they are hard to miss.' },
      { target: 'panel:Disk Usage', title: 'Disk partitions', tag: 'Chart', body: 'Used and free space across the host, then each partition with its utilisation, path, mount and device. Switch between Donut and Bar.' },
      { target: 'panel:Backup Timeline', title: 'Recent backups', tag: 'Chart', body: 'Data, log and catalog backups over the last 7 or 14 days, with time, duration, size and status. The first line tells you when the last successful data backup ran; View data lists every backup.' },
    ],
  }),
  guide({
    key: 'sap-performance',
    pathPrefix: '/sap/performance',
    pageName: 'Performance',
    prompt: 'Want a hand reading these performance numbers?',
    chipLabel: 'Explain this page',
    steps: [
      { target: 'css:.mv-kpi-row-8', title: 'Eight vital signs', tag: 'Key figures', body: 'Response time, active users, DB hit ratio, work processes, ABAP dumps, aborted jobs, memory and system locks. "Not reported by this system" means the source did not send a value — it is not zero.' },
      { target: 'panel:ABAP Runtime Errors', title: 'Runtime errors', tag: 'Status', body: 'ST22 short dumps. "System is running clean" means there are none; otherwise they are listed here and in Jobs & Dumps.' },
      { target: 'panel:Server Topology', title: 'Application servers', tag: 'List', body: 'Each application server (SM51) with its load, response time, users, quality and dialog steps.' },
      { target: 'panel:Disk Usage', title: 'Disk usage by mount', tag: 'Chart', body: 'How full each mount point is (ST06), fullest first. Watch the ones near the top of the range.' },
      { target: 'panel:DB Call Statistics', title: 'Buffers and DB calls', tag: 'Table', body: 'The SAP buffer hit ratio and database calls per buffer (ST02). This is not the same as the DB Hit Ratio figure above, which the system may not report.' },
      { target: 'panel:Background Jobs', title: 'Background jobs', tag: 'Filters', body: 'Counts of jobs by status (SM37). Click a status to open Jobs & Dumps already filtered; there you can also search jobs and show more.' },
      { target: 'panel:Analytics', title: 'Trend charts', tag: 'Chart', body: 'Job duration, work-process mix, dump timeline, buffer hit, DB calls and the update and enqueue queues. Each has a View data table.' },
    ],
  }),
  guide({
    key: 'sap-jobs',
    pathPrefix: '/sap/jobs',
    pageName: 'Jobs & Dumps',
    prompt: 'Want to know what you can do on this page?',
    chipLabel: 'Show me Jobs & Dumps',
    steps: [
      { target: 'css:#jobs', title: 'Background jobs (SM37)', tag: 'Table', body: 'Filter by status with the chips (each shows its count), search by name or user, and use Show more to page through the list. Each row has its start, finish, duration, user and client. Click a job name for its run details.' },
      { target: 'css:#dumps', title: 'Short dumps (ST22)', tag: 'Table', body: 'ABAP runtime errors. An empty list is good news — it means ST22 has nothing in the period. Click a dump for its details.' },
    ],
  }),
  guide({
    key: 'sap-alerts',
    pathPrefix: '/sap/alerts',
    pageName: 'SAP Alerts & Escalations',
    prompt: 'Need help working through SAP alerts?',
    chipLabel: 'Help me with SAP alerts',
    steps: [
      { target: 'css:.mv-kpi-row-4', title: 'Alert counts', tag: 'Key figures', body: 'Total active, unread, critical and new breaches.' },
      { target: 'btn:HANA Monitoring', title: 'Pick a source', tag: 'Filters', body: 'Switch between all alerts, HANA Monitoring and SAP Monitoring. The counts and the list follow the source you pick.' },
      { target: 'css:table', title: 'The alerts', tag: 'Table', body: 'Each alert with its type, severity, system, when it was detected and its status. Filter by status (active, unread, critical, resolved, ignored) and by type (CPU, memory, disk, sessions, dumps, jobs, locks, work processes).' },
      { target: 'btn:Mark All Read', title: 'Clear the unread count', tag: 'Action', body: 'Marks every alert as read. On a row you can mark one as read, Resolve it so it leaves the active counts, or ignore it. Resolved alerts can be reopened.' },
      { target: 'btn:Recipients', title: 'Who gets told', tag: 'Action', body: 'Add or remove the email addresses that receive alerts.' },
      { target: 'btn:Settings', title: 'Tune detection', tag: 'Action', body: 'Opens the anomaly-detection settings (sensitivity, minimum change, history needed and cooldown) and the per-metric thresholds for HANA and SAP.' },
    ],
  }),
  guide({
    key: 'sap-transport',
    pathPrefix: '/sap/transport-management',
    pageName: 'Transport Management',
    prompt: 'New to transports? Want a quick tour?',
    chipLabel: 'Show me Transport Management',
    steps: [
      { target: 'css:.mv-kpi-row-4', title: 'Transport counts', tag: 'Key figures', body: 'Pending imports, successful imports, failures and releases at a glance.' },
      { target: 'panel:Import Route', title: 'Set the import route', tag: 'Form', body: 'Choose the source and target system (for example DEV to QAS) that transports travel along.' },
      { target: 'css:input[placeholder^="Search"]', title: 'Find a transport', tag: 'Filters', body: 'Search by request number, description or owner. The switch beside it splits transports into Open, Released, Imported and Failed.' },
      { target: 'btn:Import Selected', title: 'Import', tag: 'Action', body: 'Import the transports you ticked into the target system. Export saves the list.' },
      { target: 'panel:Activity Log', title: 'What happened', tag: 'History', body: 'The latest few log entries, with the import queue beside it. View All Logs opens the full log, which you can filter by level and type, search and page through.' },
    ],
  }),
  guide({
    key: 'sap-security-notes',
    pathPrefix: '/sap/security-notes',
    pageName: 'Security Notes',
    prompt: 'Want a tour of security notes?',
    chipLabel: 'Help me with security notes',
    steps: [
      { target: 'css:.mv-kpi-row-5', title: 'Where you stand', tag: 'Key figures', body: 'How many notes you track and how many are implemented, can be implemented, cannot be implemented, obsolete or not yet checked.' },
      { target: 'css:input[placeholder^="Search"]', title: 'Search and filter', tag: 'Filters', body: 'Find a note by number, title or component, and filter by priority (Hot News, High Priority, Correction) and status.' },
      { target: 'btn:Check Status', title: 'Check against your system', tag: 'Action', body: 'Re-checks the notes against the connected SAP system so the status reflects what is actually applied.' },
      { target: 'btn:Upload', title: 'Add notes', tag: 'Action', body: 'Upload one or many 7-digit note numbers to track; they start as Unknown until checked. History lists every upload, check and deletion with who did it and the counts.' },
      { target: 'css:table', title: 'The notes', tag: 'Table', body: 'Each note with its priority, component, CVSS score, release date, SAP download status and implementation status. Recheck a note against SAP or delete it from its row.' },
    ],
  }),
  guide({
    key: 'sap-btp-security',
    pathPrefix: '/sap/btp-security',
    pageName: 'BTP Security Assessment',
    prompt: 'Want help reading this security assessment?',
    chipLabel: 'Walk me through this page',
    steps: [
      { target: 'btn:Users', title: 'Users, role collections and roles', tag: 'Tabs', body: 'Switch between who has access (Users), the bundles of access they hold (Role Collections) and the individual permissions (Roles).' },
      { target: 'css:input[placeholder^="Search"]', title: 'Search and filter', tag: 'Filters', body: 'Search by name, email or username, and filter by status.' },
      { target: 'css:table', title: 'The list', tag: 'Table', body: 'Groups, status, verification, last login and creation date for each user. The list stays empty until a destination with BTP access is connected.' },
    ],
  }),
  guide({
    key: 'sap-configuration',
    pathPrefix: '/sap/configuration',
    pageName: 'System Configuration',
    prompt: 'Need help connecting an SAP system?',
    chipLabel: 'Help me connect a destination',
    steps: [
      { target: 'btn:Add Destination', title: 'Add a destination', tag: 'Action', body: 'A destination is a connection to an SAP environment. Give it a name and its endpoint URL.' },
      { target: 'css:input[placeholder^="Search"]', title: 'Find one', tag: 'Filters', body: 'Search destinations by name or URL.' },
      { target: 'btn:Connect', title: 'Connect or disconnect', tag: 'Action', body: 'Only a connected destination is monitored. A card shows its systems and whether HANA is configured.' },
      { target: 'css:button[aria-label^="Edit"]', title: 'Edit', tag: 'Action', body: "Change a destination's name, URL or systems in the same form used to add one. The bin button next to it removes the destination after asking." },
    ],
  }),

  // ───────────────────────────── Administration and account
  guide({
    key: 'alerts',
    pathPrefix: '/alerts',
    pageName: 'Alerts',
    prompt: 'Want to know how this alerts page works?',
    chipLabel: 'Explain this page',
    steps: [
      { target: 'css:table', title: 'One inbox for every module', tag: 'Table', body: "Alerts you are allowed to see from SAP Monitoring and Cloud Cost, with the time, source, message, severity and status. For detail and actions, open the module's own alerts page." },
    ],
  }),
  guide({
    key: 'user-management',
    pathPrefix: '/users',
    pageName: 'User Management',
    prompt: 'Need help managing your team here?',
    chipLabel: 'Help me manage users',
    reply: [
      "Here's how User Management works:",
      '1. The member table lists everyone in your org with their role and access level.',
      "2. Use Deactivate to revoke a member's access without deleting their history — Activate brings them back the same way.",
      "3. You can't deactivate your own account — that action is disabled so you're never locked out by accident.",
      "4. Only people whose role allows it can manage other members. Roles and their permissions are further down the same page.",
      '5. Under Roles you can add, edit, duplicate or delete roles; under Permissions you pick a role and switch what it can view, create, edit, delete or export.',
    ].join('\n'),
    flows: [
      {
        key: 'add-user',
        label: 'Add a user',
        steps: [
          { target: 'btn:Add user', title: 'Click Add user', tag: 'Step 1', body: 'The button is available while your plan has a free seat. If it is disabled, every seat is taken: deactivate someone first, or ask for more seats under Subscription.' },
          { target: 'css:table', title: 'Fill in the form', tag: 'Step 2', body: 'In the dialog, enter their name and email and pick a role. Admins and owners can manage other members; members cannot.' },
          { target: 'css:table', title: 'Set their access', tag: 'Step 3', body: 'Once added they appear in this table. Switch View access on for each provider they should see, and choose Full or Read-only.' },
        ],
      },
      {
        key: 'deactivate-user',
        label: 'Deactivate or reactivate a user',
        steps: [
          { target: 'css:input[type="search"]', title: 'Find the member', tag: 'Step 1', body: 'Search by name or email to bring them to the top of the list.' },
          { target: 'btn:Deactivate', title: 'Deactivate', tag: 'Step 2', body: "Revokes their access straight away but keeps their history. You can't deactivate yourself." },
          { target: 'btn:Activate', title: 'Reactivate later', tag: 'Step 3', body: 'Activate brings a deactivated member back the same way. It needs a free seat if your seat count is full.' },
        ],
      },
      {
        key: 'change-access',
        label: 'Change who can see what',
        steps: [
          { target: 'css:table', title: 'Provider access', tag: 'Step 1', body: 'Each column is a cloud provider. Switch View access on or off per person, then choose Full or Read-only. Admins and owners always have full access.' },
        ],
      },
    ],
    steps: [
      { target: 'btn:Add user', title: 'Add a user', tag: 'Action', body: 'Invite someone to your organisation while you have a free seat. Choose their role and which cloud providers they can view.' },
      { target: 'css:input[type="search"]', title: 'Find a member', tag: 'Filters', body: 'Search by name or email.' },
      { target: 'css:table', title: 'Access per provider', tag: 'Table', body: 'For each provider, switch View access on or off, and choose Full or Read-only. Admins and owners always have full access.' },
      { target: 'btn:Deactivate', title: 'Deactivate', tag: 'Action', body: "Revoke a member's access without deleting their history; Activate brings them back. You cannot deactivate yourself, and a full seat count blocks re-activating until one is free." },
      { target: 'btn:Elevate', title: 'Elevate to Admin', tag: 'Action', body: 'Promote a member to Admin after a confirmation. Use the Role column to give anyone else a different role. You cannot change your own role or the Owner’s.' },
      { target: 'panel:Roles', title: 'Roles', tag: 'Roles', body: 'The four built-in roles (Owner, Admin, Analyst, Viewer) and any custom roles. Add, edit, duplicate or delete a role; a role that members still hold cannot be deleted. Click a role name for who holds it and what it can do.' },
      { target: 'panel:Permissions', title: 'Permissions', tag: 'Matrix', body: 'Pick a role, then switch View, Create, Edit, Delete and Export per module. Dashed cells do not apply to that module. Built-in roles are read-only; save or discard your changes from the bar that appears at the bottom.' },
    ],
  }),
  guide({
    key: 'audit-trail',
    pathPrefix: '/audit-trail',
    pageName: 'Audit Trail',
    prompt: 'Want a quick tour of the Audit Trail?',
    chipLabel: 'Show me the Audit Trail',
    steps: [
      { target: 'css:.mv-audit-filters', title: 'Find the events you need', tag: 'Filters', body: 'Search by anything in the record, switch between Admin and Member actors, and narrow by module and date range.' },
      { target: 'css:.mv-audit-timeline', title: 'The timeline', tag: 'Timeline', body: 'Events grouped by day, newest first, each with who did it, to what, and whether it worked. Click an event name for its full record; role and permission changes show the values before and after.' },
      { target: 'btn:Export CSV', title: 'Export what you see', tag: 'Action', body: 'Download the filtered events as a CSV.' },
      { target: 'btn:Manual re-sync', title: 'Re-sync', tag: 'Action', body: 'Pull in events recorded since you opened the page.' },
    ],
  }),
  guide({
    key: 'sync-logs',
    pathPrefix: '/sync-logs',
    pageName: 'Sync Logs',
    prompt: 'Want help reading the sync logs?',
    chipLabel: 'Explain the sync logs',
    steps: [
      { target: 'css:.mv-toolbar', title: 'Filter the runs', tag: 'Filters', body: 'Show only successful, failed or running syncs, and only one provider.' },
      { target: 'css:table', title: 'Every data fetch', tag: 'Table', body: 'Each scheduled or manual sync with its account, provider, who triggered it, when it started, its status and how long it took. Click an account name for the full run details and any error.' },
      { target: 'btn:Refresh', title: 'Refresh', tag: 'Action', body: 'Reload the log to see runs that finished since you opened the page.' },
    ],
  }),
  guide({
    key: 'account',
    pathPrefix: '/account',
    pageName: 'Account',
    prompt: 'Want a tour of your account settings?',
    chipLabel: 'Show me my account page',
    steps: [
      { target: 'panel:Profile', title: 'Your profile', tag: 'Details', body: "Your name, email and role. These come from your organisation's user directory, so ask an administrator to change them." },
      { target: 'panel:Preferences', title: 'Appearance', tag: 'Setting', body: 'Switch between the light and dark theme. It applies straight away on this device.' },
      { target: 'panel:Change password', title: 'Change your password', tag: 'Security', body: 'Enter your current password and a new one of at least eight characters.' },
    ],
  }),
  guide({
    key: 'subscription',
    pathPrefix: '/subscription',
    pageName: 'Subscription',
    prompt: 'Questions about your plan or cloud access here?',
    chipLabel: 'Help me understand my subscription',
    reply: [
      "Here's how Subscription works:",
      '1. The top of the page shows your current plan, renewal date and enabled modules.',
      '2. If you\'re an admin, "Update Cloud Access" lets you change which providers your org connects to.',
      '3. Compare plans under Available Plans — "Choose Plan" opens a contact form, since upgrades go through Maitsys rather than self-service.',
      "4. Cloud access for non-admins is admin-managed — contact your org administrator to request a change.",
    ].join('\n'),
    steps: [
      { target: 'css:main .mv-panel', title: 'Your plan', tag: 'Details', body: 'Your current plan, when it started and when it is valid until, how many team members it allows, and which features are included.' },
      { target: 'panel:What your organisation', title: 'Modules and cloud access', tag: 'Details', body: 'The modules and cloud providers your organisation is subscribed to. Maitsys manages these; contact them to change them.' },
      { target: 'panel:Available Plans', title: 'Compare plans', tag: 'Tip', body: 'See what each plan includes. Upgrades go through Maitsys rather than self-service.' },
    ],
  }),
];

/** The guide for a page: the one with the longest route prefix that matches; the dashboard matches only "/". */
export function flowGuideForPath(pathname: string): FlowGuide | undefined {
  let best: FlowGuide | undefined;
  for (const candidate of FLOW_GUIDES) {
    const matches = candidate.pathPrefix === '/' ? pathname === '/' : pathname.startsWith(candidate.pathPrefix);
    if (matches && (!best || candidate.pathPrefix.length > best.pathPrefix.length)) best = candidate;
  }
  return best;
}
