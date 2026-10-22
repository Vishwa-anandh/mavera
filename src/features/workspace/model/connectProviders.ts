import type { SapDestination, SapDestinationInput } from '../../../data-access';
import { CONNECTION_STRATEGIES, TIMEZONES, parseSystems, validateDestination, type DestinationDraft } from '../../sapDestinations';

/** What the shared connect dialog can connect: the four cloud providers and an SAP system. */
export type ConnectProvider = 'azure' | 'aws' | 'gcp' | 'btp' | 'sap';
export type CloudConnectProvider = Exclude<ConnectProvider, 'sap'>;

/** The values a connect form holds, keyed by field name. */
export type ConnectValues = Record<string, string>;
export type ConnectErrors = Record<string, string>;

export interface ConnectField {
  name: string;
  /** The label the provider's own connect form has always used. */
  label: string;
  kind?: 'text' | 'password' | 'textarea' | 'url';
  placeholder?: string;
  help?: string;
  /** Spans both columns of the two-column grid. */
  wide?: boolean;
  /** Part of the optional CIS_Central block (SAP BTP), shown only once the block is opened. */
  group?: 'cis';
}

export interface ConnectProviderDefinition {
  id: ConnectProvider;
  /** The provider's name in running text: "Connect Azure". */
  label: string;
  /** The dialog title. */
  title: string;
  kind: 'cloud' | 'sap';
  /** The subscribed module that offers this connection. */
  module: 'cloudCost' | 'sapMonitoring';
  /** One line on what the picker option connects. */
  blurb: string;
  /** Where the credentials come from, shown above the fields. */
  hint: string;
  fields: ConnectField[];
}

const BTP_CIS_FIELDS: ConnectField[] = [
  { name: 'cisClientId', label: 'CIS Client ID', group: 'cis' },
  { name: 'cisClientSecret', label: 'CIS Client Secret', kind: 'password', group: 'cis' },
  { name: 'cisTokenUrl', label: 'CIS Token URL', kind: 'url', group: 'cis' },
  { name: 'cisAccountsUrl', label: 'Accounts Service URL', kind: 'url', group: 'cis' },
];

export const CONNECT_PROVIDERS: Record<ConnectProvider, ConnectProviderDefinition> = {
  azure: {
    id: 'azure', label: 'Azure', title: 'Connect Azure account', kind: 'cloud', module: 'cloudCost',
    blurb: 'Subscriptions: spend, resource groups and services',
    hint: 'Use the app registration (service principal) that has the Cost Management Reader role on the subscription.',
    fields: [
      { name: 'name', label: 'Account name', placeholder: 'e.g. Production subscription' },
      { name: 'subscriptionId', label: 'Subscription ID', placeholder: '00000000-0000-0000-0000-000000000000' },
      { name: 'tenantId', label: 'Tenant ID', placeholder: '00000000-0000-0000-0000-000000000000' },
      { name: 'clientId', label: 'Client ID', placeholder: '00000000-0000-0000-0000-000000000000' },
      { name: 'clientSecret', label: 'Client secret', kind: 'password' },
    ],
  },
  aws: {
    id: 'aws', label: 'AWS', title: 'Connect AWS account', kind: 'cloud', module: 'cloudCost',
    blurb: 'Accounts: spend, services and regions',
    hint: 'Use the access key of an IAM user that can read Cost Explorer.',
    fields: [
      { name: 'name', label: 'Account name', placeholder: 'e.g. Production account' },
      { name: 'accessKeyId', label: 'Access key ID', placeholder: 'AKIA…' },
      { name: 'secretAccessKey', label: 'Secret access key', kind: 'password' },
    ],
  },
  gcp: {
    id: 'gcp', label: 'Google Cloud', title: 'Connect Google Cloud project', kind: 'cloud', module: 'cloudCost',
    blurb: 'Projects: spend and services from billing export',
    hint: 'In the Google Cloud console, create a service account with the Billing Account Viewer role and paste its JSON key.',
    fields: [
      { name: 'name', label: 'Display Name', placeholder: 'My GCP Project' },
      { name: 'projectId', label: 'Project ID', placeholder: 'my-project-123456', help: 'The GCP project ID (not the project number).' },
      { name: 'serviceAccountJson', label: 'Service Account JSON Key', kind: 'textarea', wide: true, placeholder: '{\n  "type": "service_account",\n  "client_email": "...",\n  "private_key": "..."\n}', help: 'Paste the full downloaded JSON key file content.' },
    ],
  },
  btp: {
    id: 'btp', label: 'SAP BTP', title: 'Connect SAP BTP account', kind: 'cloud', module: 'cloudCost',
    blurb: 'Global accounts: consumption, services and subaccounts',
    hint: 'Use the COST_API service key (Usage Data Management Service, plan reporting-ga-admin) from the BTP cockpit.',
    fields: [
      { name: 'name', label: 'Account Name', placeholder: 'Mavera SAP Landscape' },
      { name: 'clientId', label: 'Client ID' },
      { name: 'clientSecret', label: 'Client Secret', kind: 'password' },
      { name: 'tokenUrl', label: 'Token URL', kind: 'url', placeholder: 'https://…authentication.eu10.hana.ondemand.com' },
      { name: 'targetUrl', label: 'Reporting API Base URL', kind: 'url', wide: true, placeholder: 'https://reporting.cf.eu10.hana.ondemand.com' },
      ...BTP_CIS_FIELDS,
    ],
  },
  sap: {
    id: 'sap', label: 'SAP system', title: 'Connect SAP system', kind: 'sap', module: 'sapMonitoring',
    blurb: 'Systems: health, jobs, alerts and transports',
    hint: 'Use a service account or technical user. This sample does not keep the password.',
    fields: [
      { name: 'name', label: 'Environment Name', placeholder: 'e.g. Production S/4HANA' },
      { name: 'systems', label: 'SID', placeholder: 'e.g. PRD, QAS', help: 'One or more system IDs, separated by commas.' },
      { name: 'url', label: 'Gateway URL', kind: 'url', wide: true, placeholder: 'https://your-sap-host.com/sap/opu/odata/sap/...' },
      { name: 'client', label: 'Client', placeholder: 'e.g. 100' },
      { name: 'language', label: 'Language', placeholder: 'e.g. EN' },
      { name: 'username', label: 'Username', placeholder: 'Your SAP user ID' },
      { name: 'password', label: 'Password', kind: 'password', placeholder: 'Enter your password' },
    ],
  },
};

/** The order the picker lists the providers in. */
export const CONNECT_PROVIDER_ORDER: ConnectProvider[] = ['azure', 'aws', 'gcp', 'btp', 'sap'];

export const isConnectProvider = (value: unknown): value is ConnectProvider => typeof value === 'string' && value in CONNECT_PROVIDERS;

/** The empty form of a provider: every field blank, and (SAP) the default connection strategy. */
export function blankValues(provider: ConnectProvider): ConnectValues {
  const values: ConnectValues = Object.fromEntries(CONNECT_PROVIDERS[provider].fields.map((field) => [field.name, '']));
  if (provider === 'sap') values.connectionType = CONNECTION_STRATEGIES[0].key;
  return values;
}

// ---- Validation -------------------------------------------------------------------------------

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const AWS_ACCESS_KEY_RE = /^(AKIA|ASIA)[A-Z0-9]{16}$/;

const AZURE_FORMAT: Array<[string, string]> = [
  ['tenantId', 'Invalid Tenant ID format. Must be a valid UUID.'],
  ['clientId', 'Invalid Client ID format. Must be a valid UUID.'],
  ['subscriptionId', 'Invalid Subscription ID format. Must be a valid UUID.'],
];

/** The format errors of an Azure or AWS credential set, per field, in the order they were always reported. */
function cloudFormatErrors(provider: 'azure' | 'aws', values: Partial<ConnectValues>): ConnectErrors {
  const errors: ConnectErrors = {};
  if (provider === 'azure') {
    for (const [field, message] of AZURE_FORMAT) if (!UUID_RE.test(values[field] ?? '')) errors[field] = message;
    return errors;
  }
  if (!AWS_ACCESS_KEY_RE.test(values.accessKeyId ?? '')) errors.accessKeyId = 'Invalid Access Key ID. Should start with AKIA or ASIA and be 20 chars.';
  if ((values.secretAccessKey ?? '').length < 40) errors.secretAccessKey = 'Invalid Secret Access Key. Should be at least 40 characters.';
  return errors;
}

/** The format check the Azure and AWS connect forms have always made: the first problem, or null when the credentials look valid. */
export function validateCredentials(provider: 'azure' | 'aws', values: Partial<ConnectValues>): string | null {
  return Object.values(cloudFormatErrors(provider, values))[0] ?? null;
}

export function subdomainOf(url: string): string | null {
  try {
    return new URL(url).hostname.split('.')[0] || null;
  } catch {
    return null;
  }
}

/** Appends the OAuth path a token URL needs, as the BTP form always did when the field is left. */
export function appendOAuthPath(url: string): string {
  return url && !url.endsWith('/oauth/token') ? `${url.replace(/\/$/, '')}/oauth/token` : url;
}

function validateGcp(values: ConnectValues): ConnectErrors {
  const errors: ConnectErrors = {};
  if (!values.name.trim()) errors.name = 'Account name is required';
  if (!values.projectId.trim()) errors.projectId = 'Project ID is required';
  if (!values.serviceAccountJson.trim()) {
    errors.serviceAccountJson = 'Service Account JSON is required';
  } else {
    try {
      const parsed = JSON.parse(values.serviceAccountJson) as { client_email?: string; private_key?: string };
      if (!parsed.client_email || !parsed.private_key) errors.serviceAccountJson = 'JSON must contain client_email and private_key';
    } catch {
      errors.serviceAccountJson = 'Must be valid JSON';
    }
  }
  return errors;
}

function validateBtp(values: ConnectValues): ConnectErrors {
  const errors: ConnectErrors = {};
  if (!values.name.trim()) errors.name = 'Account name is required.';
  if (!values.clientId.trim()) errors.clientId = 'Client ID and Client Secret are required.';
  if (!values.clientSecret.trim()) errors.clientSecret = 'Client ID and Client Secret are required.';
  if (!values.tokenUrl.trim().startsWith('https://')) errors.tokenUrl = 'Token URL must start with https://.';
  if (!values.targetUrl.trim().startsWith('https://')) errors.targetUrl = 'Reporting API Base URL must start with https://.';
  const cisAny = values.cisClientId || values.cisClientSecret || values.cisTokenUrl || values.cisAccountsUrl;
  if (cisAny) {
    if (!values.cisClientId.trim()) errors.cisClientId = 'CIS Client ID and Client Secret are required if configuring CIS_Central.';
    if (!values.cisClientSecret.trim()) errors.cisClientSecret = 'CIS Client ID and Client Secret are required if configuring CIS_Central.';
    if (!values.cisTokenUrl.trim().startsWith('https://')) errors.cisTokenUrl = 'CIS Token URL must start with https://.';
    if (!values.cisAccountsUrl.trim().startsWith('https://')) errors.cisAccountsUrl = 'Accounts Service URL must start with https://.';
    const costSub = subdomainOf(values.tokenUrl);
    const cisSub = subdomainOf(values.cisTokenUrl);
    if (!errors.cisTokenUrl && costSub && cisSub && costSub.toLowerCase() !== cisSub.toLowerCase()) {
      errors.cisTokenUrl = `Subdomain mismatch — COST_API uses "${costSub}" but CIS uses "${cisSub}". Both must share the same authentication tenant.`;
    }
  }
  return errors;
}

/** The SAP form's text fields as the destination draft the System Configuration form validates. */
export function sapDraftOf(values: ConnectValues): DestinationDraft {
  return {
    name: values.name, systems: values.systems, timezone: TIMEZONES[0],
    connectionType: (CONNECTION_STRATEGIES.find((s) => s.key === values.connectionType)?.key ?? CONNECTION_STRATEGIES[0].key),
    url: values.url, client: values.client, language: values.language, username: values.username,
  };
}

/** Field errors for a connect form; an empty object means it can be connected. `existingSap` lets SAP reject a duplicate environment name. */
export function validateConnection(provider: ConnectProvider, values: ConnectValues, existingSap: SapDestination[] = []): ConnectErrors {
  if (provider === 'azure' || provider === 'aws') {
    const errors: ConnectErrors = {};
    const trimmed = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()]));
    for (const field of CONNECT_PROVIDERS[provider].fields) {
      if (!trimmed[field.name]) errors[field.name] = `${field.label} is required.`;
    }
    // Format problems only matter on fields that were filled in: "required" already speaks for the empty ones.
    const format = cloudFormatErrors(provider, trimmed);
    for (const [name, message] of Object.entries(format)) if (!errors[name]) errors[name] = message;
    return errors;
  }
  if (provider === 'gcp') return validateGcp(values);
  if (provider === 'btp') return validateBtp(values);
  return { ...validateDestination(sapDraftOf(values), existingSap) };
}

/** The input the SAP destination store takes, from the connect form. */
export function sapInputOf(values: ConnectValues): SapDestinationInput {
  const draft = sapDraftOf(values);
  return { ...draft, systems: parseSystems(draft.systems), name: draft.name.trim(), url: draft.url.trim() };
}

// ---- Sample credentials -------------------------------------------------------------------------

const SAMPLE_NAMES: Record<ConnectProvider, string[]> = {
  azure: ['Northwind Production', 'Northwind Development', 'Northwind Analytics', 'Northwind Sandbox'],
  aws: ['Northwind Production', 'Northwind Staging', 'Northwind Data Lake', 'Northwind Sandbox'],
  gcp: ['Northwind Analytics', 'Northwind Data Platform', 'Northwind Machine Learning', 'Northwind Sandbox'],
  btp: ['Northwind SAP Landscape', 'Northwind Extensions', 'Northwind Integration', 'Northwind Sandbox'],
  sap: ['Northwind S/4HANA Production', 'Northwind S/4HANA Quality', 'Northwind BW/4HANA', 'Northwind Sandbox'],
};

/** The first sample name that is not already taken; once they run out, the first one with a number. */
function freshName(provider: ConnectProvider, taken: string[]): string {
  const used = new Set(taken.map((name) => name.trim().toLowerCase()));
  const names = SAMPLE_NAMES[provider];
  const free = names.find((name) => !used.has(name.toLowerCase()));
  if (free) return free;
  let n = 2;
  while (used.has(`${names[0]} ${n}`.toLowerCase())) n += 1;
  return `${names[0]} ${n}`;
}

const SAMPLE_SERVICE_ACCOUNT = JSON.stringify({
  type: 'service_account',
  project_id: 'northwind-analytics-418207',
  client_email: 'mavera-billing@northwind-analytics-418207.iam.gserviceaccount.com',
  private_key: '-----BEGIN PRIVATE KEY-----\nSAMPLE-KEY-NOT-A-REAL-CREDENTIAL\n-----END PRIVATE KEY-----\n',
}, null, 2);

/**
 * A format-valid sample credential set for a provider: every field filled so Connect works in one click. These
 * are not real credentials (the prototype has no live feed); `takenNames` keeps repeated samples from sharing a name.
 */
export function sampleCredentials(provider: ConnectProvider, takenNames: string[] = []): ConnectValues {
  const name = freshName(provider, takenNames);
  switch (provider) {
    case 'azure':
      return { name, subscriptionId: '3f1c9a52-7d4e-4b86-a2c1-9e5d0b7c4a18', tenantId: '8a6d2f14-5c3b-4e97-b1a0-2d7f6c9e3b45', clientId: 'c4e7b2a9-1f68-4d35-8b0e-6a9d3c5f7e12', clientSecret: 'Sample~secret~7Qx2Lm9Vb4Nc1Zk8' };
    case 'aws':
      return { name, accessKeyId: 'AKIAIOSFODNN7EXAMPLE', secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' };
    case 'gcp':
      return { name, projectId: 'northwind-analytics-418207', serviceAccountJson: SAMPLE_SERVICE_ACCOUNT };
    case 'btp':
      return {
        name, clientId: 'sb-cost-api!b12345|cost-api!b54321', clientSecret: 'Sample$secret$Zk8Nc1Vb4Lm9Qx2',
        tokenUrl: 'https://northwind.authentication.eu10.hana.ondemand.com/oauth/token', targetUrl: 'https://reporting.cf.eu10.hana.ondemand.com',
        cisClientId: 'sb-cis-central!b12345|cis-central!b54321', cisClientSecret: 'Sample$cis$Qx2Lm9Vb4Nc1Zk8',
        cisTokenUrl: 'https://northwind.authentication.eu10.hana.ondemand.com/oauth/token', cisAccountsUrl: 'https://accounts-service.cfapps.eu10.hana.ondemand.com',
      };
    case 'sap':
      return { name, systems: 'PRD', connectionType: 'ODATA', url: 'https://s4.northwind.example/sap/opu/odata/sap/API_BUSINESS_PARTNER', client: '100', language: 'EN', username: 'MAVERA_MON', password: 'sample-password' };
  }
}
