import { z } from 'zod';

export const ALLOWED_STAGES = ['IDEA', 'MVP', 'EARLY_TRACTION', 'GROWTH'] as const;

export type Stage = (typeof ALLOWED_STAGES)[number];

export const stageEnumSchema = z.enum(ALLOWED_STAGES, {
  errorMap: () => ({
    message: `Stage must be one of: ${ALLOWED_STAGES.join(', ')}`,
  }),
});
