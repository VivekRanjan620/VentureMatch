import { z } from 'zod';
import { OnboardingFormState, UpdateProfilePayload, UpdateCommitmentPayload } from './types';

export const step1Schema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  city: z.string().trim().min(1, 'City is required'),
  industry: z.string().trim().min(1, 'Industry is required'),
  experienceYears: z
    .string()
    .trim()
    .min(1, 'Experience years is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 70, {
      message: 'Experience must be a number between 0 and 70 years',
    }),
  bio: z.string().optional(),
  previousStartup: z.boolean().default(false),
  currentWork: z.string().optional(),
  ageRange: z.string().optional(),
});

export const step2Schema = z.object({
  skills: z
    .array(
      z.enum([
        'TECH',
        'MARKETING',
        'SALES',
        'FINANCE',
        'OPERATIONS',
        'PRODUCT',
        'DESIGN',
        'OTHER',
      ])
    )
    .min(1, 'Please select at least one skill'),
});

export const step3Schema = z.object({
  availability: z.enum(['FULL', 'PART', 'WEEKEND'], {
    required_error: 'Please select availability',
  }),
  hoursPerWeek: z
    .string()
    .trim()
    .min(1, 'Hours per week is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 1 && Number(val) <= 80, {
      message: 'Hours per week must be between 1 and 80',
    }),
  minMonths: z
    .string()
    .trim()
    .min(1, 'Minimum months is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 1 && Number(val) <= 60, {
      message: 'Minimum months must be between 1 and 60',
    }),
  compensationPref: z.enum(['EQUITY', 'SALARY', 'REV_SHARE'], {
    required_error: 'Please select compensation preference',
  }),
  equityExpectation: z
    .string()
    .trim()
    .min(1, 'Equity expectation is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100, {
      message: 'Equity expectation must be between 0 and 100%',
    }),
  canInvestAmount: z
    .string()
    .optional()
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), {
      message: 'Investment amount must be a non-negative number',
    }),
  remote: z.boolean().default(true),
});

export const step4Schema = z.object({
  shareablePhone: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\+?[0-9\s\-]{8,20}$/.test(val.trim()),
      { message: 'Invalid phone number format (8-15 digits)' }
    ),
  shareableEmail: z
    .string()
    .optional()
    .refine(
      (val) => !val || z.string().email().safeParse(val.trim()).success,
      { message: 'Invalid shareable email format' }
    ),
});

export function buildProfilePayload(state: OnboardingFormState): UpdateProfilePayload {
  const payload: UpdateProfilePayload = {
    name: state.name.trim(),
    city: state.city.trim(),
    industry: state.industry.trim(),
    skills: state.skills,
    experienceYears: Math.round(Number(state.experienceYears)),
  };

  if (state.bio && state.bio.trim().length > 0) {
    payload.bio = state.bio.trim();
  }
  if (state.ageRange && state.ageRange.trim().length > 0) {
    payload.ageRange = state.ageRange.trim();
  }
  if (typeof state.previousStartup === 'boolean') {
    payload.previousStartup = state.previousStartup;
  }
  if (state.currentWork && state.currentWork.trim().length > 0) {
    payload.currentWork = state.currentWork.trim();
  }
  if (state.shareablePhone && state.shareablePhone.trim().length > 0) {
    payload.shareablePhone = state.shareablePhone.trim();
  }
  if (state.shareableEmail && state.shareableEmail.trim().length > 0) {
    payload.shareableEmail = state.shareableEmail.trim();
  }

  return payload;
}

export function buildCommitmentPayload(state: OnboardingFormState): UpdateCommitmentPayload {
  const payload: UpdateCommitmentPayload = {
    hoursPerWeek: Math.round(Number(state.hoursPerWeek)),
    availability: state.availability,
    minMonths: Math.round(Number(state.minMonths)),
    equityExpectation: Math.round(Number(state.equityExpectation)),
    compensationPref: state.compensationPref,
    remote: state.remote,
  };

  if (state.canInvestAmount && state.canInvestAmount.trim().length > 0) {
    const num = Number(state.canInvestAmount);
    if (!isNaN(num)) {
      payload.canInvestAmount = num;
    }
  }

  return payload;
}
