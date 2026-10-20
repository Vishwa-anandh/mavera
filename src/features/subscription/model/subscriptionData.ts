import type { CloudProvider } from '../../../shared/types/auth';

export interface PlanDefinition {
  id: 'free' | 'premium' | 'enterprise';
  name: string;
  tagline: string;
  badge?: string;
  features: string[];
}

/**
 * Ported from the reference CCM app's SubscriptionManagementPage.jsx PLANS
 * array. Pricing is intentionally not shown — the reference (and Maitsys'
 * real sales process) routes every upgrade through a "Pricing coming soon" /
 * contact-us CTA rather than self-serve checkout.
 */
export const PLANS: PlanDefinition[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Everything you need to get started',
    features: [
      'Azure & AWS cost monitoring',
      'Budget alerts & threshold rules',
      'Invoice upload & PDF/CSV parsing',
      'Smart anomaly detection alerts',
      'Savings overview & MSP discounts',
      'Up to 5 team members',
      'Community support',
    ],
  },
  {
    id: 'premium',
    name: 'Professional',
    tagline: 'For growing teams with deeper needs',
    badge: 'Most Popular',
    features: [
      'Everything in Free',
      'GCP & SAP BTP cost monitoring',
      'AI Chatbot Assistant (Mavera insights)',
      'Smart alerts with email notifications',
      'Advanced cost analytics & forecasting',
      'Up to 25 team members',
      'Priority email support',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'Unlimited scale, dedicated support',
    badge: 'Full Access',
    features: [
      'Everything in Professional',
      'Unlimited cloud accounts & providers',
      'Unlimited team members & roles',
      'Custom cloud access permissions',
      'Dedicated Account Manager',
      'White-glove onboarding & training',
      'SLA-backed priority support',
    ],
  },
];

export interface CloudProviderInfo {
  id: CloudProvider;
  label: string;
  tagline: string;
}

export const CLOUD_PROVIDER_INFO: CloudProviderInfo[] = [
  { id: 'azure', label: 'Microsoft Azure', tagline: 'VMs · App Services · Storage · AKS' },
  { id: 'aws', label: 'Amazon Web Services', tagline: 'EC2 · S3 · RDS · Lambda · Cost Explorer' },
  { id: 'btp', label: 'SAP BTP', tagline: 'Subaccounts · Services · Usage · Costs' },
  { id: 'gcp', label: 'Google Cloud Platform', tagline: 'Compute · BigQuery · Cloud Storage · Billing' },
];

/** Matches the flat MSP_RATES constant in recommendationsDerivations.ts —
 * kept as fixed display copy here (not computed) to avoid floating-point
 * artifacts like 0.07 * 100 === 7.000000000000001. */
export const MSP_BADGE: Record<CloudProvider, string> = {
  azure: '7% MSP discount',
  aws: '3.5% MSP discount',
  btp: '2% MSP discount',
  gcp: '2% MSP discount',
};

export function isCurrentPlan(planType: string, planId: PlanDefinition['id']): boolean {
  return planType === planId || (planType === 'basic' && planId === 'free');
}

/** Display name of the organisation's plan; the API's "basic" is the Free plan. */
export function planNameOf(planType: string): string {
  const plan = PLANS.find((p) => isCurrentPlan(planType, p.id));
  if (plan) return plan.name;
  return planType ? planType.charAt(0).toUpperCase() + planType.slice(1) : 'Free';
}
