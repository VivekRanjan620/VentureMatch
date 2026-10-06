import { create } from 'zustand';
import { User, Tokens } from '../api/types';
import { saveTokens, getTokens, clearTokens } from '../lib/secureStorage';
import { apiRequest } from '../api/client';
import { ApiError } from '../lib/errors';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn' | 'networkError';

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  status: AuthStatus;

  hydrate: () => Promise<void>;
  retryHydration: () => Promise<void>;
  loginSuccess: (user: User, tokens: Tokens) => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  handleAuthFailure: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  status: 'loading',

  hydrate: async () => {
    set({ status: 'loading' });
    try {
      const { accessToken, refreshToken } = await getTokens();
      if (!accessToken || !refreshToken) {
        set({ accessToken: null, refreshToken: null, user: null, status: 'signedOut' });
        return;
      }

      set({ accessToken, refreshToken });

      // Call GET /me to validate session
      const meData = await apiRequest<{ user: User }>('/me', { method: 'GET' });
      set({ user: meData.user, status: 'signedIn' });
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.status === 401 || err.status === 403) {
          // Explicit server rejection -> clear session
          await clearTokens();
          set({ accessToken: null, refreshToken: null, user: null, status: 'signedOut' });
          return;
        }
        if (err.code === 'NETWORK_ERROR' || err.status >= 500 || err.status === 0) {
          // Network failure or 5xx server error -> keep tokens, set networkError state
          set({ status: 'networkError' });
          return;
        }
      }
      // Default fallback for unexpected errors
      set({ status: 'signedOut' });
    }
  },

  retryHydration: async () => {
    await get().hydrate();
  },

  loginSuccess: async (user: User, tokens: Tokens) => {
    await saveTokens(tokens.accessToken, tokens.refreshToken);
    set({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user,
      status: 'signedIn',
    });
  },

  setTokens: (accessToken: string, refreshToken: string) => {
    set({ accessToken, refreshToken });
  },

  setUser: (user: User) => {
    set({ user });
  },

  handleAuthFailure: async () => {
    await clearTokens();
    set({ accessToken: null, refreshToken: null, user: null, status: 'signedOut' });
  },

  logout: async () => {
    const { refreshToken } = get();
    if (refreshToken) {
      // Call POST /auth/logout (ignore failures)
      try {
        await apiRequest('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
          skipAuth: true,
        });
      } catch (_e) {
        // Silently ignore logout network/server failures
      }
    }

    await clearTokens();
    set({ accessToken: null, refreshToken: null, user: null, status: 'signedOut' });
  },
}));
