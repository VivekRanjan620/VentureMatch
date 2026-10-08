import { getTokens, saveTokens } from '../lib/secureStorage';
import { ApiError } from '../lib/errors';

function getAuthStore() {
  // Lazy require to avoid top-level require cycle between auth.ts and client.ts
  const { useAuthStore } = require('../store/auth');
  return useAuthStore.getState();
}

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.29.237:4000/api/v1';

export interface ApiRequestOptions extends RequestInit {
  skipAuth?: boolean;
  timeoutMs?: number;
}

// Single shared in-flight refresh promise to handle concurrent 401s cleanly
let activeRefreshPromise: Promise<string> | null = null;

const refreshTokens = async (): Promise<string> => {
  const { refreshToken } = await getTokens();
  if (!refreshToken) {
    throw new ApiError(401, 'UNAUTHORIZED', 'No refresh token available');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const code = data?.error?.code || 'UNAUTHORIZED';
      const message = data?.error?.message || 'Refresh failed';
      throw new ApiError(response.status, code, message);
    }

    const data = await response.json();
    const newAccessToken: string = data.tokens.accessToken;
    const newRefreshToken: string = data.tokens.refreshToken;

    // 1. Persistence Order: write to SecureStore FIRST
    await saveTokens(newAccessToken, newRefreshToken);

    // 2. Update Zustand store state BEFORE resolving/retrying
    getAuthStore().setTokens(newAccessToken, newRefreshToken);

    return newAccessToken;
  } catch (err: any) {
    clearTimeout(timer);
    // Refresh failed with token rejection -> trigger auth failure
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      await getAuthStore().handleAuthFailure();
    }
    throw err;
  } finally {
    activeRefreshPromise = null;
  }
};

export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { skipAuth = false, timeoutMs = 15000, headers: customHeaders, body, ...restOptions } = options;

  const isAuthEndpoint = endpoint.startsWith('/auth/');
  const fullUrl = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const method = (restOptions.method || 'GET').toUpperCase();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(method === 'GET' ? { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } : {}),
    ...(customHeaders as Record<string, string>),
  };

  if (!skipAuth) {
    const { accessToken } = getAuthStore();
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(fullUrl, {
      ...restOptions,
      headers,
      body,
      signal: controller.signal,
    });
    clearTimeout(timer);
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new ApiError(0, 'TIMEOUT', 'Request timed out. Please try again.');
    }
    throw new ApiError(0, 'NETWORK_ERROR', "Can't reach the server. Please check your internet connection.");
  }

  // Handle HTTP 401 Refresh attempt ONLY for authenticated requests (not auth endpoints)
  if (response.status === 401 && !skipAuth && !isAuthEndpoint) {
    try {
      if (!activeRefreshPromise) {
        activeRefreshPromise = refreshTokens();
      }
      const newAccessToken = await activeRefreshPromise;

      // Retry original request with new token
      const retryController = new AbortController();
      const retryTimer = setTimeout(() => retryController.abort(), timeoutMs);

      const retryHeaders = {
        ...headers,
        Authorization: `Bearer ${newAccessToken}`,
      };

      try {
        const retryResponse = await fetch(fullUrl, {
          ...restOptions,
          headers: retryHeaders,
          body,
          signal: retryController.signal,
        });
        clearTimeout(retryTimer);

        if (!retryResponse.ok) {
          return await parseErrorResponse(retryResponse);
        }
        return (await retryResponse.json()) as T;
      } catch (retryErr: any) {
        clearTimeout(retryTimer);
        if (retryErr.name === 'AbortError') {
          throw new ApiError(0, 'TIMEOUT', 'Request timed out. Please try again.');
        }
        if (retryErr instanceof ApiError) throw retryErr;
        throw new ApiError(0, 'NETWORK_ERROR', "Can't reach the server. Please check your internet connection.");
      }
    } catch (refreshErr) {
      // If refresh failed, throw error (auth failure already handled inside refreshTokens if 401/403)
      throw refreshErr;
    }
  }

  if (!response.ok) {
    return await parseErrorResponse(response);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
}

async function parseErrorResponse(response: Response): Promise<never> {
  let errorJson: any;
  try {
    errorJson = await response.json();
  } catch (_e) {
    errorJson = {};
  }

  const status = response.status;
  const code = errorJson?.error?.code || (status === 429 ? 'RATE_LIMIT_EXCEEDED' : 'UNKNOWN_ERROR');
  let message = errorJson?.error?.message;

  if (status === 429 && !message) {
    message = 'Too many attempts, try again in a few minutes';
  } else if (!message) {
    message = response.statusText || 'An unexpected error occurred';
  }

  const details = errorJson?.error?.details;

  throw new ApiError(status, code, message, details);
}
