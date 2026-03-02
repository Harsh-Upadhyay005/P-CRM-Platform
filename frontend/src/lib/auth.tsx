'use client';
import React, { createContext, useEffect, useState } from 'react';
import { authApi } from './api';
import { User } from '@/types';
import { queryClient } from './query-client';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (data: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_CACHE_KEY = 'p-crm-user-cache';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Seed from localStorage so the UI renders instantly on repeat visits.
  // The effective `isLoading` is false as soon as we have a cached value;
  // the background re-validation below will silently update / evict stale data.
  const cachedUser = (() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(USER_CACHE_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  })();

  const [user, setUser] = useState<User | null>(cachedUser);
  // If we already have a cached user we start as NOT loading — the UI is ready.
  // We still fire a background validation; if it fails we clear the cache.
  const [isLoading, setIsLoading] = useState(!cachedUser);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Race the API call against a 7-second timeout so a cold Render
        // backend never freezes the spinner indefinitely.
        const response = await Promise.race([
          authApi.getMe(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('auth-timeout')), 7000)
          ),
        ]);
        if ((response as any).success && (response as any).data) {
          const freshUser = (response as any).data as User;
          setUser(freshUser);
          try { localStorage.setItem(USER_CACHE_KEY, JSON.stringify(freshUser)); } catch {}
        } else {
          setUser(null);
          try { localStorage.removeItem(USER_CACHE_KEY); } catch {}
        }
      } catch (err: any) {
        if (err?.message === 'auth-timeout') {
          // Backend is cold-starting — keep the cached user (if any) so the UI
          // stays usable; the next request will succeed once warmed up.
          if (!cachedUser) setUser(null);
        } else {
          // 401 / network error — clear cache
          setUser(null);
          try { localStorage.removeItem(USER_CACHE_KEY); } catch {}
        }
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (data: { email: string; password: string }) => {
    const response = await authApi.login(data);
    if (response.success && response.data) {
      setUser(response.data.user);
      try { localStorage.setItem(USER_CACHE_KEY, JSON.stringify(response.data.user)); } catch {}
      // Hard navigation so the Next.js middleware re-evaluates the request
      // against the freshly mirrored accessToken cookie on the frontend domain.
      window.location.href = '/dashboard';
    } else {
        throw new Error(response.message || 'Login failed');
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      console.error("Logout failed", e);
    }
    setUser(null);
    try { localStorage.removeItem(USER_CACHE_KEY); } catch {}
    queryClient.clear();
    // Use hard navigation so the protected layout's redirect-to-login
    // effect cannot race and override the destination.
    window.location.href = '/';
  };

  const refreshUser = async () => {
    try {
      const response = await authApi.getMe();
      if (response.success && response.data) {
        setUser(response.data);
        try { localStorage.setItem(USER_CACHE_KEY, JSON.stringify(response.data)); } catch {}
      }
    } catch {
      // ignore — user display will update on next page mount
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        refreshUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
