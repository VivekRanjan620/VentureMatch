import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { parseSkillsArray } from './matching.service';
import { decodeCursor, encodeRecentCursor, RecentCursorPayload } from './requirement.service';

export const normalizePhone = (phone?: string | null): string | null => {
  if (!phone || typeof phone !== 'string') return null;
  const stripped = phone.replace(/[\s\-()]/g, '');
  return stripped || null;
};

export interface ConnectionDTO {
  id: string;
  createdAt: string;
  requirement: {
    id: string;
    title: string;
  };
  otherUser: {
    id: string;
    name: string;
    city: string | null;
    industry: string | null;
    skills: string[];
    badges: string[];
    shareablePhone?: string;
    shareableEmail?: string;
  };
  iHaveShared: boolean;
  theyHaveShared: boolean;
  conversationId?: string;
}

export class ConnectionService {
  static async getBlockedUserIds(userId: string): Promise<Set<string>> {
    const blocks = await prisma.block.findMany({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
    });
    const blockedUserIds = new Set<string>();
    for (const b of blocks) {
      if (b.blockerId === userId) blockedUserIds.add(b.blockedId);
      if (b.blockedId === userId) blockedUserIds.add(b.blockerId);
    }
    return blockedUserIds;
  }

  static getConnectionsWhereInput(userId: string, blockedUserIds: Set<string>): Prisma.ConnectionWhereInput {
    return {
      OR: [{ userAId: userId }, { userBId: userId }],
      AND: [
        { userAId: { notIn: Array.from(blockedUserIds) } },
        { userBId: { notIn: Array.from(blockedUserIds) } },
      ],
    };
  }

  static async getConnectionsCount(userId: string, blockedUserIds?: Set<string>): Promise<number> {
    const blocked = blockedUserIds ?? await ConnectionService.getBlockedUserIds(userId);
    const whereConditions = ConnectionService.getConnectionsWhereInput(userId, blocked);
    return prisma.connection.count({ where: whereConditions });
  }

  static async getConnections(
    userId: string,
    params: { cursor?: string; limit?: number },
  ): Promise<{ items: ConnectionDTO[]; nextCursor: string | null }> {
    const limit = Math.min(Math.max(params.limit || 20, 1), 50);

    const blockedUserIds = await ConnectionService.getBlockedUserIds(userId);

    let recentCursor: RecentCursorPayload | null = null;
    if (params.cursor) {
      recentCursor = decodeCursor(params.cursor, 'recent') as RecentCursorPayload;
    }
    const cursorObj = recentCursor ? { createdAt: new Date(recentCursor.createdAt), id: recentCursor.id } : null;

    const baseWhere = ConnectionService.getConnectionsWhereInput(userId, blockedUserIds);
    const existingAnd = Array.isArray(baseWhere.AND)
      ? baseWhere.AND
      : baseWhere.AND
      ? [baseWhere.AND]
      : [];
    const whereConditions: Prisma.ConnectionWhereInput = cursorObj
      ? {
          ...baseWhere,
          AND: [
            ...existingAnd,
            {
              OR: [
                { createdAt: { lt: cursorObj.createdAt } },
                { createdAt: cursorObj.createdAt, id: { lt: cursorObj.id } },
              ],
            },
          ],
        }
      : baseWhere;

    let records = await prisma.connection.findMany({
      where: whereConditions,
      take: limit + 1,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        interest: {
          include: {
            requirement: true,
          },
        },
        userA: {
          include: {
            profile: true,
            verificationRecords: true,
          },
        },
        userB: {
          include: {
            profile: true,
            verificationRecords: true,
          },
        },
        conversation: true,
      },
    });

    let nextCursor: string | null = null;
    if (records.length > limit) {
      const nextItem = records[limit - 1];
      nextCursor = encodeRecentCursor(nextItem.createdAt, nextItem.id);
      records = records.slice(0, limit);
    }

    const items: ConnectionDTO[] = records.map((conn) => {
      const isUserA = conn.userAId === userId;
      const otherUser = isUserA ? conn.userB : conn.userA;
      const otherProfile = otherUser?.profile;
      const verifications = otherUser?.verificationRecords || [];

      const badges: string[] = [];
      for (const v of verifications) {
        if (v.type === 'EMAIL') badges.push('EMAIL_DECLARED');
        if (v.type === 'LINKEDIN') badges.push('LINKEDIN_LINKED');
        if (v.type === 'PHONE') badges.push('PHONE_LINKED');
      }

      const req = conn.interest.requirement;

      return {
        id: conn.id,
        createdAt: conn.createdAt.toISOString(),
        requirement: {
          id: req.id,
          title: req.title,
        },
        otherUser: {
          id: otherUser.id,
          name: otherProfile?.name || 'Anonymous User',
          city: otherProfile?.city || null,
          industry: otherProfile?.industry || null,
          skills: parseSkillsArray(otherProfile?.skills),
          badges,
        },
        iHaveShared: isUserA ? conn.contactSharedA : conn.contactSharedB,
        theyHaveShared: isUserA ? conn.contactSharedB : conn.contactSharedA,
        conversationId: conn.conversation?.id,
      };
    });

    return { items, nextCursor };
  }

  static async getConnectionById(userId: string, connectionId: string): Promise<ConnectionDTO> {
    const conn = await prisma.connection.findUnique({
      where: { id: connectionId },
      include: {
        interest: {
          include: {
            requirement: true,
          },
        },
        userA: {
          include: {
            profile: true,
            verificationRecords: true,
          },
        },
        userB: {
          include: {
            profile: true,
            verificationRecords: true,
          },
        },
        conversation: true,
      },
    });

    if (!conn) {
      throw AppError.notFound('Connection not found');
    }

    const isUserA = conn.userAId === userId;
    const isUserB = conn.userBId === userId;

    if (!isUserA && !isUserB) {
      throw AppError.notFound('Connection not found');
    }

    const block = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: conn.userAId, blockedId: conn.userBId },
          { blockerId: conn.userBId, blockedId: conn.userAId },
        ],
      },
    });

    if (block) {
      throw AppError.notFound('Connection not found');
    }

    const otherUser = isUserA ? conn.userB : conn.userA;
    const otherProfile = otherUser?.profile;
    const verifications = otherUser?.verificationRecords || [];

    const badges: string[] = [];
    for (const v of verifications) {
      if (v.type === 'EMAIL') badges.push('EMAIL_DECLARED');
      if (v.type === 'LINKEDIN') badges.push('LINKEDIN_LINKED');
      if (v.type === 'PHONE') badges.push('PHONE_LINKED');
    }

    const req = conn.interest.requirement;
    const mutualShare = conn.contactSharedA && conn.contactSharedB;

    const otherUserDTO: ConnectionDTO['otherUser'] = {
      id: otherUser.id,
      name: otherProfile?.name || 'Anonymous User',
      city: otherProfile?.city || null,
      industry: otherProfile?.industry || null,
      skills: parseSkillsArray(otherProfile?.skills),
      badges,
    };

    if (mutualShare) {
      const phoneNorm = normalizePhone(otherProfile?.shareablePhone);
      if (phoneNorm) otherUserDTO.shareablePhone = phoneNorm;
      if (otherProfile?.shareableEmail) otherUserDTO.shareableEmail = otherProfile.shareableEmail;
    }

    return {
      id: conn.id,
      createdAt: conn.createdAt.toISOString(),
      requirement: {
        id: req.id,
        title: req.title,
      },
      otherUser: otherUserDTO,
      iHaveShared: isUserA ? conn.contactSharedA : conn.contactSharedB,
      theyHaveShared: isUserA ? conn.contactSharedB : conn.contactSharedA,
      conversationId: conn.conversation?.id,
    };
  }

  static async shareContact(userId: string, connectionId: string): Promise<{ success: boolean; connection: ConnectionDTO }> {
    const conn = await prisma.connection.findUnique({
      where: { id: connectionId },
    });

    if (!conn) {
      throw AppError.notFound('Connection not found');
    }

    const isUserA = conn.userAId === userId;
    const isUserB = conn.userBId === userId;

    if (!isUserA && !isUserB) {
      throw AppError.notFound('Connection not found');
    }

    const block = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: conn.userAId, blockedId: conn.userBId },
          { blockerId: conn.userBId, blockedId: conn.userAId },
        ],
      },
    });

    if (block) {
      throw AppError.notFound('Connection not found');
    }

    const callerProfile = await prisma.profile.findUnique({
      where: { userId },
    });

    const hasPhone = Boolean(normalizePhone(callerProfile?.shareablePhone));
    const hasEmail = Boolean(callerProfile?.shareableEmail);

    if (!hasPhone && !hasEmail) {
      throw AppError.badRequest('You must set at least one shareable contact field (phone or email) in your profile before sharing contact information');
    }

    await prisma.connection.update({
      where: { id: connectionId },
      data: {
        ...(isUserA ? { contactSharedA: true } : { contactSharedB: true }),
      },
    });

    const updatedDTO = await ConnectionService.getConnectionById(userId, connectionId);
    return { success: true, connection: updatedDTO };
  }
}
