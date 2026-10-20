import type { CloudProvider } from '../../../shared/types/auth';

export interface ProviderGroup {
  id: CloudProvider;
  label: string;
  dot: string;
}

export const PROVIDER_GROUPS: ProviderGroup[] = [
  { id: 'azure', label: 'Azure', dot: '#0078D4' },
  { id: 'aws', label: 'AWS', dot: '#EC7211' },
  { id: 'btp', label: 'SAP BTP', dot: '#059669' },
  { id: 'gcp', label: 'GCP', dot: '#4285F4' },
];
