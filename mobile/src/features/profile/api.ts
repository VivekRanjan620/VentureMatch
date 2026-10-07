import { apiRequest } from '../../api/client';
import { GetMeResponse } from '../../api/types';
import { UpdateProfilePayload, UpdateCommitmentPayload } from './types';

export const fetchMe = async (): Promise<GetMeResponse> => {
  return apiRequest<GetMeResponse>('/me', {
    method: 'GET',
  });
};

export const updateProfileApi = async (data: UpdateProfilePayload): Promise<any> => {
  return apiRequest<{ profile: any }>('/me', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const updateCommitmentApi = async (data: UpdateCommitmentPayload): Promise<any> => {
  return apiRequest<{ commitment: any }>('/me/commitment', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};
