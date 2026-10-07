import { UserRole } from '../../api/types';
import { SkillType, AvailabilityType, CompensationType } from '../profile/types';

export type StageType = 'IDEA' | 'MVP' | 'EARLY_TRACTION' | 'GROWTH';
export type VisibilityType = 'PUBLIC' | 'VERIFIED_ONLY';
export type RequirementStatusType = 'ACTIVE' | 'PAUSED' | 'CLOSED';
export type InterestStatusType = 'PENDING' | 'ACCEPTED' | 'LATER' | 'DECLINED' | 'WITHDRAWN';

export interface ScoreBreakdown {
  skillComplement?: number;
  requirementFit?: number;
  commitment?: number;
  industryExperience?: number;
  stage?: number;
  equityCompensation?: number;
  location?: number;
  preferences?: number;
}

export interface RequirementSummaryItem {
  id: string;
  title: string;
  needSkill: SkillType;
  industry: string;
  stage: StageType;
  currentUsers: number;
  ownerContributes?: string | null;
  offer?: string | null;
  equityOfferMax?: number | null;
  commitment?: AvailabilityType | null;
  location?: string | null;
  remote: boolean;
  createdAt: string;
  status: RequirementStatusType;
  visibility: VisibilityType;
  startupName?: string | null;
  owner: {
    id: string;
    name: string;
    city?: string | null;
    badges: string[];
  };
  score?: number | null;
  breakdown?: ScoreBreakdown;
  reasons?: string[];
}

export interface RequirementDetailItem extends RequirementSummaryItem {
  startupNamePublic?: boolean;
}

export interface FilterState {
  q?: string;
  skill?: SkillType;
  stage?: StageType;
  commitment?: AvailabilityType;
  location?: string;
  remote?: boolean;
}

export interface CreateRequirementPayload {
  title: string;
  needSkill: SkillType;
  startupName?: string;
  startupNamePublic?: boolean;
  industry: string;
  stage: StageType;
  currentUsers?: number;
  ownerContributes?: string;
  offer?: string;
  equityOfferMax?: number;
  commitment: AvailabilityType;
  location?: string;
  remote?: boolean;
  visibility?: VisibilityType;
}

export interface UpdateRequirementPayload {
  title?: string;
  needSkill?: SkillType;
  startupName?: string;
  startupNamePublic?: boolean;
  industry?: string;
  stage?: StageType;
  currentUsers?: number;
  ownerContributes?: string;
  offer?: string;
  equityOfferMax?: number;
  commitment?: AvailabilityType;
  location?: string;
  remote?: boolean;
  visibility?: VisibilityType;
  status?: RequirementStatusType;
}

export interface SentInterestItem {
  id: string;
  requirementId: string;
  status: InterestStatusType;
  score?: number | null;
  breakdown?: ScoreBreakdown | null;
  reasons?: string[];
  createdAt: string;
  requirement: RequirementSummaryItem;
}
