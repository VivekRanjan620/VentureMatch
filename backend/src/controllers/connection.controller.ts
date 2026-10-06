import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ConnectionService } from '../services/connection.service';
import { AppError } from '../lib/errors';

const querySchema = z.object({
  cursor: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined)),
});

export class ConnectionController {
  static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw AppError.unauthorized();
      const parseResult = querySchema.safeParse(req.query);
      if (!parseResult.success) {
        throw AppError.badRequest('Invalid query parameters', parseResult.error.flatten().fieldErrors);
      }
      const result = await ConnectionService.getConnections(req.user.userId, parseResult.data);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw AppError.unauthorized();
      const { id } = req.params;
      const connection = await ConnectionService.getConnectionById(req.user.userId, id);
      res.status(200).json({ connection });
    } catch (error) {
      next(error);
    }
  }

  static async shareContact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw AppError.unauthorized();
      const { id } = req.params;
      const result = await ConnectionService.shareContact(req.user.userId, id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
