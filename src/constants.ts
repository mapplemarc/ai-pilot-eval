export const RSM_AI_STRATEGY = `
RSN Marketing AI Strategy (The Why of AI):
- Purpose: Help companies reinvent their business to drive growth.
- Strategy: Help C-suites not just think about the future of their company but help make it happen.
- Key Value Drivers: 
    1. Thought leadership differentiation.
    2. Unique Industry-specific solutions.
- Top Marketing Function Barriers/Risks:
    1. Speed/Velocity: Ideas take too long to get into market.
    2. Credibility: We don't have client stories of success to share.
- Top 3 Goals:
    1. Drive leader perspective in market faster.
    2. Increase client story volume to drive credibility.
- How we will use AI:
    1. Reinvent workflows for content & campaigns.
    2. Create a content engine for client stories.
- Desired Impact:
    1. Reduce time to market by 75%.
    2. Create a bank of 30 stories by EOY.
`;

export const STEPS_CONFIG = [
  {
    id: 'OWNER',
    title: 'Use Case Owner',
    question: 'To get started, could you please provide your name? (Use Case Owner)',
  },
  {
    id: 'OVERVIEW',
    title: 'Use Case Overview',
    question: 'Thank you. Now, could you please define your AI use case at a high level? What is the core problem we are solving?',
  },
  {
    id: 'STRATEGIC_FIT',
    title: 'Strategic Fit',
    question: 'Based on your overview, I will evaluate how this aligns with the RSM AI Strategy. (Evaluating...)',
  },
  {
    id: 'SCALABILITY',
    title: 'Scalability',
    question: 'How many times would this use case be executed monthly across the marketing function if it were fully scaled? (e.g., 5 times, 50 times, 500 times). We are looking for high-volume, high-repeatability cases.',
  },
  {
    id: 'EFFICIENCY',
    title: 'Efficiency Impact',
    question: 'Does this use case have a direct impact on time or cost savings? For example, could it help insource work from agencies or remove costs like stock imagery? (Please avoid headcount reduction examples).',
  },
  {
    id: 'REVENUE',
    title: 'Revenue Impact',
    question: 'Will this use case have a short-term impact on revenue? If so, could you walk me through how we might reach a forecasted number?',
  },
  {
    id: 'EXPERIENCE',
    title: 'Experience',
    question: 'Will this meaningfully improve a scaled audience\'s experience? For instance, through increased relevance via personalization or easier narrative construction.',
  },
  {
    id: 'WORKFLOW',
    title: 'Process & Workflow',
    question: 'Could you describe the steps of the new AI-augmented workflow? How many human steps are we saving compared to the current process?',
  },
  {
    id: 'DATA_READINESS',
    title: 'Data Readiness',
    question: 'Are the required data sources cleaned, governed, and accessible? Are there any potential legal, compliance, InfoSec, or regulatory hurdles we should be aware of?',
  },
];
