export const SKILL_OPTIONS = [
  { value: 'TECH', label: 'Technology' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'SALES', label: 'Sales' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'OPERATIONS', label: 'Operations' },
  { value: 'PRODUCT', label: 'Product' },
  { value: 'DESIGN', label: 'Design' },
  { value: 'OTHER', label: 'Other' },
] as const;

export const STAGE_OPTIONS = [
  { value: 'IDEA', label: 'Idea' },
  { value: 'MVP', label: 'MVP' },
  { value: 'EARLY_TRACTION', label: 'Early Traction' },
  { value: 'GROWTH', label: 'Growth' },
] as const;

export const AVAILABILITY_OPTIONS = [
  { value: 'FULL', label: 'Full-time' },
  { value: 'PART', label: 'Part-time' },
  { value: 'WEEKEND', label: 'Weekends only' },
] as const;

export const COMPENSATION_OPTIONS = [
  { value: 'EQUITY', label: 'Equity only' },
  { value: 'SALARY', label: 'Salary' },
  { value: 'REV_SHARE', label: 'Revenue Share' },
] as const;

export const VISIBILITY_OPTIONS = [
  { value: 'PUBLIC', label: 'Public' },
  { value: 'VERIFIED_ONLY', label: 'Verified Members Only' },
] as const;

export const AGE_RANGE_OPTIONS = [
  '18-24',
  '25-34',
  '35-44',
  '45-54',
  '55+',
] as const;

export const VERIFICATION_LABELS = {
  EMAIL_UNVERIFIED: 'Email declared (unverified)',
  EMAIL_DECLARED: 'Email declared (unverified)',
  LINKEDIN_LINKED: 'Linked',
  PHONE_LINKED: 'Phone Linked',
} as const;

export const INDUSTRY_SUGGESTIONS = [
  'SaaS',
  'Fintech',
  'EdTech',
  'HealthTech',
  'E-commerce',
  'AI',
  'Food & Beverage',
  'Other',
] as const;

export const RECOMMENDATION_SCORE_LABEL = 'rec. score' as const;
export const RECOMMENDATION_SCORE_FULL_LABEL = 'recommendation score' as const;
