import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { Availability, CompensationPref } from '@prisma/client';

export interface UpdateProfileInput {
  name: string;
  city: string;
  ageRange?: string;
  industry: string;
  bio?: string;
  skills: string[];
  experienceYears: number;
  previousStartup?: boolean;
  currentWork?: string;
  shareablePhone?: string;
  shareableEmail?: string;
}

export interface UpdateCommitmentInput {
  hoursPerWeek: number;
  availability: Availability;
  minMonths: number;
  canInvestAmount?: number;
  contributes?: string[];
  equityExpectation: number;
  compensationPref: CompensationPref;
  remote?: boolean;
}

export const checkProfileComplete = (profile: any): boolean => {
  if (!profile) return false;
  const skillsArray = Array.isArray(profile.skills) ? profile.skills : [];
  return Boolean(
    profile.name &&
      profile.city &&
      profile.industry &&
      skillsArray.length > 0 &&
      profile.experienceYears !== null &&
      profile.experienceYears !== undefined,
  );
};

export const checkCommitmentComplete = (commitmentProfile: any): boolean => {
  if (!commitmentProfile) return false;
  return Boolean(
    commitmentProfile.hoursPerWeek !== null &&
      commitmentProfile.hoursPerWeek !== undefined &&
      commitmentProfile.availability &&
      commitmentProfile.minMonths !== null &&
      commitmentProfile.minMonths !== undefined &&
      commitmentProfile.compensationPref &&
      commitmentProfile.equityExpectation !== null &&
      commitmentProfile.equityExpectation !== undefined,
  );
};

export class UserService {
  static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        profile: true,
        commitmentProfile: true,
        verificationRecords: {
          select: {
            id: true,
            type: true,
            method: true,
            verifiedAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      throw AppError.notFound('User not found');
    }

    // Format verification records
    const formattedVerifications = user.verificationRecords.map((rec) => {
      if (rec.type === 'EMAIL') {
        return {
          id: rec.id,
          type: rec.type,
          status: 'unverified' as const,
          method: rec.method,
          verifiedAt: rec.verifiedAt ?? null,
        };
      } else if (rec.type === 'LINKEDIN') {
        return {
          id: rec.id,
          type: rec.type,
          status: 'linked' as const,
          method: rec.method,
          verifiedAt: null,
          linkedAt: rec.createdAt,
        };
      }
      return {
        id: rec.id,
        type: rec.type,
        status: 'unverified' as const,
        method: rec.method,
        verifiedAt: rec.verifiedAt ?? null,
      };
    });

    // Format commitment profile decimal
    const formattedCommitment = user.commitmentProfile
      ? {
          ...user.commitmentProfile,
          canInvestAmount: user.commitmentProfile.canInvestAmount
            ? Number(user.commitmentProfile.canInvestAmount)
            : null,
        }
      : null;

    const profileComplete = checkProfileComplete(user.profile);
    const commitmentComplete = checkCommitmentComplete(user.commitmentProfile);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        profile: user.profile,
        commitmentProfile: formattedCommitment,
        verificationRecords: formattedVerifications,
        profileComplete,
        commitmentComplete,
      },
    };
  }

  static async updateProfile(userId: string, data: UpdateProfileInput) {
    const normalizedPhone = data.shareablePhone ? data.shareablePhone.replace(/[\s\-()]/g, '') : undefined;

    const profile = await prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        name: data.name,
        city: data.city,
        ageRange: data.ageRange,
        industry: data.industry,
        bio: data.bio,
        skills: data.skills,
        experienceYears: data.experienceYears,
        previousStartup: data.previousStartup ?? false,
        currentWork: data.currentWork,
        shareablePhone: normalizedPhone,
        shareableEmail: data.shareableEmail,
      },
      update: {
        name: data.name,
        city: data.city,
        ageRange: data.ageRange,
        industry: data.industry,
        bio: data.bio,
        skills: data.skills,
        experienceYears: data.experienceYears,
        previousStartup: data.previousStartup ?? false,
        currentWork: data.currentWork,
        shareablePhone: normalizedPhone,
        shareableEmail: data.shareableEmail,
      },
    });

    return profile;
  }

  static async getCommitment(userId: string) {
    const commitment = await prisma.commitmentProfile.findUnique({
      where: { userId },
    });

    if (!commitment) {
      return null;
    }

    return {
      ...commitment,
      canInvestAmount: commitment.canInvestAmount ? Number(commitment.canInvestAmount) : null,
    };
  }

  static async updateCommitment(userId: string, data: UpdateCommitmentInput) {
    const commitment = await prisma.commitmentProfile.upsert({
      where: { userId },
      create: {
        userId,
        hoursPerWeek: data.hoursPerWeek,
        availability: data.availability,
        minMonths: data.minMonths,
        canInvestAmount: data.canInvestAmount,
        contributes: data.contributes,
        equityExpectation: data.equityExpectation,
        compensationPref: data.compensationPref,
        remote: data.remote ?? true,
      },
      update: {
        hoursPerWeek: data.hoursPerWeek,
        availability: data.availability,
        minMonths: data.minMonths,
        canInvestAmount: data.canInvestAmount,
        contributes: data.contributes,
        equityExpectation: data.equityExpectation,
        compensationPref: data.compensationPref,
        remote: data.remote ?? true,
      },
    });

    return {
      ...commitment,
      canInvestAmount: commitment.canInvestAmount ? Number(commitment.canInvestAmount) : null,
    };
  }

  static async addLinkedinVerification(userId: string, linkedinUrl: string) {
    const record = await prisma.verificationRecord.create({
      data: {
        userId,
        type: 'LINKEDIN',
        method: 'linked-only',
      },
    });

    return {
      id: record.id,
      type: record.type,
      status: 'linked' as const,
      method: record.method,
      linkedinUrl,
      verifiedAt: null,
      linkedAt: record.createdAt,
    };
  }
}
