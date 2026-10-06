import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken } from '../lib/jwt';
import { Role } from '@prisma/client';

export interface RegisterInput {
  email: string;
  password: string;
  role: Role;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class AuthService {
  static async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existing) {
      throw AppError.conflict('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        role: input.role,
        verificationRecords: {
          create: {
            type: 'EMAIL',
            method: 'self-declared',
            verifiedAt: null,
          },
        },
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    const tokens = await this.generateTokenPair(user.id, user.role);

    return { user, tokens };
  }

  static async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!user) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(input.password, user.passwordHash);

    if (!isMatch) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const tokens = await this.generateTokenPair(user.id, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      tokens,
    };
  }

  static async refresh(rawRefreshToken: string): Promise<AuthTokens> {
    let payload;
    try {
      payload = verifyRefreshToken(rawRefreshToken);
    } catch (_err) {
      throw AppError.unauthorized('Invalid or expired refresh token');
    }

    const tokenHash = hashToken(rawRefreshToken);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
      throw AppError.unauthorized('Invalid, revoked, or expired refresh token');
    }

    // Revoke current refresh token (Rotation)
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    // Generate new token pair
    return this.generateTokenPair(storedToken.user.id, storedToken.user.role);
  }

  static async logout(rawRefreshToken?: string): Promise<void> {
    if (!rawRefreshToken) return;

    try {
      const tokenHash = hashToken(rawRefreshToken);
      await prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch (_err) {
      // Ignore errors during logout
    }
  }

  private static async generateTokenPair(userId: string, role: string): Promise<AuthTokens> {
    const accessToken = signAccessToken({ userId, role });
    
    const tokenId = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    const refreshToken = signRefreshToken({ userId, tokenId });
    const tokenHash = hashToken(refreshToken);

    await prisma.refreshToken.create({
      data: {
        id: tokenId,
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  }
}
