import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { InterestService } from '../services/interest.service';
import { AppError } from '../lib/errors';

const createInterestSchema = z.object({}).strict();

const updateInterestStatusSchema = z
  .object({
    action: z.enum(['accept', 'later', 'decline', 'withdraw'], {
      errorMap: () => ({ message: 'Action must be accept, later, decline, or withdraw' }),
    }),
  })
  .strict();

const querySchema = z.object({
  status: z.string().optional(),
  cursor: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined)),
});

const receivedQuerySchema = z
  .object({
    status: z
      .enum(['PENDING', 'LATER', 'ACCEPTED', 'DECLINED', 'WITHDRAWN'], {
        errorMap: () => ({ message: 'Status must be one of PENDING, LATER, ACCEPTED, DECLINED, WITHDRAWN' }),
      })
      .optional(),
    requirementId: z.string().uuid('Invalid requirementId format').optional(),
    cursor: z.string().optional(),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .refine((val) => val === undefined || (!isNaN(val) && val >= 1 && val <= 50), {
        message: 'Limit must be an integer between 1 and 50',
      }),
  })
  .strict();

export class InterestController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw AppError.unauthorized();
      const parseResult = createInterestSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw AppError.badRequest('Validation failed', parseResult.error.flatten().fieldErrors);
      }
      const { id } = req.params;
      const interest = await InterestService.createInterest(req.user.userId, id);
      res.status(201).json({ interest });
    } catch (error) {
      next(error);
    }
  }

  static async getRequirementInterests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw AppError.unauthorized();
      const parseResult = querySchema.safeParse(req.query);
      if (!parseResult.success) {
        throw AppError.badRequest('Invalid query parameters', parseResult.error.flatten().fieldErrors);
      }
      const { id } = req.params;
      const result = await InterestService.getRequirementInterests(req.user.userId, id, parseResult.data);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getMine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw AppError.unauthorized();
      const parseResult = querySchema.safeParse(req.query);
      if (!parseResult.success) {
        throw AppError.badRequest('Invalid query parameters', parseResult.error.flatten().fieldErrors);
      }
      const result = await InterestService.getMyInterests(req.user.userId, parseResult.data);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getReceived(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw AppError.unauthorized();
      const parseResult = receivedQuerySchema.safeParse(req.query);
      if (!parseResult.success) {
        throw AppError.badRequest('Invalid query parameters', parseResult.error.flatten().fieldErrors);
      }
      const result = await InterestService.getReceivedInterests(req.user.userId, parseResult.data);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw AppError.unauthorized();
      const parseResult = updateInterestStatusSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw AppError.badRequest('Validation failed', parseResult.error.flatten().fieldErrors);
      }
      const { id } = req.params;
      const result = await InterestService.updateStatus(req.user.userId, id, parseResult.data.action);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
