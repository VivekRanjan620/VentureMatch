import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { ERROR_CODES } from '../config/constants';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
        message: 'Too many authentication attempts, please try again later.',
      },
    });
  },
});

export const authRateLimiter = (req: Request, res: Response, next: NextFunction): void => {
  if (process.env.NODE_ENV === 'test') {
    return next();
  }
  limiter(req, res, next);
};
