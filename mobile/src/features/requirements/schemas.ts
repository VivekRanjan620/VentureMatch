import { z } from 'zod';
import { CreateRequirementPayload } from './types';
import { SkillType, AvailabilityType } from '../profile/types';
import { StageType, VisibilityType } from './types';

export const createRequirementSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  needSkill: z.enum(
    ['TECH', 'MARKETING', 'SALES', 'FINANCE', 'OPERATIONS', 'PRODUCT', 'DESIGN', 'OTHER'],
    { required_error: 'Please select a needed skill' }
  ),
  startupName: z.string().optional(),
  startupNamePublic: z.boolean().default(false),
  industry: z.string().trim().min(1, 'Industry is required'),
  stage: z.enum(['IDEA', 'MVP', 'EARLY_TRACTION', 'GROWTH'], {
    required_error: 'Please select a startup stage',
  }),
  currentUsers: z
    .string()
    .optional()
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), {
      message: 'Current users must be a non-negative number',
    }),
  ownerContributes: z.string().optional(),
  offer: z.string().optional(),
  equityOfferMax: z
    .string()
    .optional()
    .refine(
      (val) => !val || (!isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100),
      { message: 'Maximum equity offer must be between 0 and 100%' }
    ),
  commitment: z.enum(['FULL', 'PART', 'WEEKEND'], {
    required_error: 'Please select a commitment level',
  }),
  location: z.string().optional(),
  remote: z.boolean().default(true),
  visibility: z.enum(['PUBLIC', 'VERIFIED_ONLY']).default('PUBLIC'),
});

export type CreateRequirementFormValues = z.infer<typeof createRequirementSchema>;

export function buildCreateRequirementPayload(
  values: CreateRequirementFormValues
): CreateRequirementPayload {
  const payload: CreateRequirementPayload = {
    title: values.title.trim(),
    needSkill: values.needSkill as SkillType,
    industry: values.industry.trim(),
    stage: values.stage as StageType,
    commitment: values.commitment as AvailabilityType,
    startupNamePublic: Boolean(values.startupNamePublic),
    remote: Boolean(values.remote),
    visibility: (values.visibility as VisibilityType) || 'PUBLIC',
  };

  if (values.startupName && values.startupName.trim().length > 0) {
    payload.startupName = values.startupName.trim();
  }
  if (values.currentUsers && values.currentUsers.trim().length > 0) {
    const num = Number(values.currentUsers);
    if (!isNaN(num)) {
      payload.currentUsers = Math.round(num);
    }
  }
  if (values.ownerContributes && values.ownerContributes.trim().length > 0) {
    payload.ownerContributes = values.ownerContributes.trim();
  }
  if (values.offer && values.offer.trim().length > 0) {
    payload.offer = values.offer.trim();
  }
  if (values.equityOfferMax && values.equityOfferMax.trim().length > 0) {
    const num = Number(values.equityOfferMax);
    if (!isNaN(num)) {
      payload.equityOfferMax = Math.round(num);
    }
  }
  if (values.location && values.location.trim().length > 0) {
    payload.location = values.location.trim();
  }

  return payload;
}
