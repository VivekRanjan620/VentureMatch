import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';
import { ERROR_CODES } from '../config/constants';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  // Map Prisma P2003 (foreign key violation on userId when user no longer exists) to 401 UNAUTHORIZED
  if ((err as any)?.code === 'P2003') {
    res.status(401).json({
      error: {
        code: ERROR_CODES.UNAUTHORIZED,
        message: 'Session is no longer valid',
      },
    });
    return;
  }

  console.error('Unhandled Server Error:', err);

  res.status(500).json({
    error: {
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    },
  });
};
