import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Availability, Visibility, RequirementStatus } from '@prisma/client';
import { RequirementService } from '../services/requirement.service';
import { AppError } from '../lib/errors';
import { skillEnumSchema } from '../config/skills';
import { stageEnumSchema } from '../config/stages';

const createRequirementSchema = z
  .object({
    title: z.string().min(1, 'Title is required'),
    needSkill: skillEnumSchema,
    startupName: z.string().optional(),
    startupNamePublic: z.boolean().default(false),
    industry: z.string().min(1, 'Industry is required'),
    stage: stageEnumSchema,
    currentUsers: z.number().int().min(0).default(0),
    ownerContributes: z.string().optional(),
    offer: z.string().optional(),
    equityOfferMax: z.number().int().min(0).max(100).optional(),
    commitment: z.nativeEnum(Availability, {
      errorMap: () => ({ message: 'Commitment must be FULL, PART, or WEEKEND' }),
    }),
    location: z.string().optional(),
    remote: z.boolean().default(true),
    visibility: z.nativeEnum(Visibility).default(Visibility.PUBLIC),
  })
  .strict();

const updateRequirementSchema = z
  .object({
    title: z.string().min(1).optional(),
    needSkill: skillEnumSchema.optional(),
    startupName: z.string().optional(),
    startupNamePublic: z.boolean().optional(),
    industry: z.string().min(1).optional(),
    stage: stageEnumSchema.optional(),
    currentUsers: z.number().int().min(0).optional(),
    ownerContributes: z.string().optional(),
    offer: z.string().optional(),
    equityOfferMax: z.number().int().min(0).max(100).optional(),
    commitment: z.nativeEnum(Availability).optional(),
    location: z.string().optional(),
    remote: z.boolean().optional(),
    visibility: z.nativeEnum(Visibility).optional(),
    status: z.nativeEnum(RequirementStatus, {
      errorMap: () => ({ message: 'Status must be ACTIVE, PAUSED, or CLOSED' }),
    }).optional(),
  })
  .strict();

const browseQuerySchema = z.object({
  q: z.string().optional(),
  skill: z.string().optional(),
  stage: z.string().optional(),
  commitment: z.string().optional(),
  location: z.string().optional(),
  remote: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
  sort: z.enum(['recent', 'match']).optional(),
  cursor: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined)),
});

export class RequirementController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized();
      }

      const parseResult = createRequirementSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw AppError.badRequest('Validation failed', parseResult.error.flatten().fieldErrors);
      }

      const requirement = await RequirementService.createRequirement(req.user.userId, parseResult.data);
      res.status(201).json({ requirement });
    } catch (error) {
      next(error);
    }
  }

  static async getMine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized();
      }

      const requirements = await RequirementService.getMyRequirements(req.user.userId);
      res.status(200).json({ requirements });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized();
      }

      const { id } = req.params;
      const requirement = await RequirementService.getRequirementById(id, req.user.userId);
      res.status(200).json({ requirement });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized();
      }

      const { id } = req.params;
      const parseResult = updateRequirementSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw AppError.badRequest('Validation failed', parseResult.error.flatten().fieldErrors);
      }

      const requirement = await RequirementService.updateRequirement(id, req.user.userId, parseResult.data);
      res.status(200).json({ requirement });
    } catch (error) {
      next(error);
    }
  }

  static async browse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized();
      }

      const parseResult = browseQuerySchema.safeParse(req.query);
      if (!parseResult.success) {
        throw AppError.badRequest('Invalid query parameters', parseResult.error.flatten().fieldErrors);
      }

      const result = await RequirementService.browseRequirements(req.user.userId, parseResult.data);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
