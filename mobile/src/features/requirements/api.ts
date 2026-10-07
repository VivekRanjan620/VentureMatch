import { apiRequest } from '../../api/client';
import {
  RequirementSummaryItem,
  RequirementDetailItem,
  CreateRequirementPayload,
  RequirementStatusType,
  SentInterestItem,
  FilterState,
} from './types';

export interface BrowseParams extends FilterState {
  sort?: 'recent' | 'match';
  cursor?: string;
  limit?: number;
}

export interface BrowseResponse {
  requirements: RequirementSummaryItem[];
  nextCursor: string | null;
}

export const browseRequirementsApi = async (params: BrowseParams): Promise<BrowseResponse> => {
  const queryParts: string[] = [];

  if (params.q && params.q.trim().length >= 1) {
    queryParts.push(`q=${encodeURIComponent(params.q.trim())}`);
  }
  if (params.skill) {
    queryParts.push(`skill=${encodeURIComponent(params.skill)}`);
  }
  if (params.stage) {
    queryParts.push(`stage=${encodeURIComponent(params.stage)}`);
  }
  if (params.commitment) {
    queryParts.push(`commitment=${encodeURIComponent(params.commitment)}`);
  }
  if (params.location && params.location.trim().length > 0) {
    queryParts.push(`location=${encodeURIComponent(params.location.trim())}`);
  }
  if (typeof params.remote === 'boolean') {
    queryParts.push(`remote=${params.remote}`);
  }
  if (params.sort) {
    queryParts.push(`sort=${params.sort}`);
  }
  if (params.cursor) {
    queryParts.push(`cursor=${encodeURIComponent(params.cursor)}`);
  }
  if (params.limit) {
    queryParts.push(`limit=${params.limit}`);
  }

  const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  return apiRequest<BrowseResponse>(`/requirements${queryString}`, { method: 'GET' });
};

export const getRequirementByIdApi = async (id: string): Promise<{ requirement: RequirementDetailItem }> => {
  return apiRequest<{ requirement: RequirementDetailItem }>(`/requirements/${id}`, { method: 'GET' });
};

export const getMyRequirementsApi = async (): Promise<{ requirements: RequirementSummaryItem[] }> => {
  return apiRequest<{ requirements: RequirementSummaryItem[] }>('/requirements/mine', { method: 'GET' });
};

export const createRequirementApi = async (
  data: CreateRequirementPayload
): Promise<{ requirement: RequirementSummaryItem }> => {
  return apiRequest<{ requirement: RequirementSummaryItem }>('/requirements', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateRequirementStatusApi = async (
  id: string,
  status: RequirementStatusType
): Promise<{ requirement: RequirementSummaryItem }> => {
  return apiRequest<{ requirement: RequirementSummaryItem }>(`/requirements/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
};

export const expressInterestApi = async (requirementId: string): Promise<any> => {
  return apiRequest<any>(`/requirements/${requirementId}/interest`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
};

export const getSentInterestsApi = async (): Promise<{ interests: SentInterestItem[]; nextCursor: string | null }> => {
  return apiRequest<{ interests: SentInterestItem[]; nextCursor: string | null }>('/me/interests', {
    method: 'GET',
  });
};
