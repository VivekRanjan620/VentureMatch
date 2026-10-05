import { z } from 'zod';

export const ALLOWED_SKILLS = [
  'TECH',
  'MARKETING',
  'SALES',
  'FINANCE',
  'OPERATIONS',
  'PRODUCT',
  'DESIGN',
  'OTHER',
] as const;

export type Skill = (typeof ALLOWED_SKILLS)[number];

export const skillEnumSchema = z.enum(ALLOWED_SKILLS, {
  errorMap: () => ({
    message: `Skill must be one of: ${ALLOWED_SKILLS.join(', ')}`,
  }),
});

export const skillsArraySchema = z
  .array(skillEnumSchema)
  .min(1, 'At least one skill must be provided');
