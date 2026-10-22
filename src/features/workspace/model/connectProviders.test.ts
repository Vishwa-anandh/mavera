import { describe, expect, it } from 'vitest';
import {
  CONNECT_PROVIDERS, CONNECT_PROVIDER_ORDER, appendOAuthPath, blankValues, sampleCredentials, validateConnection, validateCredentials,
} from './connectProviders';

const SUB_ID = '11111111-2222-3333-4444-555555555555';
const TENANT_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const CLIENT_ID = '99999999-8888-7777-6666-555555555555';
const AWS_KEY = 'AKIAIOSFODNN7EXAMPLE';
const AWS_SECRET = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';

// The format checks of the Azure and AWS connect forms, unchanged by the move into the shared dialog.
describe('validateCredentials', () => {
  it('requires UUIDs for the Azure tenant, client and subscription IDs', () => {
    const valid = { name: 'x', tenantId: TENANT_ID, clientId: CLIENT_ID, subscriptionId: SUB_ID };
    expect(validateCredentials('azure', valid)).toBeNull();
    expect(validateCredentials('azure', { ...valid, tenantId: 'tenant-1' })).toBe('Invalid Tenant ID format. Must be a valid UUID.');
    expect(validateCredentials('azure', { ...valid, clientId: 'nope' })).toBe('Invalid Client ID format. Must be a valid UUID.');
    expect(validateCredentials('azure', { ...valid, subscriptionId: 'sub-1' })).toBe('Invalid Subscription ID format. Must be a valid UUID.');
  });

  it('requires an AKIA/ASIA 20-char access key and a 40+ char secret for AWS', () => {
    expect(validateCredentials('aws', { name: 'x', accessKeyId: AWS_KEY, secretAccessKey: AWS_SECRET })).toBeNull();
    expect(validateCredentials('aws', { name: 'x', accessKeyId: 'ASIAIOSFODNN7EXAMPLE', secretAccessKey: AWS_SECRET })).toBeNull();
    expect(validateCredentials('aws', { name: 'x', accessKeyId: 'AKIAEXAMPLE', secretAccessKey: AWS_SECRET })).toBe('Invalid Access Key ID. Should start with AKIA or ASIA and be 20 chars.');
    expect(validateCredentials('aws', { name: 'x', accessKeyId: AWS_KEY, secretAccessKey: 'short' })).toBe('Invalid Secret Access Key. Should be at least 40 characters.');
  });
});

describe('validateConnection', () => {
  it('names every empty required field, using the field labels the forms have always had', () => {
    expect(validateConnection('azure', blankValues('azure'))).toEqual({
      name: 'Account name is required.', subscriptionId: 'Subscription ID is required.', tenantId: 'Tenant ID is required.', clientId: 'Client ID is required.', clientSecret: 'Client secret is required.',
    });
    expect(validateConnection('aws', blankValues('aws'))).toEqual({
      name: 'Account name is required.', accessKeyId: 'Access key ID is required.', secretAccessKey: 'Secret access key is required.',
    });
  });

  it('puts a format problem on the field that has it, and only there', () => {
    const values = { ...sampleCredentials('azure'), tenantId: 'tenant-1' };
    expect(validateConnection('azure', values)).toEqual({ tenantId: 'Invalid Tenant ID format. Must be a valid UUID.' });
    const aws = { ...sampleCredentials('aws'), accessKeyId: 'AKIAEXAMPLE' };
    expect(validateConnection('aws', aws)).toEqual({ accessKeyId: 'Invalid Access Key ID. Should start with AKIA or ASIA and be 20 chars.' });
  });

  it('checks the Google Cloud service-account JSON', () => {
    const values = sampleCredentials('gcp');
    expect(validateConnection('gcp', { ...values, serviceAccountJson: 'not json' })).toEqual({ serviceAccountJson: 'Must be valid JSON' });
    expect(validateConnection('gcp', { ...values, serviceAccountJson: '{"client_email":"a@b.c"}' })).toEqual({ serviceAccountJson: 'JSON must contain client_email and private_key' });
    expect(validateConnection('gcp', blankValues('gcp'))).toEqual({ name: 'Account name is required', projectId: 'Project ID is required', serviceAccountJson: 'Service Account JSON is required' });
  });

  it('checks the SAP BTP URLs, the optional CIS block and the shared authentication subdomain', () => {
    const values = sampleCredentials('btp');
    const noCis = { cisClientId: '', cisClientSecret: '', cisTokenUrl: '', cisAccountsUrl: '' };
    expect(validateConnection('btp', { ...values, ...noCis, tokenUrl: 'http://x', targetUrl: 'ftp://y' })).toEqual({
      tokenUrl: 'Token URL must start with https://.', targetUrl: 'Reporting API Base URL must start with https://.',
    });
    expect(validateConnection('btp', { ...values, cisTokenUrl: 'https://other.authentication.eu10.hana.ondemand.com/oauth/token' }).cisTokenUrl).toMatch(/Subdomain mismatch/);
    // CIS is optional: all four fields blank is fine.
    expect(validateConnection('btp', { ...values, cisClientId: '', cisClientSecret: '', cisTokenUrl: '', cisAccountsUrl: '' })).toEqual({});
    expect(validateConnection('btp', { ...values, cisClientSecret: '' })).toEqual({ cisClientSecret: 'CIS Client ID and Client Secret are required if configuring CIS_Central.' });
  });

  it('checks the SAP destination: name, SID, gateway URL', () => {
    expect(validateConnection('sap', blankValues('sap'))).toEqual({ name: 'Enter an environment name.', systems: 'Enter at least one SID.', url: 'Enter the gateway URL.' });
    const values = sampleCredentials('sap');
    expect(validateConnection('sap', values)).toEqual({});
    expect(validateConnection('sap', { ...values, url: 'sap-host' }).url).toMatch(/https:\/\/ or http:\/\//);
  });

  it('appends the OAuth path to a token URL the way the BTP form always did', () => {
    expect(appendOAuthPath('https://x.authentication.eu10.hana.ondemand.com')).toBe('https://x.authentication.eu10.hana.ondemand.com/oauth/token');
    expect(appendOAuthPath('https://x.authentication.eu10.hana.ondemand.com/oauth/token')).toBe('https://x.authentication.eu10.hana.ondemand.com/oauth/token');
    expect(appendOAuthPath('')).toBe('');
  });
});

describe('sampleCredentials', () => {
  it.each(CONNECT_PROVIDER_ORDER)('%s: a complete set that passes validation as it stands', (provider) => {
    const values = sampleCredentials(provider);
    expect(validateConnection(provider, values)).toEqual({});
    for (const field of CONNECT_PROVIDERS[provider].fields) expect(values[field.name], field.name).toBeTruthy();
  });

  it('picks a name that is not taken, then numbers the first one', () => {
    const first = sampleCredentials('azure').name;
    const second = sampleCredentials('azure', [first]).name;
    expect(second).not.toBe(first);
    const exhausted = sampleCredentials('azure', ['Northwind Production', 'Northwind Development', 'Northwind Analytics', 'Northwind Sandbox']).name;
    expect(exhausted).toBe('Northwind Production 2');
    expect(sampleCredentials('azure', ['northwind production']).name).toBe('Northwind Development');
  });

  it('SAP samples are not a name the destinations already use', () => {
    const taken = sampleCredentials('sap').name;
    expect(sampleCredentials('sap', [taken]).name).not.toBe(taken);
  });
});

describe('blankValues', () => {
  it('has a blank entry per field, and the default connection strategy for SAP', () => {
    expect(Object.keys(blankValues('azure'))).toEqual(['name', 'subscriptionId', 'tenantId', 'clientId', 'clientSecret']);
    expect(blankValues('sap').connectionType).toBe('ODATA');
    expect(blankValues('btp').cisClientId).toBe('');
  });
});
