/**
 * The public invoice demo. Nothing here reads or uploads a file: the "parse" is a deterministic simulation that derives a
 * plausible invoice from the provider, the file name and the file size, so the same file always shows the same result.
 */

export type DemoProvider = 'azure' | 'aws' | 'btp' | 'gcp';

export const DEMO_PROVIDERS: Array<{ id: DemoProvider; label: string; hint: string }> = [
  { id: 'azure', label: 'Azure', hint: 'Billing, Invoices, Download PDF in the Azure portal.' },
  { id: 'aws', label: 'AWS', hint: 'Billing console, Bills, Download PDF.' },
  { id: 'btp', label: 'SAP BTP', hint: 'Cost Management export from the global account, as XLSX.' },
  { id: 'gcp', label: 'Google Cloud', hint: 'Cloud Billing, Documents, Download PDF.' },
];

export const PROVIDER_LABEL: Record<DemoProvider, string> = { azure: 'Azure', aws: 'AWS', btp: 'SAP BTP', gcp: 'Google Cloud' };

/** How long the simulated parse "takes", so the progress state is visible. */
export const PARSE_DELAY_MS = 1100;

export const MAX_INVOICE_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_EXTENSIONS = ['.pdf', '.xlsx'];

/** Why a chosen file cannot be used, or null when it can. Only the name and size are looked at. */
export function invoiceFileProblem(file: { name: string; size: number }): string | null {
  const name = file.name.toLowerCase();
  const extension = name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
  if (!ACCEPTED_EXTENSIONS.includes(extension)) return `${file.name} is not a PDF or XLSX file.`;
  if (file.size === 0) return `${file.name} is empty.`;
  if (file.size > MAX_INVOICE_BYTES) return `${file.name} is larger than 10 MB.`;
  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface DemoLineItem {
  service: string;
  description: string;
  /** Quantity with its unit, e.g. "1,240 hours". */
  usage: string;
  amount: number;
}

export interface DemoServiceSpend {
  service: string;
  amount: number;
  /** Share of the subtotal, one decimal place. */
  sharePercent: number;
}

export interface ParsedInvoice {
  provider: DemoProvider;
  fileName: string;
  invoiceNumber: string;
  billingPeriod: string;
  currency: 'USD' | 'EUR';
  lineItems: DemoLineItem[];
  subtotal: number;
  taxRate: number;
  tax: number;
  total: number;
  /** Line items added up per service, largest first. */
  spendByService: DemoServiceSpend[];
}

interface ServiceTemplate {
  service: string;
  /** Relative weight of this service in a typical bill. */
  weight: number;
  lines: Array<{ description: string; unit: string; unitPrice: number }>;
}

const CATALOG: Record<DemoProvider, ServiceTemplate[]> = {
  azure: [
    { service: 'Virtual Machines', weight: 9, lines: [{ description: 'D4s v5, Linux, Central India', unit: 'hours', unitPrice: 0.192 }, { description: 'E8s v5, Windows, Central India', unit: 'hours', unitPrice: 0.69 }] },
    { service: 'Azure SQL Database', weight: 6, lines: [{ description: 'General Purpose, 4 vCore', unit: 'hours', unitPrice: 0.92 }] },
    { service: 'Storage', weight: 3, lines: [{ description: 'Hot LRS block blob', unit: 'GB-months', unitPrice: 0.0184 }, { description: 'Premium SSD managed disks', unit: 'GB-months', unitPrice: 0.132 }] },
    { service: 'Azure Kubernetes Service', weight: 4, lines: [{ description: 'Standard tier uptime SLA', unit: 'cluster-hours', unitPrice: 0.1 }] },
    { service: 'Bandwidth', weight: 2, lines: [{ description: 'Data transfer out, Zone 1', unit: 'GB', unitPrice: 0.087 }] },
    { service: 'Azure Monitor', weight: 1.5, lines: [{ description: 'Log Analytics data ingestion', unit: 'GB', unitPrice: 2.76 }] },
    { service: 'Key Vault', weight: 0.5, lines: [{ description: 'Operations, standard', unit: '10K operations', unitPrice: 0.03 }] },
  ],
  aws: [
    { service: 'Amazon EC2', weight: 9, lines: [{ description: 'm5.xlarge, On-Demand, ap-south-1', unit: 'hours', unitPrice: 0.2 }, { description: 'r5.2xlarge, Savings Plan, ap-south-1', unit: 'hours', unitPrice: 0.34 }] },
    { service: 'Amazon RDS', weight: 6, lines: [{ description: 'db.r5.large PostgreSQL, Multi-AZ', unit: 'hours', unitPrice: 0.52 }] },
    { service: 'Amazon S3', weight: 3, lines: [{ description: 'Standard storage', unit: 'GB-months', unitPrice: 0.025 }, { description: 'PUT, COPY, POST requests', unit: '1K requests', unitPrice: 0.005 }] },
    { service: 'Amazon EKS', weight: 3, lines: [{ description: 'Cluster fee', unit: 'cluster-hours', unitPrice: 0.1 }] },
    { service: 'Data Transfer', weight: 2, lines: [{ description: 'Out to the internet', unit: 'GB', unitPrice: 0.1093 }] },
    { service: 'AWS Lambda', weight: 1.5, lines: [{ description: 'Duration, 1024 MB', unit: 'GB-seconds', unitPrice: 0.0000167 }] },
    { service: 'Amazon CloudWatch', weight: 1, lines: [{ description: 'Logs ingestion', unit: 'GB', unitPrice: 0.67 }] },
  ],
  btp: [
    { service: 'SAP HANA Cloud', weight: 9, lines: [{ description: 'Compute, 2 vCPU 32 GB', unit: 'block-hours', unitPrice: 1.48 }, { description: 'Storage', unit: 'GB-months', unitPrice: 0.19 }] },
    { service: 'Cloud Foundry Runtime', weight: 5, lines: [{ description: 'Application memory', unit: 'GB-hours', unitPrice: 0.063 }] },
    { service: 'Integration Suite', weight: 4, lines: [{ description: 'Cloud Integration, standard', unit: 'messages (1K)', unitPrice: 0.09 }] },
    { service: 'SAP Build Work Zone', weight: 3, lines: [{ description: 'Standard edition users', unit: 'user-months', unitPrice: 2.4 }] },
    { service: 'Kyma Runtime', weight: 2.5, lines: [{ description: 'Kubernetes node capacity', unit: 'node-hours', unitPrice: 0.38 }] },
    { service: 'Connectivity', weight: 1, lines: [{ description: 'Cloud Connector tunnels', unit: 'tunnel-days', unitPrice: 0.45 }] },
  ],
  gcp: [
    { service: 'Compute Engine', weight: 9, lines: [{ description: 'n2-standard-4, asia-south1', unit: 'hours', unitPrice: 0.2 }, { description: 'e2-medium, asia-south1', unit: 'hours', unitPrice: 0.034 }] },
    { service: 'Cloud SQL', weight: 5, lines: [{ description: 'PostgreSQL, 4 vCPU, HA', unit: 'hours', unitPrice: 0.95 }] },
    { service: 'Cloud Storage', weight: 3, lines: [{ description: 'Standard storage, regional', unit: 'GB-months', unitPrice: 0.02 }] },
    { service: 'BigQuery', weight: 4, lines: [{ description: 'Analysis, on-demand', unit: 'TiB scanned', unitPrice: 6.25 }] },
    { service: 'Kubernetes Engine', weight: 3, lines: [{ description: 'Cluster management fee', unit: 'cluster-hours', unitPrice: 0.1 }] },
    { service: 'Networking', weight: 1.5, lines: [{ description: 'Egress, worldwide', unit: 'GB', unitPrice: 0.12 }] },
  ],
};

const CURRENCY: Record<DemoProvider, ParsedInvoice['currency']> = { azure: 'USD', aws: 'USD', btp: 'EUR', gcp: 'USD' };
const TAX_RATE = 0.18;

/** FNV-1a, 32 bit: the same text always gives the same number. */
export function hashText(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** A small seeded generator (mulberry32): every call returns the next number in [0, 1). */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** One of the twelve months ending September 2026, as "1–31 March 2026". */
function billingPeriodFor(pick: number): string {
  const index = Math.floor(pick * 12); // 0..11, 0 is October 2025
  const monthIndex = (9 + index) % 12;
  const year = 2025 + Math.floor((9 + index) / 12);
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return `1–${lastDay} ${MONTHS[monthIndex]} ${year}`;
}

function digits(random: () => number, count: number): string {
  let out = '';
  for (let i = 0; i < count; i += 1) out += Math.floor(random() * 10);
  return out;
}

function invoiceNumberFor(provider: DemoProvider, random: () => number): string {
  switch (provider) {
    case 'azure': return `G${digits(random, 9)}`;
    case 'aws': return digits(random, 10).replace(/^0/, '4');
    case 'btp': return `BTP-${2025 + Math.floor(random() * 2)}-${digits(random, 6)}`;
    case 'gcp': return digits(random, 10).replace(/^0/, '5');
  }
}

const toCents = (value: number) => Math.round(value * 100);

/**
 * Builds the sample result for a file. The output depends only on `provider`, the file name (case-insensitive) and
 * the size in bytes. The file's contents are never read.
 */
export function simulateInvoiceParse(input: { provider: DemoProvider; fileName: string; sizeBytes: number }): ParsedInvoice {
  const { provider, fileName, sizeBytes } = input;
  const random = seededRandom(hashText(`${provider}|${fileName.trim().toLowerCase()}|${sizeBytes}`));

  const invoiceNumber = invoiceNumberFor(provider, random);
  const billingPeriod = billingPeriodFor(random());

  // A bill of between roughly 1,800 and 48,000 in its currency, spread over 5 to all of the provider's services.
  const target = 1800 + Math.pow(random(), 2) * 46000;
  const catalog = CATALOG[provider];
  const serviceCount = Math.min(catalog.length, 5 + Math.floor(random() * (catalog.length - 4)));
  const chosen = [...catalog]
    .map((template) => ({ template, order: random() * (1 / template.weight) }))
    .sort((a, b) => a.order - b.order)
    .slice(0, serviceCount)
    .map((entry) => entry.template);

  const slots = chosen.flatMap((template) => template.lines.map((line) => ({ template, line, share: template.weight / template.lines.length * (0.6 + random() * 0.8) })));
  const shareTotal = slots.reduce((sum, slot) => sum + slot.share, 0);
  const lineItems: DemoLineItem[] = slots.map(({ template, line, share }) => {
    const amountCents = Math.max(1, toCents((share / shareTotal) * target));
    const quantity = Math.max(1, Math.round(amountCents / 100 / line.unitPrice));
    return { service: template.service, description: line.description, usage: `${quantity.toLocaleString('en-US')} ${line.unit}`, amount: amountCents / 100 };
  });

  const subtotalCents = lineItems.reduce((sum, item) => sum + toCents(item.amount), 0);
  const taxCents = Math.round(subtotalCents * TAX_RATE);

  const byService = new Map<string, number>();
  for (const item of lineItems) byService.set(item.service, (byService.get(item.service) ?? 0) + toCents(item.amount));
  const spendByService = [...byService.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([service, cents]) => ({ service, amount: cents / 100, sharePercent: Math.round((cents / subtotalCents) * 1000) / 10 }));

  return {
    provider,
    fileName,
    invoiceNumber,
    billingPeriod,
    currency: CURRENCY[provider],
    lineItems: [...lineItems].sort((a, b) => b.amount - a.amount || a.service.localeCompare(b.service)),
    subtotal: subtotalCents / 100,
    taxRate: TAX_RATE,
    tax: taxCents / 100,
    total: (subtotalCents + taxCents) / 100,
    spendByService,
  };
}

export function formatInvoiceMoney(amount: number, currency: ParsedInvoice['currency']): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}
