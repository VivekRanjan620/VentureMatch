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
  currentUsers: number;
  ownerContributes?: string | null;
  offer?: string | null;
  equityOfferMax?: number | null;
  commitment?: string | null;
  location?: string | null;
  remote: boolean;
  createdAt: string;
  status: string;
  visibility: string;
  startupName?: string | null;
  owner: {
    id: string;
    name: string;
    city?: string | null;
    badges: string[];
  };
  score?: number | null;
  breakdown?: any;
  reasons?: string[];
}
