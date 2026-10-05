import { Request, Response } from 'express';
import { env } from '../config/env';

export class HealthController {
  static getHealth(_req: Request, res: Response): void {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    });
  }
}
