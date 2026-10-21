/** Uploaded cloud invoices (Cloud Invoices page and the Cost Overview invoices view). */
export type InvoiceProvider = 'azure' | 'aws' | 'btp' | 'gcp';

export interface InvoiceService {
  name: string;
  cost: number;
  /** Azure-only: a real negotiated per-service discount. Every other provider falls back to the flat CSP rate. */
  savings?: number;
}

export interface InvoiceSection {
  name: string;
  total: number;
  tax: number;
}

export interface BtpAccountInfo {
  globalAccountName: string;
  numDirectories: number;
  numSubaccounts: number;
  numRegions: number;
  accountType: string;
  contractStart: string;
  plannedContractEnd: string;
  accountId: string;
}

export interface BtpGlobalAccountCost {
  name: string;
  cost: number;
  planName?: string;
  usage?: string;
}

export interface BtpSubaccountCost {
  name: string;
  directory?: string;
  dataCenter?: string;
  id?: string;
  totalCost: number;
  services: InvoiceService[];
}

export interface BtpUsageRow {
  serviceName: string;
  planName: string;
  metric: string;
  totalUsage: number;
  unit: string;
  subaccountCount: number;
}

export interface InvoiceRawSummary {
  invoiceNumber?: string;
  billingProfile?: string;
  poNumber?: string;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  invoiceDate?: string;
  dueDate?: string;
  charges?: number;
  taxAmount?: number;
  taxRate?: number;
  sections?: InvoiceSection[];
  /** Azure-only overall CSP savings figure, shown as a billing KPI when > 0. */
  totalSavings?: number;
  accountInfo?: BtpAccountInfo;
  globalAccountCosts?: BtpGlobalAccountCost[];
  subaccountCosts?: BtpSubaccountCost[];
  actualUsage?: BtpUsageRow[];
}

export interface Invoice {
  id: string;
  provider: InvoiceProvider;
  month: number;
  year: number;
  total_cost: number;
  currency: string;
  file_name: string;
  services: InvoiceService[];
  raw_summary: InvoiceRawSummary;
}
