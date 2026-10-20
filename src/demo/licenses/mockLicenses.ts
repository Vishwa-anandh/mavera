import type { LicenseRecord } from '../../data-access';

/**
 * PROTOTYPE SAMPLE DATA: license tokens a Maitsys super admin would have issued. A token is 64 hex
 * characters. Dates for the two usable licenses are relative to the day the app loads so the
 * "expires in 12 months" sample never goes stale.
 */
const isoDay = (date: Date) => date.toISOString().slice(0, 10);
const monthsFromNow = (months: number) => {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return isoDay(date);
};

export const SAMPLE_LICENSE_TOKENS: Record<'premium' | 'basic' | 'used' | 'expired', string> = {
  premium: '4aed1f37fc3f4ec345007d83e6f729464227c7741987e08360577f9f132472ee',
  basic: 'b706dea19914af66e174898cbe37401942539ebf9a9e2ca8f4f2ba9a889348dc',
  used: 'da34436b91af0acbcc3da9a490fcb2f82c81af5c65649f226e9a69f25218e168',
  expired: '1900313ab5f5ac9e0b06a8e5a9c650958c9f67e176d5dca70c154d2dd67329d0',
};

/** The tokens behind the seeded organizations (one license each, already in use). */
export const ORGANIZATION_LICENSE_TOKENS: Record<string, string> = {
  'org-acme': '28eae647ecc8c8bd165c0a2fe61723e120b01e6233533d2c2b65c19249be5e81',
  'org-northwind': '34983741260b01a10972315e9c107c3eb2e18131fc5618620093a52516b64994',
  'org-globex': '4674a51a9d9fb5635791a6fa9313e9852e65156ad8fd7d39066874d51396ada9',
  'org-initech': '663931e09a7d3adae64fa49dc4eb7eceef41b54ba8fde0990fd851cbb3326f2d',
  'org-umbrella': '0d31046a89c023d72ffbe9cf9ddd7e98b1295d7190b39a154b3bb01fc36252bb',
  'org-hooli': '44d4c1d7c6c1b21fae2860fc5792110ae42b716425f821c573a2356d88028a22',
};

export function buildSampleLicenses(): LicenseRecord[] {
  const today = isoDay(new Date());
  return [
    {
      token: SAMPLE_LICENSE_TOKENS.premium,
      organizationName: 'Contoso Industries',
      plan: 'premium',
      seats: 25,
      modules: { cloudCost: true, sapMonitoring: true },
      cloudAccess: ['azure', 'aws', 'btp', 'gcp'],
      aiEnabled: true,
      startsAt: today,
      expiresAt: monthsFromNow(12),
      status: 'unused',
    },
    {
      token: SAMPLE_LICENSE_TOKENS.basic,
      organizationName: 'Fabrikam Retail',
      plan: 'basic',
      seats: 5,
      modules: { cloudCost: true, sapMonitoring: false },
      cloudAccess: ['azure', 'aws'],
      aiEnabled: false,
      startsAt: today,
      expiresAt: monthsFromNow(12),
      status: 'unused',
    },
    {
      token: SAMPLE_LICENSE_TOKENS.used,
      organizationName: 'Tailspin Toys',
      plan: 'premium',
      seats: 10,
      modules: { cloudCost: true, sapMonitoring: true },
      cloudAccess: ['azure'],
      aiEnabled: true,
      startsAt: '2026-03-01',
      expiresAt: '2027-03-01',
      status: 'used',
      usedAt: '2026-03-04',
    },
    {
      token: SAMPLE_LICENSE_TOKENS.expired,
      organizationName: 'Wingtip Logistics',
      plan: 'basic',
      seats: 5,
      modules: { cloudCost: true, sapMonitoring: false },
      cloudAccess: ['aws'],
      aiEnabled: false,
      startsAt: '2024-01-15',
      expiresAt: '2025-01-15',
      status: 'unused',
    },
  ];
}
