export type UserRole = 'FOUNDER' | 'SEEKER' | 'BOTH';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  profile?: any;
  commitmentProfile?: any;
  verificationRecords?: any[];
  profileComplete?: boolean;
  commitmentComplete?: boolean;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: Tokens;
}

export interface RefreshResponse {
  tokens: Tokens;
}

export interface GetMeResponse {
  user: User;
}

export interface RequirementSummary {
  id: string;
  title: string;
  needSkill: string;
  industry: string;
  stage: string;
  currentUsers?: number | null;
  ownerContributes?: string | null;
  offer?: string | null;
  equityOfferMax?: number | null;
  commitment?: string | null;
  location?: string | null;
  remote?: boolean | null;
  createdAt: string;
  status: string;
  visibility: string;
  startupName?: string | null;
  owner: {
    id: string;
    name?: string | null;
    city?: string | null;
    badges?: string[] | null;
  };
  score?: number | null;
  breakdown?: Record<string, unknown> | null;
  reasons?: string[] | null;
}

export type InterestStatusType = 'PENDING' | 'ACCEPTED' | 'LATER' | 'DECLINED' | 'WITHDRAWN';
export type InterestActionType = 'accept' | 'later' | 'decline' | 'withdraw';

export interface CandidateCommitmentSnapshot {
  hoursPerWeek?: number | null;
  availability?: string | null;
  minMonths?: number | null;
  canInvestAmount?: number | null;
  compensationPref?: string | null;
  equityExpectation?: number | null;
  remote?: boolean | null;
}

export interface CandidateSubset {
  id: string;
  name?: string | null;
  city?: string | null;
  industry?: string | null;
  skills?: string[] | null;
  experienceYears?: number | null;
  previousStartup?: boolean | null;
  badges?: string[] | null;
  commitment?: CandidateCommitmentSnapshot | null;
}

export interface ReceivedInterestItem {
  id: string;
  status: InterestStatusType;
  createdAt: string;
  score?: number | null;
  breakdown?: Record<string, unknown> | null;
  reasons?: string[] | null;
  connectionId?: string | null;
  requirement: {
    id: string;
    title: string;
    status: string;
  };
  candidate: CandidateSubset;
}

export interface SentInterestItem {
  id: string;
  status: InterestStatusType;
  createdAt: string;
  score?: number | null;
  breakdown?: Record<string, unknown> | null;
  reasons?: string[] | null;
  connectionId?: string | null;
  requirement: RequirementSummary | {
    id: string;
    title: string;
    status: string;
  };
  requirementId?: string;
}

export interface ConnectionItem {
  id: string;
  createdAt: string;
  requirement: {
    id: string;
    title: string;
  };
  otherUser: {
    id: string;
    name?: string | null;
    city?: string | null;
    industry?: string | null;
    skills?: string[] | null;
    badges?: string[] | null;
    shareablePhone?: string;
    shareableEmail?: string;
  };
  iHaveShared: boolean;
  theyHaveShared: boolean;
  conversationId?: string;
}

export interface ConnectionDetailItem extends ConnectionItem {
  otherUser: ConnectionItem['otherUser'] & {
    shareablePhone?: string;
    shareableEmail?: string;
  };
}

export interface MeCountsResponse {
  pendingReceivedInterests: number;
  connections: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
}
