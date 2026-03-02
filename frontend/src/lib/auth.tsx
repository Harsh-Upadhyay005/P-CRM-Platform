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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const response = await authApi.getMe();
        if (response.success && response.data) {
          setUser(response.data);
        }
      } catch {
        // If 401, we are just not logged in.
        // If we are on a protected route, middleware should have handled it, 
        // but here we just set user to null.
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (data: { email: string; password: string }) => {
    const response = await authApi.login(data);
    if (response.success && response.data) {
      setUser(response.data.user);
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
