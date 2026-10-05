import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';

export interface JwtAccessPayload {
  userId: string;
  role: string;
}

export interface JwtRefreshPayload {
  userId: string;
  tokenId: string;
}

export const signAccessToken = (payload: JwtAccessPayload): string => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
};

export const signRefreshToken = (payload: JwtRefreshPayload): string => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
};

export const verifyAccessToken = (token: string): JwtAccessPayload => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtAccessPayload;
};

export const verifyRefreshToken = (token: string): JwtRefreshPayload => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtRefreshPayload;
};

export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};
