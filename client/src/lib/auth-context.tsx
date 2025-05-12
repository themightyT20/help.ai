import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { User } from '@shared/schema';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  login: (email: string, password: string) => Promise<User>;
  register: (username: string, email: string, password: string) => Promise<User>;
  loginAsGuest: () => void;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  // Fetch current user 
  const { data: user, isLoading, error, refetch } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const headers: Record<string, string> = {};
      if (localStorage.getItem('guest-mode') === 'true') {
        headers['x-guest-mode'] = 'true';
      }
      const response = await fetch('/api/me', { headers });
      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }
      return response.json();
    },
    retry: false,
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const refetchUser = async () => {
    await refetch();
  };

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const userData = await response.json();
    await refetchUser();
    return userData;
  };

  const register = async (username: string, email: string, password: string) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }

    const userData = await response.json();
    await refetchUser();
    return userData;
  };

  const loginAsGuest = () => {
    localStorage.setItem('guest-mode', 'true');
    refetchUser();
  };

  const logout = async () => {
    localStorage.removeItem('guest-mode');
    await fetch('/api/auth/logout', { method: 'POST' });
    queryClient.clear();
    await refetchUser();
  };

  const value = {
    user: user as User | null,
    isLoading,
    error: error as Error | null,
    login,
    register,
    loginAsGuest,
    logout,
    refetchUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}