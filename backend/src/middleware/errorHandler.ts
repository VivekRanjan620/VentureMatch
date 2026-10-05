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

  console.error('Unhandled Server Error:', err);

  res.status(500).json({
    error: {
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    },
  });
};
