import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtAccessPayload } from '../lib/jwt';
import { AppError } from '../lib/errors';

declare global {
  namespace Express {
    interface Request {
      user?: JwtAccessPayload;
    }
  }
}

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw AppError.unauthorized('Missing or invalid Authorization header');
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (_err) {
    throw AppError.unauthorized('Invalid or expired access token');
  }
};
