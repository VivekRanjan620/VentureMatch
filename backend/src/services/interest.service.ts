import { Prisma, InterestStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { getDailyInterestCap } from '../config/env';
import { checkProfileComplete, checkCommitmentComplete } from './user.service';
import { score, parseSkillsArray } from './matching.service';
import { mapToRequirementDTO, decodeCursor, encodeRecentCursor, RecentCursorPayload } from './requirement.service';
import { InterestAction, ActorRole, validateTransition, INTEREST_TRANSITION_MATRIX } from '../config/interestTransitions';

export interface InterestDTO {
  id: string;
  status: InterestStatus;
  createdAt: string;
  score: number | null;
  breakdown: any;
  reasons: string[];
  connectionId?: string | null;
  candidate?: {
    id: string;
    name: string;
    city: string | null;
    industry: string | null;
    skills: string[];
    experienceYears: number | null;
    previousStartup: boolean;
    badges: string[];
    commitment: {
      hoursPerWeek: number | null;
      availability: string | null;
      minMonths: number | null;
      canInvestAmount: number | null;
      compensationPref: string | null;
      equityExpectation: number | null;
      remote: boolean;
    } | null;
  };
  requirement?: any;
}

export class InterestService {
  static async createInterest(candidateId: string, requirementId: string): Promise<InterestDTO> {
    const candidate = await prisma.user.findUnique({
      where: { id: candidateId },
      include: {
        profile: true,
        commitmentProfile: true,
        verificationRecords: true,
      },
    });

    if (!candidate || !checkProfileComplete(candidate.profile) || !checkCommitmentComplete(candidate.commitmentProfile)) {
      throw AppError.forbidden('Complete your profile and commitment before expressing interest');
    }

    const requirement = await prisma.requirement.findUnique({
      where: { id: requirementId },
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

    if (!requirement || requirement.status !== 'ACTIVE') {
      throw AppError.notFound('Requirement not found');
    }

    if (requirement.ownerId === candidateId) {
      throw AppError.forbidden('Cannot express interest in your own requirement');
    }

    if (requirement.visibility === 'VERIFIED_ONLY') {
      const candidateVerifications = candidate.verificationRecords.filter((v) => v.type === 'LINKEDIN' || v.type === 'PHONE');
      if (candidateVerifications.length === 0) {
        throw AppError.notFound('Requirement not found');
      }
    }

    const block = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: candidateId, blockedId: requirement.ownerId },
          { blockerId: requirement.ownerId, blockedId: candidateId },
        ],
      },
    });

    if (block) {
      throw AppError.notFound('Requirement not found');
    }

    const cap = getDailyInterestCap();
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const interestsSentIn24h = await prisma.interest.count({
      where: {
        candidateId,
        createdAt: { gte: last24h },
      },
    });

    if (interestsSentIn24h >= cap) {
      throw AppError.rateLimitReached(`Daily interest cap reached (max ${cap} per 24 hours)`);
    }

    const scoreRes = score(
      {
        profile: candidate.profile,
        commitment: candidate.commitmentProfile,
      },
      {
        needSkill: requirement.needSkill,
        industry: requirement.industry,
        stage: requirement.stage,
        equityOfferMax: requirement.equityOfferMax,
        commitment: requirement.commitment,
        location: requirement.location,
        remote: requirement.remote,
      },
      {
        profile: requirement.owner.profile,
        commitment: requirement.owner.commitmentProfile,
      },
    );

    try {
      const created = await prisma.interest.create({
        data: {
          requirementId,
          candidateId,
          status: 'PENDING',
          score: scoreRes.score,
          breakdown: {
            components: scoreRes.breakdown,
            reasons: scoreRes.reasons,
          } as Prisma.InputJsonObject,
        },
      });

      return {
        id: created.id,
        status: created.status,
        createdAt: created.createdAt.toISOString(),
        score: created.score,
        breakdown: scoreRes.breakdown,
        reasons: scoreRes.reasons,
      };
    } catch (err: unknown) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw AppError.conflict('Interest already submitted for this requirement');
      }
      throw err;
    }
  }

  static async getRequirementInterests(
    ownerId: string,
    requirementId: string,
    params: { status?: string; cursor?: string; limit?: number },
  ): Promise<{ items: InterestDTO[]; nextCursor: string | null }> {
    const limit = Math.min(Math.max(params.limit || 20, 1), 50);

    const requirement = await prisma.requirement.findUnique({
      where: { id: requirementId },
    });

    if (!requirement || requirement.ownerId !== ownerId) {
      throw AppError.notFound('Requirement not found');
    }

    const blocks = await prisma.block.findMany({
      where: {
        OR: [{ blockerId: ownerId }, { blockedId: ownerId }],
      },
    });
    const blockedCandidateIds = new Set<string>();
    for (const b of blocks) {
      if (b.blockerId === ownerId) blockedCandidateIds.add(b.blockedId);
      if (b.blockedId === ownerId) blockedCandidateIds.add(b.blockerId);
    }

    let recentCursor: RecentCursorPayload | null = null;
    if (params.cursor) {
      recentCursor = decodeCursor(params.cursor, 'recent') as RecentCursorPayload;
    }
    const cursorObj = recentCursor ? { createdAt: new Date(recentCursor.createdAt), id: recentCursor.id } : null;

    const whereConditions: Prisma.InterestWhereInput = {
      requirementId,
      candidateId: { notIn: Array.from(blockedCandidateIds) },
      ...(params.status ? { status: params.status as InterestStatus } : {}),
      ...(cursorObj
        ? {
            OR: [
              { createdAt: { lt: cursorObj.createdAt } },
              { createdAt: cursorObj.createdAt, id: { lt: cursorObj.id } },
            ],
          }
        : {}),
    };

    let records = await prisma.interest.findMany({
      where: whereConditions,
      take: limit + 1,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        candidate: {
          include: {
            profile: true,
            commitmentProfile: true,
            verificationRecords: true,
          },
        },
      },
    });

    let nextCursor: string | null = null;
    if (records.length > limit) {
      const nextItem = records[limit - 1];
      nextCursor = encodeRecentCursor(nextItem.createdAt, nextItem.id);
      records = records.slice(0, limit);
    }

    const items: InterestDTO[] = records.map((item) => {
      const cand: any = item.candidate || {};
      const candProfile: any = cand.profile || {};
      const candCommitment: any = cand.commitmentProfile || null;
      const verifications: any[] = cand.verificationRecords || [];

      const badges: string[] = [];
      for (const v of verifications) {
        if (v.type === 'EMAIL') badges.push('EMAIL_DECLARED');
        if (v.type === 'LINKEDIN') badges.push('LINKEDIN_LINKED');
        if (v.type === 'PHONE') badges.push('PHONE_LINKED');
      }

      const bd: any = item.breakdown || {};

      return {
        id: item.id,
        status: item.status,
        createdAt: item.createdAt.toISOString(),
        score: item.score,
        breakdown: bd.components || bd || null,
        reasons: bd.reasons || [],
        candidate: {
          id: cand.id,
          name: candProfile.name || 'Anonymous Candidate',
          city: candProfile.city || null,
          industry: candProfile.industry || null,
          skills: parseSkillsArray(candProfile.skills),
          experienceYears: candProfile.experienceYears ?? null,
          previousStartup: candProfile.previousStartup ?? false,
          badges,
          commitment: candCommitment
            ? {
                hoursPerWeek: candCommitment.hoursPerWeek ?? null,
                availability: candCommitment.availability || null,
                minMonths: candCommitment.minMonths ?? null,
                canInvestAmount: candCommitment.canInvestAmount ? Number(candCommitment.canInvestAmount) : null,
                compensationPref: candCommitment.compensationPref || null,
                equityExpectation: candCommitment.equityExpectation ?? null,
                remote: candCommitment.remote ?? true,
              }
            : null,
        },
      };
    });

    return { items, nextCursor };
  }

  static async getReceivedInterests(
    ownerId: string,
    params: { status?: string; requirementId?: string; cursor?: string; limit?: number },
  ): Promise<{ items: InterestDTO[]; nextCursor: string | null }> {
    const limit = Math.min(Math.max(params.limit || 20, 1), 50);

    if (params.requirementId) {
      const req = await prisma.requirement.findUnique({
        where: { id: params.requirementId },
        select: { ownerId: true },
      });
      if (!req || req.ownerId !== ownerId) {
        return { items: [], nextCursor: null };
      }
    }

    const blocks = await prisma.block.findMany({
      where: {
        OR: [{ blockerId: ownerId }, { blockedId: ownerId }],
      },
    });
    const blockedCandidateIds = new Set<string>();
    for (const b of blocks) {
      if (b.blockerId === ownerId) blockedCandidateIds.add(b.blockedId);
      if (b.blockedId === ownerId) blockedCandidateIds.add(b.blockerId);
    }

    let recentCursor: RecentCursorPayload | null = null;
    if (params.cursor) {
      recentCursor = decodeCursor(params.cursor, 'recent') as RecentCursorPayload;
    }
    const cursorObj = recentCursor ? { createdAt: new Date(recentCursor.createdAt), id: recentCursor.id } : null;

    const whereConditions: Prisma.InterestWhereInput = {
      requirement: {
        ownerId,
        ...(params.requirementId ? { id: params.requirementId } : {}),
      },
      candidateId: { notIn: Array.from(blockedCandidateIds) },
      ...(params.status ? { status: params.status as InterestStatus } : {}),
      ...(cursorObj
        ? {
            OR: [
              { createdAt: { lt: cursorObj.createdAt } },
              { createdAt: cursorObj.createdAt, id: { lt: cursorObj.id } },
            ],
          }
        : {}),
    };

    let records = await prisma.interest.findMany({
      where: whereConditions,
      take: limit + 1,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        status: true,
        createdAt: true,
        score: true,
        breakdown: true,
        connection: {
          select: {
            id: true,
          },
        },
        requirement: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        candidate: {
          select: {
            id: true,
            profile: {
              select: {
                name: true,
                city: true,
                industry: true,
                skills: true,
                experienceYears: true,
                previousStartup: true,
              },
            },
            commitmentProfile: {
              select: {
                hoursPerWeek: true,
                availability: true,
                minMonths: true,
                canInvestAmount: true,
                compensationPref: true,
                equityExpectation: true,
                remote: true,
              },
            },
            verificationRecords: {
              select: {
                type: true,
              },
            },
          },
        },
      },
    });

    let nextCursor: string | null = null;
    if (records.length > limit) {
      const nextItem = records[limit - 1];
      nextCursor = encodeRecentCursor(nextItem.createdAt, nextItem.id);
      records = records.slice(0, limit);
    }

    const items: InterestDTO[] = records.map((item) => {
      const cand: any = item.candidate || {};
      const candProfile: any = cand.profile || {};
      const candCommitment: any = cand.commitmentProfile || null;
      const verifications: any[] = cand.verificationRecords || [];

      const badges: string[] = [];
      for (const v of verifications) {
        if (v.type === 'EMAIL') badges.push('EMAIL_DECLARED');
        if (v.type === 'LINKEDIN') badges.push('LINKEDIN_LINKED');
        if (v.type === 'PHONE') badges.push('PHONE_LINKED');
      }

      const bd: any = item.breakdown || {};

      return {
        id: item.id,
        status: item.status,
        createdAt: item.createdAt.toISOString(),
        score: item.score,
        breakdown: bd.components || bd || null,
        reasons: bd.reasons || [],
        connectionId: item.status === 'ACCEPTED' ? (item.connection?.id ?? null) : null,
        requirement: {
          id: item.requirement.id,
          title: item.requirement.title,
          status: item.requirement.status,
        },
        candidate: {
          id: cand.id,
          name: candProfile.name || 'Anonymous Candidate',
          city: candProfile.city || null,
          industry: candProfile.industry || null,
          skills: parseSkillsArray(candProfile.skills),
          experienceYears: candProfile.experienceYears ?? null,
          previousStartup: candProfile.previousStartup ?? false,
          badges,
          commitment: candCommitment
            ? {
                hoursPerWeek: candCommitment.hoursPerWeek ?? null,
                availability: candCommitment.availability || null,
                minMonths: candCommitment.minMonths ?? null,
                canInvestAmount: candCommitment.canInvestAmount ? Number(candCommitment.canInvestAmount) : null,
                compensationPref: candCommitment.compensationPref || null,
                equityExpectation: candCommitment.equityExpectation ?? null,
                remote: candCommitment.remote ?? true,
              }
            : null,
        },
      };
    });

    return { items, nextCursor };
  }

  static async getMyInterests(
    candidateId: string,
    params: { status?: string; cursor?: string; limit?: number },
  ): Promise<{ items: InterestDTO[]; nextCursor: string | null }> {
    const limit = Math.min(Math.max(params.limit || 20, 1), 50);

    const blocks = await prisma.block.findMany({
      where: {
        OR: [{ blockerId: candidateId }, { blockedId: candidateId }],
      },
    });
    const blockedOwnerIds = new Set<string>();
    for (const b of blocks) {
      if (b.blockerId === candidateId) blockedOwnerIds.add(b.blockedId);
      if (b.blockedId === candidateId) blockedOwnerIds.add(b.blockerId);
    }

    let recentCursor: RecentCursorPayload | null = null;
    if (params.cursor) {
      recentCursor = decodeCursor(params.cursor, 'recent') as RecentCursorPayload;
    }
    const cursorObj = recentCursor ? { createdAt: new Date(recentCursor.createdAt), id: recentCursor.id } : null;

    const whereConditions: Prisma.InterestWhereInput = {
      candidateId,
      requirement: {
        ownerId: { notIn: Array.from(blockedOwnerIds) },
      },
      ...(params.status ? { status: params.status as InterestStatus } : {}),
      ...(cursorObj
        ? {
            OR: [
              { createdAt: { lt: cursorObj.createdAt } },
              { createdAt: cursorObj.createdAt, id: { lt: cursorObj.id } },
            ],
          }
        : {}),
    };

    let records = await prisma.interest.findMany({
      where: whereConditions,
      take: limit + 1,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        connection: {
          select: {
            id: true,
          },
        },
        requirement: {
          include: {
            owner: {
              include: {
                profile: true,
                verificationRecords: true,
              },
            },
          },
        },
      },
    });

    let nextCursor: string | null = null;
    if (records.length > limit) {
      const nextItem = records[limit - 1];
      nextCursor = encodeRecentCursor(nextItem.createdAt, nextItem.id);
      records = records.slice(0, limit);
    }

    const items: InterestDTO[] = records.map((item) => {
      const bd: any = item.breakdown || {};
      const reqDTO = mapToRequirementDTO(item.requirement, candidateId);
      reqDTO.score = item.score;
      reqDTO.breakdown = bd.components || bd || null;
      reqDTO.reasons = bd.reasons || [];

      return {
        id: item.id,
        status: item.status,
        createdAt: item.createdAt.toISOString(),
        score: item.score,
        breakdown: bd.components || bd || null,
        reasons: bd.reasons || [],
        connectionId: item.status === 'ACCEPTED' ? (item.connection?.id ?? null) : null,
        requirement: reqDTO,
      };
    });

    return { items, nextCursor };
  }

  static async updateStatus(
    requestingUserId: string,
    interestId: string,
    action: InterestAction,
  ): Promise<{ interest: InterestDTO; connection?: Record<string, unknown> | null }> {
    const interest = await prisma.interest.findUnique({
      where: { id: interestId },
      include: {
        requirement: true,
        candidate: true,
      },
    });

    if (!interest) {
      throw AppError.notFound('Interest not found');
    }

    const block = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: requestingUserId, blockedId: interest.candidateId },
          { blockerId: requestingUserId, blockedId: interest.requirement.ownerId },
          { blockerId: interest.candidateId, blockedId: requestingUserId },
          { blockerId: interest.requirement.ownerId, blockedId: requestingUserId },
        ],
      },
    });

    if (block) {
      throw AppError.notFound('Interest not found');
    }

    const isOwner = interest.requirement.ownerId === requestingUserId;
    const isCandidate = interest.candidateId === requestingUserId;

    if (!isOwner && !isCandidate) {
      throw AppError.notFound('Interest not found');
    }

    const actorRole: ActorRole = isOwner ? 'owner' : 'candidate';
    const validation = validateTransition(interest.status, action, actorRole);

    if (!validation.valid) {
      const rule = INTEREST_TRANSITION_MATRIX[action];
      if (rule && rule.allowedActor !== actorRole) {
        throw AppError.forbidden(validation.reason);
      }
      throw AppError.invalidTransition(validation.reason);
    }

    if (action === 'accept' && interest.requirement.status === 'CLOSED') {
      throw AppError.conflict('Cannot accept interest for a CLOSED requirement');
    }

    const targetStatus = validation.targetStatus!;
    const fromStatuses = INTEREST_TRANSITION_MATRIX[action].fromStatus;

    const result = await prisma.$transaction(async (tx) => {
      const updateRes = await tx.interest.updateMany({
        where: {
          id: interestId,
          status: { in: fromStatuses },
        },
        data: {
          status: targetStatus,
        },
      });

      if (updateRes.count !== 1) {
        throw AppError.invalidTransition('Invalid status transition');
      }

      let connection = null;
      if (action === 'accept') {
        connection = await tx.connection.create({
          data: {
            userAId: interest.requirement.ownerId,
            userBId: interest.candidateId,
            interestId: interest.id,
            contactSharedA: false,
            contactSharedB: false,
            conversation: {
              create: {},
            },
          },
          include: {
            conversation: true,
          },
        });
      }

      const updatedInterest = await tx.interest.findUnique({
        where: { id: interestId },
      });

      return { interest: updatedInterest!, connection };
    });

    const bd = result.interest.breakdown as Record<string, unknown> | null;
    const interestDTO: InterestDTO = {
      id: result.interest.id,
      status: result.interest.status,
      createdAt: result.interest.createdAt.toISOString(),
      score: result.interest.score,
      breakdown: bd ? ((bd.components as Record<string, unknown>) || bd) : null,
      reasons: Array.isArray(bd?.reasons) ? (bd.reasons as string[]) : [],
    };

    return { interest: interestDTO, connection: result.connection };
  }
}
