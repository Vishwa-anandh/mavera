import type { CloudProvider } from '../../../shared/types/auth';

export interface CombinedRecommendation {
  id: string;
  provider: CloudProvider;
  action: string;
  description: string;
  estimated_savings: number;
}

export interface SavingsCategory {
  key: string;
  label: string;
  description: string;
  hint: string;
  amount: number;
  percentageOfAnnual: number;
  recommendations: CombinedRecommendation[];
}

export interface TopRecommendation {
  title: string;
  savings: number;
  impact: 'High' | 'Medium' | 'Low';
}

export interface DonutSlice {
  name: string;
  value: number;
}
