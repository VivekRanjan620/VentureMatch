import { UserRole } from '../../api/types';

export type SkillType =
  | 'TECH'
  | 'MARKETING'
  | 'SALES'
  | 'FINANCE'
  | 'OPERATIONS'
  | 'PRODUCT'
  | 'DESIGN'
  | 'OTHER';

export type AvailabilityType = 'FULL' | 'PART' | 'WEEKEND';

export type CompensationType = 'EQUITY' | 'SALARY' | 'REV_SHARE';

export interface OnboardingFormState {
  // Step 1: About You
  name: string;
  city: string;
  industry: string;
  bio: string;
  experienceYears: string; // Form input string, converted to number
  previousStartup: boolean;
  currentWork: string;
  ageRange: string;

  // Step 2: Skills
  skills: SkillType[];

  // Step 3: Commitment Profile
  availability: AvailabilityType;
  hoursPerWeek: string; // Form input string, converted to number
  minMonths: string; // Form input string, converted to number
  compensationPref: CompensationType;
  equityExpectation: string; // Form input string, converted to number
  canInvestAmount: string; // Form input string, converted to number
  remote: boolean;

  // Step 4: Contact (Private)
  shareablePhone: string;
  shareableEmail: string;
}

export interface UpdateProfilePayload {
  name: string;
  city: string;
  industry: string;
  skills: SkillType[];
  experienceYears: number;
  bio?: string;
  ageRange?: string;
  previousStartup?: boolean;
  currentWork?: string;
  shareablePhone?: string;
  shareableEmail?: string;
}

export interface UpdateCommitmentPayload {
  hoursPerWeek: number;
  availability: AvailabilityType;
  minMonths: number;
  equityExpectation: number;
  compensationPref: CompensationType;
  canInvestAmount?: number;
  contributes?: SkillType[];
  remote?: boolean;
}
