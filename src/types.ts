export enum EvaluationStep {
  OWNER = 'OWNER',
  OVERVIEW = 'OVERVIEW',
  STRATEGIC_FIT = 'STRATEGIC_FIT',
  SCALABILITY = 'SCALABILITY',
  EFFICIENCY = 'EFFICIENCY',
  REVENUE = 'REVENUE',
  EXPERIENCE = 'EXPERIENCE',
  WORKFLOW = 'WORKFLOW',
  DATA_READINESS = 'DATA_READINESS',
  COMPLETED = 'COMPLETED'
}

export interface UseCaseData {
  name: string;
  owner: string;
  overview: string;
  strategicFit: {
    determination: 'Aligned' | 'Somewhat Aligned' | 'Not Aligned' | null;
    explanation: string;
  };
  scalability: string;
  efficiency: {
    impact: string;
    estimate: string;
  };
  revenue: {
    hasImpact: boolean;
    forecast: string;
  };
  experience: string;
  workflow: string;
  dataReadiness: string;
  scores: {
    businessCriticality: number;
    implementationComplexity: number;
  };
  recommendation: string | null;
  summary: string;
}

export const INITIAL_DATA: UseCaseData = {
  name: '',
  owner: '',
  overview: '',
  strategicFit: {
    determination: null,
    explanation: '',
  },
  scalability: '',
  efficiency: {
    impact: '',
    estimate: '',
  },
  revenue: {
    hasImpact: false,
    forecast: '',
  },
  experience: '',
  workflow: '',
  dataReadiness: '',
  scores: {
    businessCriticality: 0,
    implementationComplexity: 0,
  },
  recommendation: null,
  summary: '',
};
