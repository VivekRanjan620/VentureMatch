import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { checkProfileComplete } from './user.service';
import { Availability, Visibility, RequirementStatus } from '@prisma/client';

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
}

// Map Prisma Requirement + Owner model into a safe DTO
export const mapToRequirementDTO = (reqRecord: any): RequirementDTO => {
  const owner = reqRecord.owner || {};
  const ownerProfile = owner.profile || {};
  const verifications = owner.verificationRecords || [];

  const badges: string[] = [];
  for (const v of verifications) {
    if (v.type === 'EMAIL') badges.push('EMAIL_DECLARED');
    if (v.type === 'LINKEDIN') badges.push('LINKEDIN_LINKED');
    if (v.type === 'PHONE') badges.push('PHONE_LINKED');
  }

  const dto: RequirementDTO = {
    id: reqRecord.id,
    title: reqRecord.title,
    needSkill: reqRecord.needSkill,
    industry: reqRecord.industry,
    stage: reqRecord.stage,
    currentUsers: reqRecord.currentUsers,
    ownerContributes: reqRecord.ownerContributes || null,
    offer: reqRecord.offer || null,
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

  if (reqRecord.startupNamePublic) {
    dto.startupName = reqRecord.startupName || null;
  }

  return dto;
};

// Helper to encode/decode opaque base64 cursor
export const encodeCursor = (createdAt: Date | string, id: string): string => {
  const isoStr = createdAt instanceof Date ? createdAt.toISOString() : new Date(createdAt).toISOString();
  const payload = JSON.stringify({ createdAt: isoStr, id });
  return Buffer.from(payload, 'utf-8').toString('base64');
};

export const decodeCursor = (cursorStr: string): { createdAt: Date; id: string } => {
  try {
    const jsonStr = Buffer.from(cursorStr, 'base64').toString('utf-8');
    const parsed = JSON.parse(jsonStr);
    if (!parsed.createdAt || !parsed.id || isNaN(Date.parse(parsed.createdAt))) {
      throw new Error();
    }
    return { createdAt: new Date(parsed.createdAt), id: parsed.id };
  } catch (_e) {
    throw AppError.badRequest('Invalid cursor format');
  }
};

// Helper to sanitize search input (strips boolean mode operators)
export const sanitizeSearchQuery = (q: string): string => {
  return q.replace(/[+\-<>(){}~*"@]/g, ' ').trim();
};

export class RequirementService {
  static async createRequirement(userId: string, data: CreateRequirementInput): Promise<RequirementDTO> {
    // Check if user's profile is complete
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
            verificationRecords: true,
          },
        },
      },
    });

    return mapToRequirementDTO(created);
  }

  static async getMyRequirements(userId: string): Promise<RequirementDTO[]> {
    const list = await prisma.requirement.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          include: {
            profile: true,
            verificationRecords: true,
          },
        },
      },
    });

    return list.map(mapToRequirementDTO);
  }

  static async getRequirementById(id: string, requestingUserId: string): Promise<RequirementDTO> {
    const req = await prisma.requirement.findUnique({
      where: { id },
      include: {
        owner: {
          include: {
            profile: true,
            verificationRecords: true,
          },
        },
      },
    });

    if (!req) {
      throw AppError.notFound('Requirement not found');
    }

    // Block check (bidirectional)
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

    // Rule 1: GET /requirements/:id for PAUSED/CLOSED returns 404 to non-owner
    if (!isOwner && req.status !== RequirementStatus.ACTIVE) {
      throw AppError.notFound('Requirement not found');
    }

    // Rule 3: VERIFIED_ONLY requirement returns 403 if requester has no LINKEDIN or PHONE verification
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

    return mapToRequirementDTO(req);
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

    // Rule 6: CLOSED requirements cannot be reopened
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
            verificationRecords: true,
          },
        },
      },
    });

    return mapToRequirementDTO(updated);
  }

  static async browseRequirements(
    requestingUserId: string,
    params: BrowseQueryParams,
  ): Promise<{ items: RequirementDTO[]; nextCursor: string | null }> {
    const limit = Math.min(Math.max(params.limit || 20, 1), 50);

    // 1. Check requester verification for VERIFIED_ONLY access
    const requesterVerifications = await prisma.verificationRecord.findMany({
      where: {
        userId: requestingUserId,
        type: { in: ['LINKEDIN', 'PHONE'] },
      },
    });
    const canSeeVerifiedOnly = requesterVerifications.length > 0;

    // 2. Fetch bidirectional block user IDs
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
    excludedOwnerIds.push(requestingUserId); // Exclude caller's own requirements

    // 3. Decode cursor if provided
    let cursorObj: { createdAt: Date; id: string } | null = null;
    if (params.cursor) {
      cursorObj = decodeCursor(params.cursor);
    }

    // Prepare filter clauses
    const rawSearch = params.q ? params.q.trim() : '';
    const sanitizedQuery = sanitizeSearchQuery(rawSearch);

    // Standard Prisma criteria
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

    // If search term length < 3, use LIKE filter in Prisma
    if (sanitizedQuery.length > 0 && sanitizedQuery.length < 3) {
      const escapedTerm = sanitizedQuery.replace(/[%_]/g, '\\$&');
      whereConditions.OR = [
        { title: { contains: escapedTerm } },
        { industry: { contains: escapedTerm } },
        { needSkill: { contains: escapedTerm } },
      ];
    }

    // Cursor pagination condition
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

    // Search >= 3 characters: Use MySQL FULLTEXT search via prisma.$queryRaw
    if (sanitizedQuery.length >= 3) {
      // Build raw query for FULLTEXT with parameterized inputs
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

      // FULLTEXT search using boolean mode
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
                verificationRecords: true,
              },
            },
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        });
      }
    } else {
      // Standard Prisma findMany (for no-search OR short-term LIKE search)
      records = await prisma.requirement.findMany({
        where: whereConditions,
        take: limit + 1,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          owner: {
            include: {
              profile: true,
              verificationRecords: true,
            },
          },
        },
      });
    }

    let nextCursor: string | null = null;
    if (records.length > limit) {
      const nextItem = records[limit - 1];
      nextCursor = encodeCursor(nextItem.createdAt, nextItem.id);
      records = records.slice(0, limit);
    }

    const items = records.map(mapToRequirementDTO);

    return { items, nextCursor };
  }
}
