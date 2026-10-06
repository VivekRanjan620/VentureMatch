import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { checkProfileComplete, checkCommitmentComplete } from './user.service';
import { Availability, Visibility, RequirementStatus } from '@prisma/client';
import { score, BreakdownItem } from './matching.service';
import { MATCH_CONFIG } from '../config/matching';

export interface CreateRequirementInput {
  title: string;
  needSkill: string;
  startupName?: string;
  startupNamePublic?: boolean;
  industry: string;
  stage: string;
  currentUsers?: number;
  ownerContributes?: string;
  offer?: string;
  equityOfferMax?: number;
  commitment: Availability;
  location?: string;
  remote?: boolean;
  visibility?: Visibility;
}

export interface UpdateRequirementInput {
  title?: string;
  needSkill?: string;
  startupName?: string;
  startupNamePublic?: boolean;
  industry?: string;
  stage?: string;
  currentUsers?: number;
  ownerContributes?: string;
  offer?: string;
  equityOfferMax?: number;
  commitment?: Availability;
  location?: string;
  remote?: boolean;
  visibility?: Visibility;
  status?: RequirementStatus;
}

export interface BrowseQueryParams {
  q?: string;
  skill?: string;
  stage?: string;
  commitment?: string;
  location?: string;
  remote?: boolean;
  sort?: 'recent' | 'match';
  cursor?: string;
  limit?: number;
}

export interface RequirementDTO {
  id: string;
  title: string;
  needSkill: string;
  industry: string;
  stage: string;
  currentUsers: number;
  ownerContributes: string | null;
  offer: string | null;
  equityOfferMax: number | null;
  commitment: string | null;
  location: string | null;
  remote: boolean;
  createdAt: string;
  status: RequirementStatus;
  visibility: Visibility;
  startupName?: string | null;
  owner: {
    id: string;
    name: string;
    city: string | null;
    badges: string[];
  };
  score?: number | null;
  breakdown?: Record<string, BreakdownItem> | null;
  reasons?: string[];
}

export interface RecentCursorPayload {
  mode: 'recent';
  createdAt: string;
  id: string;
}

export interface MatchCursorPayload {
  mode: 'match';
  score: number | null;
  id: string;
}

// Map Prisma Requirement + Owner model into a safe DTO
export const mapToRequirementDTO = (reqRecord: any, requestingUserId?: string): RequirementDTO => {
  const owner = reqRecord.owner || {};
  const ownerProfile = owner.profile || {};
  const verifications = owner.verificationRecords || [];

  const badges: string[] = [];
  for (const v of verifications) {
    if (v.type === 'EMAIL') badges.push('EMAIL_DECLARED');
    if (v.type === 'LINKEDIN') badges.push('LINKEDIN_LINKED');
    if (v.type === 'PHONE') badges.push('PHONE_LINKED');
  }

  const isOwner = Boolean(
    requestingUserId &&
      (reqRecord.ownerId === requestingUserId || owner.id === requestingUserId),
  );

  const dto: RequirementDTO = {
    id: reqRecord.id,
    title: reqRecord.title,
    needSkill: reqRecord.needSkill,
    industry: reqRecord.industry,
    stage: reqRecord.stage,
    currentUsers: reqRecord.currentUsers,
    ownerContributes: reqRecord.ownerContributes || null,
    offer: reqRecord.offer || null,
    equityOfferMax: reqRecord.equityOfferMax ?? null,
    commitment: reqRecord.commitment || null,
    location: reqRecord.location || null,
    remote: reqRecord.remote,
    createdAt: reqRecord.createdAt instanceof Date ? reqRecord.createdAt.toISOString() : new Date(reqRecord.createdAt).toISOString(),
    status: reqRecord.status,
    visibility: reqRecord.visibility,
    owner: {
      id: owner.id || reqRecord.ownerId,
      name: ownerProfile.name || 'Anonymous Founder',
      city: ownerProfile.city || null,
      badges,
    },
  };

  // Rule: startupName is returned ONLY IF startupNamePublic is true OR caller is the owner!
  if (reqRecord.startupNamePublic || isOwner) {
    dto.startupName = reqRecord.startupName || null;
  }

  return dto;
};

// Opaque base64 cursor encoders and decoders
export const encodeRecentCursor = (createdAt: Date | string, id: string): string => {
  const isoStr = createdAt instanceof Date ? createdAt.toISOString() : new Date(createdAt).toISOString();
  const payload: RecentCursorPayload = { mode: 'recent', createdAt: isoStr, id };
  return Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64');
};

export const encodeMatchCursor = (score: number | null, id: string): string => {
  const payload: MatchCursorPayload = { mode: 'match', score, id };
  return Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64');
};

export const decodeCursor = (cursorStr: string, expectedMode: 'recent' | 'match'): RecentCursorPayload | MatchCursorPayload => {
  try {
    const jsonStr = Buffer.from(cursorStr, 'base64').toString('utf-8');
    const parsed = JSON.parse(jsonStr);

    if (!parsed || typeof parsed !== 'object' || !parsed.id) {
      throw new Error('Invalid cursor shape');
    }

    const mode = parsed.mode || (parsed.createdAt ? 'recent' : 'match');

    if (mode !== expectedMode) {
      throw AppError.badRequest('Invalid cursor for sort mode');
    }

    if (expectedMode === 'recent') {
      if (!parsed.createdAt || isNaN(Date.parse(parsed.createdAt))) {
        throw new Error('Invalid recent cursor createdAt');
      }
      return { mode: 'recent', createdAt: parsed.createdAt, id: parsed.id };
    } else {
      const scoreVal = parsed.score !== undefined && parsed.score !== null ? Number(parsed.score) : null;
      return { mode: 'match', score: scoreVal, id: parsed.id };
    }
  } catch (err: any) {
    if (err instanceof AppError) {
      throw err;
    }
    throw AppError.badRequest('Invalid cursor format');
  }
};

// Helper to sanitize search input (strips boolean mode operators)
export const sanitizeSearchQuery = (q: string): string => {
  return q.replace(/[+\-<>(){}~*"@]/g, ' ').trim();
};

export class RequirementService {
  static async createRequirement(userId: string, data: CreateRequirementInput): Promise<RequirementDTO> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user || !user.profile || !checkProfileComplete(user.profile)) {
      throw AppError.forbidden('Must complete profile before posting a requirement');
    }

    const created = await prisma.requirement.create({
      data: {
        ownerId: userId,
        title: data.title,
        needSkill: data.needSkill,
        startupName: data.startupName,
        startupNamePublic: data.startupNamePublic ?? false,
        industry: data.industry,
        stage: data.stage,
        currentUsers: data.currentUsers ?? 0,
        ownerContributes: data.ownerContributes,
        offer: data.offer,
        equityOfferMax: data.equityOfferMax,
        commitment: data.commitment,
        location: data.location,
        remote: data.remote ?? true,
        visibility: data.visibility ?? Visibility.PUBLIC,
        status: RequirementStatus.ACTIVE,
      },
      include: {
        owner: {
          include: {
            profile: true,
            commitmentProfile: true,
            verificationRecords: true,
          },
        },
      },
    });

    const dto = mapToRequirementDTO(created, userId);
    dto.score = null;
    dto.breakdown = null;
    dto.reasons = [];
    return dto;
  }

  static async getMyRequirements(userId: string): Promise<RequirementDTO[]> {
    const list = await prisma.requirement.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          include: {
            profile: true,
            commitmentProfile: true,
            verificationRecords: true,
          },
        },
      },
    });

    return list.map((item) => {
      const dto = mapToRequirementDTO(item, userId);
      dto.score = null;
      dto.breakdown = null;
      dto.reasons = [];
      return dto;
    });
  }

  static async getRequirementById(id: string, requestingUserId: string): Promise<RequirementDTO> {
    const req = await prisma.requirement.findUnique({
      where: { id },
      include: {
        owner: {
          include: {
            profile: true,
            commitmentProfile: true,
            verificationRecords: true,
          },
        },
      },
    });

    if (!req) {
      throw AppError.notFound('Requirement not found');
    }

    const block = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: requestingUserId, blockedId: req.ownerId },
          { blockerId: req.ownerId, blockedId: requestingUserId },
        ],
      },
    });

    if (block) {
      throw AppError.notFound('Requirement not found');
    }

    const isOwner = req.ownerId === requestingUserId;

    if (!isOwner && req.status !== RequirementStatus.ACTIVE) {
      throw AppError.notFound('Requirement not found');
    }

    if (!isOwner && req.visibility === Visibility.VERIFIED_ONLY) {
      const verifications = await prisma.verificationRecord.findMany({
        where: {
          userId: requestingUserId,
          type: { in: ['LINKEDIN', 'PHONE'] },
        },
      });

      if (verifications.length === 0) {
        throw AppError.forbidden('VERIFIED_ONLY requirement requires linked LinkedIn or Phone verification');
      }
    }

    const dto = mapToRequirementDTO(req, requestingUserId);

    if (isOwner) {
      dto.score = null;
      dto.breakdown = null;
      dto.reasons = [];
    } else {
      const requesterUser = await prisma.user.findUnique({
        where: { id: requestingUserId },
        include: { profile: true, commitmentProfile: true },
      });

      const scoreRes = score(
        {
          profile: requesterUser?.profile,
          commitment: requesterUser?.commitmentProfile,
        },
        {
          needSkill: req.needSkill,
          industry: req.industry,
          stage: req.stage,
          equityOfferMax: req.equityOfferMax,
          commitment: req.commitment,
          location: req.location,
          remote: req.remote,
        },
        {
          profile: req.owner.profile,
          commitment: req.owner.commitmentProfile,
        },
      );

      dto.score = scoreRes.score;
      dto.breakdown = scoreRes.breakdown;
      dto.reasons = scoreRes.reasons;
    }

    return dto;
  }

  static async updateRequirement(
    id: string,
    requestingUserId: string,
    data: UpdateRequirementInput,
  ): Promise<RequirementDTO> {
    const req = await prisma.requirement.findUnique({
      where: { id },
    });

    if (!req) {
      throw AppError.notFound('Requirement not found');
    }

    if (req.ownerId !== requestingUserId) {
      throw AppError.forbidden('You do not have permission to modify this requirement');
    }

    if (req.status === RequirementStatus.CLOSED && data.status && data.status !== RequirementStatus.CLOSED) {
      throw AppError.badRequest('CLOSED requirements cannot be reopened');
    }

    const updated = await prisma.requirement.update({
      where: { id },
      data: {
        title: data.title,
        needSkill: data.needSkill,
        startupName: data.startupName,
        startupNamePublic: data.startupNamePublic,
        industry: data.industry,
        stage: data.stage,
        currentUsers: data.currentUsers,
        ownerContributes: data.ownerContributes,
        offer: data.offer,
        equityOfferMax: data.equityOfferMax,
        commitment: data.commitment,
        location: data.location,
        remote: data.remote,
        visibility: data.visibility,
        status: data.status,
      },
      include: {
        owner: {
          include: {
            profile: true,
            commitmentProfile: true,
            verificationRecords: true,
          },
        },
      },
    });

    const dto = mapToRequirementDTO(updated, requestingUserId);
    dto.score = null;
    dto.breakdown = null;
    dto.reasons = [];
    return dto;
  }

  static async browseRequirements(
    requestingUserId: string,
    params: BrowseQueryParams,
  ): Promise<{ items: RequirementDTO[]; nextCursor: string | null }> {
    const limit = Math.min(Math.max(params.limit || 20, 1), 50);

    const requesterUser = await prisma.user.findUnique({
      where: { id: requestingUserId },
      include: { profile: true, commitmentProfile: true, verificationRecords: true },
    });

    const requesterVerifications = requesterUser?.verificationRecords || [];
    const canSeeVerifiedOnly = requesterVerifications.some((v) => v.type === 'LINKEDIN' || v.type === 'PHONE');

    const isCallerProfileComplete = checkProfileComplete(requesterUser?.profile);
    const isCallerCommitmentComplete = checkCommitmentComplete(requesterUser?.commitmentProfile);
    const isCallerComplete = isCallerProfileComplete && isCallerCommitmentComplete;

    const blocks = await prisma.block.findMany({
      where: {
        OR: [{ blockerId: requestingUserId }, { blockedId: requestingUserId }],
      },
    });
    const blockedUserIds = new Set<string>();
    for (const b of blocks) {
      if (b.blockerId === requestingUserId) blockedUserIds.add(b.blockedId);
      if (b.blockedId === requestingUserId) blockedUserIds.add(b.blockerId);
    }
    const excludedOwnerIds = Array.from(blockedUserIds);
    excludedOwnerIds.push(requestingUserId);

    const rawSearch = params.q ? params.q.trim() : '';
    const sanitizedQuery = sanitizeSearchQuery(rawSearch);
    const sortMode = params.sort === 'match' ? 'match' : 'recent';

    const attachScore = (dto: RequirementDTO, reqRecord: any) => {
      if (!isCallerComplete) {
        dto.score = null;
        dto.breakdown = null;
        dto.reasons = ['Complete your profile to see your score'];
        return;
      }

      const scoreResult = score(
        {
          profile: requesterUser?.profile,
          commitment: requesterUser?.commitmentProfile,
        },
        {
          needSkill: reqRecord.needSkill,
          industry: reqRecord.industry,
          stage: reqRecord.stage,
          equityOfferMax: reqRecord.equityOfferMax,
          commitment: reqRecord.commitment,
          location: reqRecord.location,
          remote: reqRecord.remote,
        },
        {
          profile: reqRecord.owner?.profile,
          commitment: reqRecord.owner?.commitmentProfile,
        },
      );

      dto.score = scoreResult.score;
      dto.breakdown = scoreResult.breakdown;
      dto.reasons = scoreResult.reasons;
    };

    if (sortMode === 'match') {
      let matchCursor: MatchCursorPayload | null = null;
      if (params.cursor) {
        matchCursor = decodeCursor(params.cursor, 'match') as MatchCursorPayload;
      }

      if (!isCallerComplete) {
        return RequirementService.browseRequirements(requestingUserId, {
          ...params,
          sort: 'recent',
        });
      }

      const whereConditions: Prisma.RequirementWhereInput = {
        status: RequirementStatus.ACTIVE,
        ownerId: { notIn: excludedOwnerIds },
        ...(canSeeVerifiedOnly ? {} : { visibility: Visibility.PUBLIC }),
        ...(params.skill ? { needSkill: params.skill } : {}),
        ...(params.stage ? { stage: params.stage } : {}),
        ...(params.commitment ? { commitment: params.commitment } : {}),
        ...(params.remote !== undefined ? { remote: params.remote } : {}),
        ...(params.location
          ? {
              location: {
                contains: params.location.replace(/[%_]/g, '\\$&'),
              },
            }
          : {}),
      };

      if (sanitizedQuery.length > 0 && sanitizedQuery.length < 3) {
        const escapedTerm = sanitizedQuery.replace(/[%_]/g, '\\$&');
        whereConditions.OR = [
          { title: { contains: escapedTerm } },
          { industry: { contains: escapedTerm } },
          { needSkill: { contains: escapedTerm } },
        ];
      }

      let candidateRecords: any[] = [];

      if (sanitizedQuery.length >= 3) {
        const skillClause = params.skill ? Prisma.sql`AND r.needSkill = ${params.skill}` : Prisma.empty;
        const stageClause = params.stage ? Prisma.sql`AND r.stage = ${params.stage}` : Prisma.empty;
        const commitmentClause = params.commitment ? Prisma.sql`AND r.commitment = ${params.commitment}` : Prisma.empty;
        const remoteClause = params.remote !== undefined ? Prisma.sql`AND r.remote = ${params.remote}` : Prisma.empty;
        const locationClause = params.location ? Prisma.sql`AND r.location LIKE ${`%${params.location.replace(/[%_]/g, '\\$&')}%`}` : Prisma.empty;
        const visibilityClause = canSeeVerifiedOnly ? Prisma.empty : Prisma.sql`AND r.visibility = 'PUBLIC'`;
        const excludedClause = excludedOwnerIds.length > 0
          ? Prisma.sql`AND r.ownerId NOT IN (${Prisma.join(excludedOwnerIds)})`
          : Prisma.empty;

        const rawResults = await prisma.$queryRaw<any[]>`
          SELECT r.id
          FROM requirements r
          WHERE r.status = 'ACTIVE'
          ${excludedClause}
          ${visibilityClause}
          ${skillClause}
          ${stageClause}
          ${commitmentClause}
          ${remoteClause}
          ${locationClause}
          AND MATCH(r.title, r.industry, r.needSkill) AGAINST (${sanitizedQuery} IN BOOLEAN MODE)
          ORDER BY r.createdAt DESC, r.id DESC
          LIMIT ${MATCH_CONFIG.candidateCap};
        `;

        const reqIds = rawResults.map((row) => row.id);
        if (reqIds.length > 0) {
          candidateRecords = await prisma.requirement.findMany({
            where: { id: { in: reqIds } },
            include: {
              owner: {
                include: {
                  profile: true,
                  commitmentProfile: true,
                  verificationRecords: true,
                },
              },
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          });
        }
      } else {
        candidateRecords = await prisma.requirement.findMany({
          where: whereConditions,
          take: MATCH_CONFIG.candidateCap,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          include: {
            owner: {
              include: {
                profile: true,
                commitmentProfile: true,
                verificationRecords: true,
              },
            },
          },
        });
      }

      const scoredDTOs: RequirementDTO[] = candidateRecords.map((rec) => {
        const dto = mapToRequirementDTO(rec, requestingUserId);
        attachScore(dto, rec);
        return dto;
      });

      scoredDTOs.sort((a, b) => {
        const scoreA = a.score ?? -1;
        const scoreB = b.score ?? -1;
        if (scoreA !== scoreB) {
          return scoreB - scoreA;
        }
        return a.id.localeCompare(b.id);
      });

      let startIndex = 0;
      if (matchCursor) {
        const targetScore = matchCursor.score ?? -1;
        const targetId = matchCursor.id;
        const idx = scoredDTOs.findIndex((item) => {
          const itemScore = item.score ?? -1;
          if (itemScore < targetScore) return true;
          if (itemScore === targetScore && item.id.localeCompare(targetId) > 0) return true;
          return false;
        });
        startIndex = idx === -1 ? scoredDTOs.length : idx;
      }

      const pageItems = scoredDTOs.slice(startIndex, startIndex + limit);
      let nextCursor: string | null = null;
      if (startIndex + limit < scoredDTOs.length) {
        const lastItem = pageItems[pageItems.length - 1];
        nextCursor = encodeMatchCursor(lastItem.score ?? null, lastItem.id);
      }

      return { items: pageItems, nextCursor };
    }

    let recentCursor: RecentCursorPayload | null = null;
    if (params.cursor) {
      recentCursor = decodeCursor(params.cursor, 'recent') as RecentCursorPayload;
    }

    const cursorObj = recentCursor ? { createdAt: new Date(recentCursor.createdAt), id: recentCursor.id } : null;

    const whereConditions: Prisma.RequirementWhereInput = {
      status: RequirementStatus.ACTIVE,
      ownerId: { notIn: excludedOwnerIds },
      ...(canSeeVerifiedOnly ? {} : { visibility: Visibility.PUBLIC }),
      ...(params.skill ? { needSkill: params.skill } : {}),
      ...(params.stage ? { stage: params.stage } : {}),
      ...(params.commitment ? { commitment: params.commitment } : {}),
      ...(params.remote !== undefined ? { remote: params.remote } : {}),
      ...(params.location
        ? {
            location: {
              contains: params.location.replace(/[%_]/g, '\\$&'),
            },
          }
        : {}),
    };

    if (sanitizedQuery.length > 0 && sanitizedQuery.length < 3) {
      const escapedTerm = sanitizedQuery.replace(/[%_]/g, '\\$&');
      whereConditions.OR = [
        { title: { contains: escapedTerm } },
        { industry: { contains: escapedTerm } },
        { needSkill: { contains: escapedTerm } },
      ];
    }

    if (cursorObj) {
      whereConditions.AND = [
        {
          OR: [
            { createdAt: { lt: cursorObj.createdAt } },
            {
              createdAt: cursorObj.createdAt,
              id: { lt: cursorObj.id },
            },
          ],
        },
      ];
    }

    let records: any[] = [];

    if (sanitizedQuery.length >= 3) {
      const cursorClause = cursorObj
        ? Prisma.sql`AND (r.createdAt < ${cursorObj.createdAt} OR (r.createdAt = ${cursorObj.createdAt} AND r.id < ${cursorObj.id}))`
        : Prisma.empty;

      const skillClause = params.skill ? Prisma.sql`AND r.needSkill = ${params.skill}` : Prisma.empty;
      const stageClause = params.stage ? Prisma.sql`AND r.stage = ${params.stage}` : Prisma.empty;
      const commitmentClause = params.commitment ? Prisma.sql`AND r.commitment = ${params.commitment}` : Prisma.empty;
      const remoteClause = params.remote !== undefined ? Prisma.sql`AND r.remote = ${params.remote}` : Prisma.empty;
      const locationClause = params.location ? Prisma.sql`AND r.location LIKE ${`%${params.location.replace(/[%_]/g, '\\$&')}%`}` : Prisma.empty;
      const visibilityClause = canSeeVerifiedOnly ? Prisma.empty : Prisma.sql`AND r.visibility = 'PUBLIC'`;
      const excludedClause = excludedOwnerIds.length > 0
        ? Prisma.sql`AND r.ownerId NOT IN (${Prisma.join(excludedOwnerIds)})`
        : Prisma.empty;

      const rawResults = await prisma.$queryRaw<any[]>`
        SELECT r.id
        FROM requirements r
        WHERE r.status = 'ACTIVE'
        ${excludedClause}
        ${visibilityClause}
        ${skillClause}
        ${stageClause}
        ${commitmentClause}
        ${remoteClause}
        ${locationClause}
        AND MATCH(r.title, r.industry, r.needSkill) AGAINST (${sanitizedQuery} IN BOOLEAN MODE)
        ${cursorClause}
        ORDER BY r.createdAt DESC, r.id DESC
        LIMIT ${limit + 1};
      `;

      const reqIds = rawResults.map((row) => row.id);
      if (reqIds.length > 0) {
        records = await prisma.requirement.findMany({
          where: { id: { in: reqIds } },
          include: {
            owner: {
              include: {
                profile: true,
                commitmentProfile: true,
                verificationRecords: true,
              },
            },
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        });
      }
    } else {
      records = await prisma.requirement.findMany({
        where: whereConditions,
        take: limit + 1,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          owner: {
            include: {
              profile: true,
              commitmentProfile: true,
              verificationRecords: true,
            },
          },
        },
      });
    }

    let nextCursor: string | null = null;
    if (records.length > limit) {
      const nextItem = records[limit - 1];
      nextCursor = encodeRecentCursor(nextItem.createdAt, nextItem.id);
      records = records.slice(0, limit);
    }

    const items = records.map((rec) => {
      const dto = mapToRequirementDTO(rec, requestingUserId);
      attachScore(dto, rec);
      return dto;
    });

    return { items, nextCursor };
  }
}
