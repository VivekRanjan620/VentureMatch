import { apiRequest } from './client';
import { AuthResponse, GetMeResponse, UserRole } from './types';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  role: UserRole;
}

export const login = async (data: LoginPayload): Promise<AuthResponse> => {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
    skipAuth: true,
  });
};

export const register = async (data: RegisterPayload): Promise<AuthResponse> => {
  return apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
    skipAuth: true,
  });
};

export const logout = async (refreshToken?: string): Promise<void> => {
  return apiRequest<void>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
    skipAuth: true,
  });
};

export const getMe = async (): Promise<GetMeResponse> => {
  return apiRequest<GetMeResponse>('/me', {
    method: 'GET',
  });
};
