import { apiRequest } from './client';
import {
  ReceivedInterestItem,
  SentInterestItem,
  ConnectionItem,
  ConnectionDetailItem,
  MeCountsResponse,
  PaginatedResponse,
  InterestActionType,
  InterestStatusType,
} from './types';

export interface GetReceivedParams {
  status?: InterestStatusType;
  requirementId?: string;
  cursor?: string;
  limit?: number;
}

export interface GetSentParams {
  status?: InterestStatusType;
  cursor?: string;
  limit?: number;
}

export interface GetConnectionsParams {
  cursor?: string;
  limit?: number;
}

export const getReceivedInterestsApi = async (
  params: GetReceivedParams = {}
): Promise<PaginatedResponse<ReceivedInterestItem>> => {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.append('status', params.status);
  if (params.requirementId) searchParams.append('requirementId', params.requirementId);
  if (params.cursor) searchParams.append('cursor', params.cursor);
  if (params.limit) searchParams.append('limit', String(params.limit));

  const query = searchParams.toString();
  const endpoint = `/me/received-interests${query ? `?${query}` : ''}`;
  return apiRequest<PaginatedResponse<ReceivedInterestItem>>(endpoint, { method: 'GET' });
};

export const getSentInterestsListApi = async (
  params: GetSentParams = {}
): Promise<PaginatedResponse<SentInterestItem>> => {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.append('status', params.status);
  if (params.cursor) searchParams.append('cursor', params.cursor);
  if (params.limit) searchParams.append('limit', String(params.limit));

  const query = searchParams.toString();
  const endpoint = `/me/interests${query ? `?${query}` : ''}`;
  return apiRequest<PaginatedResponse<SentInterestItem>>(endpoint, { method: 'GET' });
};

export const updateInterestStatusApi = async (
  id: string,
  action: InterestActionType
): Promise<{ interest: ReceivedInterestItem | SentInterestItem; connection?: ConnectionItem }> => {
  return apiRequest<{ interest: ReceivedInterestItem | SentInterestItem; connection?: ConnectionItem }>(
    `/interests/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ action }),
    }
  );
};

export const getConnectionsApi = async (
  params: GetConnectionsParams = {}
): Promise<PaginatedResponse<ConnectionItem>> => {
  const searchParams = new URLSearchParams();
  if (params.cursor) searchParams.append('cursor', params.cursor);
  if (params.limit) searchParams.append('limit', String(params.limit));

  const query = searchParams.toString();
  const endpoint = `/connections${query ? `?${query}` : ''}`;
  return apiRequest<PaginatedResponse<ConnectionItem>>(endpoint, { method: 'GET' });
};

export const getConnectionDetailApi = async (id: string): Promise<ConnectionDetailItem> => {
  return apiRequest<ConnectionDetailItem>(`/connections/${id}`, { method: 'GET' });
};

export const shareContactApi = async (
  id: string
): Promise<{ success: boolean; connection: ConnectionDetailItem }> => {
  return apiRequest<{ success: boolean; connection: ConnectionDetailItem }>(
    `/connections/${id}/share-contact`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    }
  );
};

export const getMeCountsApi = async (): Promise<MeCountsResponse> => {
  return apiRequest<MeCountsResponse>('/me/counts', { method: 'GET' });
};
