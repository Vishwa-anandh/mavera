import { cloudInsightsRepository, isEmptyWorkspace, sapRepository, workspaceRepository, type CloudProviderId } from '../../../data-access';
import { checklistFor, flowAvailable, nextCoachFlow, setupIntentFor, type SetupIntent } from './setupIntents';

export interface AnswerModules {
  cloudCost: boolean;
  sapMonitoring: boolean;
}

const PROVIDER_NAME: Record<CloudProviderId, string> = { azure: 'Azure', aws: 'AWS', gcp: 'Google Cloud', btp: 'SAP BTP' };
const SAMPLE_NOTE = '\n\n(Sample data — the figures come from this prototype\'s demo dataset, not a live account.)';

const usd = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
const eur = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** A brand-new organisation has connected nothing yet: there is no sample figure to quote, only the next step. */
const cloudNotConnected = () => isEmptyWorkspace() && workspaceRepository.accountCount() === 0;
const sapNotConnected = () => isEmptyWorkspace() && !sapRepository.isConnected();

const CLOUD_NOTHING_CONNECTED = [
  'Nothing is connected yet, so there is no cloud spend to report.',
  'Next step: connect your first account. Open Azure from the Cloud Cost menu and choose Connect, or use “Connect your first account” on the dashboard. Once an account is connected I can answer from its (sample) data.',
].join('\n');

const SAP_NOTHING_CONNECTED = [
  'Nothing is connected yet, so there are no SAP systems to report on.',
  'Next step: connect your first SAP system. Open System Configuration under SAP Monitoring and choose Add Destination. Once it is connected I can answer from its (sample) data.',
].join('\n');

function needs(module: 'cloud' | 'sap', modules: AnswerModules): string | null {
  if (module === 'cloud' && !modules.cloudCost) return "Cloud Cost isn't part of your organisation's subscription, so I have nothing to report on it.";
  if (module === 'sap' && !modules.sapMonitoring) return "SAP Monitoring isn't part of your organisation's subscription, so I have nothing to report on it.";
  return null;
}

// ───────────────────────────────────────────────────────────── cloud answers
function spendAnswer(): string {
  if (cloudNotConnected()) return CLOUD_NOTHING_CONNECTED;
  const data = cloudInsightsRepository.getCostAnalytics();
  const current = data.monthly.filter((m) => m.month === data.currentMonth);
  const months = [...new Set(data.monthly.map((m) => m.month))].filter((m) => m < data.currentMonth).sort();
  const previousMonth = months[months.length - 1];
  const lines = current.map((m) => {
    const before = data.monthly.find((p) => p.provider === m.provider && p.month === previousMonth);
    const change = before && before.cost > 0 ? ` (${m.cost >= before.cost ? '+' : '−'}${Math.abs(Math.round(((m.cost - before.cost) / before.cost) * 1000) / 10)}% vs last month)` : '';
    return `• ${PROVIDER_NAME[m.provider]}: ${m.currency === 'EUR' ? eur(m.cost) : usd(m.cost)}${change}`;
  });
  const usdTotal = current.filter((m) => m.currency === 'USD').reduce((s, m) => s + m.cost, 0);
  const hasEur = current.some((m) => m.currency === 'EUR');
  return [
    `Month-to-date cloud spend is ${usd(usdTotal)}${hasEur ? ' in USD, plus SAP BTP in EUR (billed separately, so not added)' : ''}:`,
    ...lines,
    'Open Cost Overview for the trend and the biggest movers.',
  ].join('\n') + SAMPLE_NOTE;
}

function topServicesAnswer(): string {
  if (cloudNotConnected()) return CLOUD_NOTHING_CONNECTED;
  const services = [...cloudInsightsRepository.getCostAnalytics().services].filter((s) => s.currency === 'USD').sort((a, b) => b.cost - a.cost).slice(0, 5);
  return [
    'The five services costing the most this month:',
    ...services.map((s, i) => `${i + 1}. ${s.name} (${PROVIDER_NAME[s.provider]}) — ${usd(s.cost)}`),
    'Cost Analytics shows the full breakdown by service, region or account.',
  ].join('\n') + SAMPLE_NOTE;
}

function savingsAnswer(): string {
  if (cloudNotConnected()) return CLOUD_NOTHING_CONNECTED;
  const all = cloudInsightsRepository.listOptimizationOpportunities();
  const counted = all.filter((o) => !o.overlapsWith || !all.some((x) => x.id === o.overlapsWith));
  const total = counted.reduce((s, o) => s + o.monthlySaving, 0);
  const top = [...counted].sort((a, b) => b.monthlySaving - a.monthlySaving).slice(0, 3);
  return [
    `There are ${plural(all.length, 'open opportunity', 'open opportunities')} worth about ${usd(total)} a month (overlapping ones are not double-counted). The biggest three:`,
    ...top.map((o, i) => `${i + 1}. ${o.title} — ${usd(o.monthlySaving)}/month (${PROVIDER_NAME[o.provider]}, ${o.impact.toLowerCase()} impact)`),
    'Open Savings & Optimization to assign an owner, start a review or dismiss one.',
  ].join('\n') + SAMPLE_NOTE;
}

function reservationsAnswer(): string {
  if (cloudNotConnected()) return CLOUD_NOTHING_CONNECTED;
  const items = cloudInsightsRepository.listReservations().sort((a, b) => a.end.localeCompare(b.end));
  const under = items.filter((r) => r.utilizationPercent < 80);
  return [
    `You hold ${plural(items.length, 'reservation or savings plan')}. The next to expire:`,
    ...items.slice(0, 3).map((r) => `• ${r.name} — ends ${r.end}, ${r.utilizationPercent}% utilised`),
    under.length > 0 ? `${plural(under.length, 'commitment')} below 80% utilisation: ${under.map((r) => r.name).join(', ')}.` : 'All of them are above 80% utilisation.',
    'Reserved Instances has the utilisation history for each one.',
  ].join('\n') + SAMPLE_NOTE;
}

// ───────────────────────────────────────────────────────────── SAP answers
function sapHealthAnswer(): string {
  if (sapNotConnected()) return SAP_NOTHING_CONNECTED;
  const systems = sapRepository.listSystems();
  const count = (c: string) => systems.filter((s) => s.condition === c).length;
  const notHealthy = systems.filter((s) => s.condition !== 'healthy');
  return [
    `${systems.length} SAP systems: ${count('healthy')} healthy, ${count('warning')} warning, ${count('critical')} critical.`,
    ...notHealthy.map((s) => `• ${s.name} (${s.environment}) is ${s.condition} — CPU ${s.cpuPercent}%, memory ${s.memoryPercent}%`),
    'SAP Overview charts the load for every system and lists what needs attention.',
  ].join('\n') + SAMPLE_NOTE;
}

function sapAlertsAnswer(): string {
  if (sapNotConnected()) return SAP_NOTHING_CONNECTED;
  const alerts = sapRepository.listAlerts();
  const unread = alerts.filter((a) => !a.read);
  return [
    `${plural(unread.length, 'unread SAP alert')} out of ${alerts.length}.`,
    ...unread.slice(0, 3).map((a) => `• ${a.severity}: ${a.type} on ${a.system.length > 14 ? `${a.system.slice(0, 8)}…` : a.system}`),
    'Open Alerts & Escalations under SAP Monitoring to read, dismiss or filter them.',
  ].join('\n') + SAMPLE_NOTE;
}

function hanaAnswer(): string {
  if (sapNotConnected()) return SAP_NOTHING_CONNECTED;
  const { system, timeline, services } = sapRepository.getHana();
  const peak = timeline.reduce((best, p) => (p.cpuPercent > best.cpuPercent ? p : best), timeline[0]);
  const stopped = services.filter((s) => s.status === 'stopped');
  return [
    `HANA host ${system.name}: memory ${system.memory.percent}% (${system.memory.usedGb} of ${system.memory.totalGb} GB, ${system.memory.freeGb} GB free), CPU ${system.cpu.loadPercent}%.`,
    `Over the last 24 hours CPU peaked at ${peak.cpuPercent}% around ${peak.time}.`,
    stopped.length > 0 ? `${plural(stopped.length, 'service')} stopped: ${stopped.map((s) => s.name).join(', ')}.` : 'All core services are running.',
    'HANA/DB Monitoring has the timeline and the memory by service.',
  ].join('\n') + SAMPLE_NOTE;
}

function jobsAnswer(): string {
  if (sapNotConnected()) return SAP_NOTHING_CONNECTED;
  const jobs = sapRepository.listJobs();
  const dumps = sapRepository.listDumps();
  const by = (s: string) => jobs.filter((j) => j.status === s).length;
  return [
    `Background jobs: ${by('Running')} running, ${by('Scheduled')} scheduled, ${by('Finished')} finished, ${by('Cancelled')} cancelled.`,
    dumps.length === 0 ? 'No ABAP short dumps (ST22) in the period.' : `${plural(dumps.length, 'short dump')} to review.`,
    'Jobs & Dumps shows both side by side.',
  ].join('\n') + SAMPLE_NOTE;
}

function diskAnswer(): string {
  if (sapNotConnected()) return SAP_NOTHING_CONNECTED;
  const mounts = sapRepository.listDiskMounts().sort((a, b) => b.percent - a.percent);
  const full = mounts.filter((m) => m.percent >= 85);
  return [
    full.length > 0 ? `${plural(full.length, 'mount')} above 85%: ${full.map((m) => `${m.path} (${m.percent}%)`).join(', ')}.` : 'No mount is above 85% full.',
    `Fullest first: ${mounts.slice(0, 3).map((m) => `${m.path} ${m.percent}%`).join(', ')}.`,
    'Performance has the disk usage chart.',
  ].join('\n') + SAMPLE_NOTE;
}

function securityAnswer(): string {
  if (sapNotConnected()) return SAP_NOTHING_CONNECTED;
  const notes = sapRepository.getSecurityNoteSummary();
  return [
    `You track ${plural(notes.total, 'SAP security note')}. ${notes.actionable} can be applied now and ${notes.hotNews} Hot News ${notes.hotNews === 1 ? 'note is' : 'notes are'} not yet implemented.`,
    'Security Notes lets you re-check them against your system.',
  ].join('\n') + SAMPLE_NOTE;
}

function performanceAnswer(): string {
  if (sapNotConnected()) return SAP_NOTHING_CONNECTED;
  const p = sapRepository.getPerformance();
  return [
    `ABAP response time is ${p.responseTimeMs} ms with ${p.activeUsers} active users and ${p.workProcessesUsed} of ${p.workProcessesTotal} work processes in use.`,
    `${plural(p.abapDumps, 'dump')}, ${plural(p.abortedJobs, 'aborted job')} and ${plural(p.systemLocks, 'system lock')}.`,
    'Performance has the full set of vital signs.',
  ].join('\n') + SAMPLE_NOTE;
}

// ───────────────────────────────────────────────────────────── setting up
/** The assistant's words for a setup request; the widget starts the live guide or opens the checklist alongside. */
function setupAnswer(intent: SetupIntent, modules: AnswerModules): string {
  if (intent.kind === 'coach') {
    const { flow } = intent;
    if (!flowAvailable(flow, modules)) return needs(flow.module === 'sapMonitoring' ? 'sap' : 'cloud', modules) ?? '';
    return [
      `Starting the live guide: ${flow.label}.`,
      'I will point at what to click, wait until you have done it and move on by myself. Choose Skip this step on the card if you would rather do something yourself, or close the guide any time.',
    ].join('\n');
  }
  const list = checklistFor(modules);
  const remaining = list.steps.filter((step) => !step.done);
  if (remaining.length === 0) return `Everything on your getting started checklist is done (${list.doneCount} of ${list.steps.length}). Nicely set up.`;
  const next = remaining[0];
  const progress = `${list.doneCount} of ${list.steps.length} steps are done. Next: ${next.label.charAt(0).toLowerCase()}${next.label.slice(1)}.`;
  if (intent.kind === 'checklist') return `Here is your getting started checklist (on the dashboard). ${progress}`;
  const flow = nextCoachFlow(modules);
  return flow
    ? `Let us get you set up. ${progress} I will open the checklist and guide you through it, one step at a time.`
    : `Here is your getting started checklist. ${progress}`;
}

// ───────────────────────────────────────────────────────────── routing
interface Intent {
  pattern: RegExp;
  module?: 'cloud' | 'sap';
  answer: () => string;
}

/** Most specific first: the first intent whose pattern matches answers the question. */
const INTENTS: Intent[] = [
  { pattern: /\b(hana|database|db memory)\b/, module: 'sap', answer: hanaAnswer },
  { pattern: /\b(disk|storage space|mount|backup volume)\b/, module: 'sap', answer: diskAnswer },
  { pattern: /\b(security notes?|snotes?|cve|patch(es)?|vulnerab)/, module: 'sap', answer: securityAnswer },
  { pattern: /\b(jobs?|dumps?|st22|sm37|batch)\b/, module: 'sap', answer: jobsAnswer },
  { pattern: /\b(response time|work process|performance|locks?)\b/, module: 'sap', answer: performanceAnswer },
  { pattern: /\bsap\b.*\balerts?\b|\balerts?\b.*\bsap\b|\bunread\b.*\balerts?\b/, module: 'sap', answer: sapAlertsAnswer },
  { pattern: /\b(system health|systems?|landscape|sap health|healthy|critical)\b/, module: 'sap', answer: sapHealthAnswer },
  { pattern: /\b(reservations?|reserved|commitments?|savings plans?|expir)/, module: 'cloud', answer: reservationsAnswer },
  { pattern: /\b(saving|savings|optimi[sz]|recommend|rightsiz|cheaper|reduce)/, module: 'cloud', answer: savingsAnswer },
  { pattern: /\b(top|biggest|most|highest|expensive|driver)s?\b.*\b(service|cost|spend)|\bservices?\b.*\b(top|biggest|most|highest|expensive)\b/, module: 'cloud', answer: topServicesAnswer },
  { pattern: /\b(spend|spending|cost|costs|bill|billing|cloud)\b/, module: 'cloud', answer: spendAnswer },
  { pattern: /\balerts?\b/, module: 'sap', answer: sapAlertsAnswer },
];

const GREETING = /^(hi|hello|hey|good (morning|afternoon|evening))\b/;
const REPORT = /\b(report|export|download|csv)\b/;
const HOW_TO = /\b(how (do|can|to)|where (do|can|is)|help|guide|tour|walk me)\b/;

/** What the assistant can talk about in this prototype, with example questions, for the fallback reply. */
export function answerableTopics(modules: AnswerModules): string[] {
  return [
    modules.cloudCost && 'cloud spend this month, top services, savings opportunities, expiring reservations',
    modules.sapMonitoring && 'SAP system health, alerts, HANA memory, jobs and dumps, disk space, security notes, performance',
  ].filter((item): item is string => Boolean(item));
}

/**
 * Answers a question from the prototype's sample data, or returns null when it doesn't recognise it.
 * Answers say plainly that they come from sample data; nothing here is a live figure.
 */
export function answerFromDemoData(question: string, modules: AnswerModules): string | null {
  const text = question.toLowerCase().trim();
  if (!text) return null;

  if (GREETING.test(text)) {
    const cloudWaiting = modules.cloudCost && cloudNotConnected();
    const sapWaiting = modules.sapMonitoring && sapNotConnected();
    // Every module the organisation has is still waiting for its first connection: say so, and name the next step.
    if ((cloudWaiting || sapWaiting) && !(modules.cloudCost && !cloudWaiting) && !(modules.sapMonitoring && !sapWaiting)) {
      return `Hello! Nothing is connected yet, so I have no data to quote. ${modules.cloudCost ? 'Connect your first cloud account (Azure is the quickest)' : 'Connect your first SAP system in System Configuration'} and I can answer questions about it.`;
    }
    const topics = answerableTopics(modules).join('; ');
    return `Hello! I can answer from the sample data about: ${topics || 'your workspace'}. Try “What is our cloud spend this month?” or open the help button on any page for a guided tour.`;
  }
  const setup = setupIntentFor(text);
  if (setup) return setupAnswer(setup, modules);
  if (REPORT.test(text)) {
    return modules.cloudCost
      ? 'To export a report, open Cost Analytics (Cloud Cost menu), choose the providers, range and grouping you want, and click Export report — you get a CSV of exactly what is on screen. Resource Inventory and Security Notes have their own exports too.'
      : 'Reports are exported from the page that shows the data — look for an Export button in the page header or above the table.';
  }

  const intent = INTENTS.find((i) => i.pattern.test(text));
  if (intent) {
    const blocked = intent.module ? needs(intent.module, modules) : null;
    return blocked ?? intent.answer();
  }

  if (HOW_TO.test(text)) {
    return 'The quickest way to learn a page is its guided tour: open me on that page and click the help button at the top of the chat. I can also answer questions about your data — try “What needs attention?”.';
  }
  if (/\b(attention|urgent|priority|problem|issue|wrong|worry)\b/.test(text)) {
    const parts: string[] = [];
    if (modules.sapMonitoring) parts.push(sapHealthAnswer().split('\n')[0]);
    if (modules.cloudCost) parts.push(savingsAnswer().split('\n')[0]);
    if ((!modules.cloudCost || cloudNotConnected()) && (!modules.sapMonitoring || sapNotConnected())) {
      const next = modules.cloudCost ? 'connect your first cloud account (Azure is the quickest)' : 'connect your first SAP system in System Configuration';
      return `Nothing is connected yet, so there is nothing to flag. Next step: ${next}. Then the dashboard's “Needs attention” list ranks everything across your modules.`;
    }
    return `${parts.join('\n')}\nThe dashboard's “Needs attention” list ranks everything across your modules.${SAMPLE_NOTE}`;
  }
  return null;
}
