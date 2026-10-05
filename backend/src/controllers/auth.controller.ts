import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { AuthService } from '../services/auth.service';
import { AppError } from '../lib/errors';

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  role: z.nativeEnum(Role, {
    errorMap: () => ({ message: 'Role must be FOUNDER, SEEKER, or BOTH' }),
  }).default(Role.BOTH),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const logoutSchema = z.object({
  refreshToken: z.string().optional(),
});

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parseResult = registerSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw AppError.badRequest('Validation failed', parseResult.error.flatten().fieldErrors);
      }

      const result = await AuthService.register(parseResult.data);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parseResult = loginSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw AppError.badRequest('Validation failed', parseResult.error.flatten().fieldErrors);
      }

      const result = await AuthService.login(parseResult.data);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parseResult = refreshSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw AppError.badRequest('Validation failed', parseResult.error.flatten().fieldErrors);
      }

      const tokens = await AuthService.refresh(parseResult.data.refreshToken);
      res.status(200).json({ tokens });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parseResult = logoutSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw AppError.badRequest('Validation failed', parseResult.error.flatten().fieldErrors);
      }

      await AuthService.logout(parseResult.data.refreshToken);
      res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }
}
