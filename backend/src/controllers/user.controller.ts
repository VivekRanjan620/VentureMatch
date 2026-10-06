import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Availability, CompensationPref } from '@prisma/client';
import { UserService } from '../services/user.service';
import { AppError } from '../lib/errors';
import { skillsArraySchema } from '../config/skills';

const updateProfileSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    city: z.string().min(1, 'City is required'),
    ageRange: z.string().optional(),
    industry: z.string().min(1, 'Industry is required'),
    bio: z.string().optional(),
    skills: skillsArraySchema,
    experienceYears: z
      .number({ invalid_type_error: 'Experience years must be a number' })
      .int()
      .min(0, 'Experience years cannot be negative')
      .max(70, 'Invalid experience years'),
    previousStartup: z.boolean().optional(),
    currentWork: z.string().optional(),
    shareablePhone: z.string().optional(),
    shareableEmail: z.string().email('Invalid shareable email format').optional(),
  })
  .strict();

const updateCommitmentSchema = z
  .object({
    hoursPerWeek: z
      .number({ invalid_type_error: 'Hours per week must be a number' })
      .int()
      .min(1, 'Hours per week must be between 1 and 80')
      .max(80, 'Hours per week must be between 1 and 80'),
    availability: z.nativeEnum(Availability, {
      errorMap: () => ({ message: 'Availability must be FULL, PART, or WEEKEND' }),
    }),
    minMonths: z
      .number({ invalid_type_error: 'Minimum months must be a number' })
      .int()
      .min(1, 'Minimum months must be between 1 and 60')
      .max(60, 'Minimum months must be between 1 and 60'),
    canInvestAmount: z.number().min(0, 'Invest amount cannot be negative').optional(),
    contributes: skillsArraySchema.optional(),
    equityExpectation: z
      .number({ invalid_type_error: 'Equity expectation must be a number' })
      .int()
      .min(0, 'Equity expectation must be between 0 and 100')
      .max(100, 'Equity expectation must be between 0 and 100'),
    compensationPref: z.nativeEnum(CompensationPref, {
      errorMap: () => ({ message: 'Compensation preference must be EQUITY, SALARY, or REV_SHARE' }),
    }),
    remote: z.boolean().optional(),
  })
  .strict();

const linkedinVerificationSchema = z
  .object({
    linkedinUrl: z.string().min(1, 'LinkedIn URL is required'),
  })
  .strict();

export class UserController {
  static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized();
      }

      const result = await UserService.getMe(req.user.userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized();
      }

      const parseResult = updateProfileSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw AppError.badRequest('Validation failed', parseResult.error.flatten().fieldErrors);
      }

      const profile = await UserService.updateProfile(req.user.userId, parseResult.data);
      res.status(200).json({ profile });
    } catch (error) {
      next(error);
    }
  }

  static async getCommitment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized();
      }

      const commitment = await UserService.getCommitment(req.user.userId);
      res.status(200).json({ commitment });
    } catch (error) {
      next(error);
    }
  }

  static async updateCommitment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized();
      }

      const parseResult = updateCommitmentSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw AppError.badRequest('Validation failed', parseResult.error.flatten().fieldErrors);
      }

      const commitment = await UserService.updateCommitment(req.user.userId, parseResult.data);
      res.status(200).json({ commitment });
    } catch (error) {
      next(error);
    }
  }

  static async verifyLinkedin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized();
      }

      const parseResult = linkedinVerificationSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw AppError.badRequest('Validation failed', parseResult.error.flatten().fieldErrors);
      }

      const verification = await UserService.addLinkedinVerification(
        req.user.userId,
        parseResult.data.linkedinUrl,
      );
      res.status(200).json({ verification });
    } catch (error) {
      next(error);
    }
  }
}
