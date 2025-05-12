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

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  
  const { 
    data: user, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({ 
    queryKey: ['/api/user'],
    retry: false,
    staleTime: 1000 * 60 * 60 // 1 hour
  });

  const refetchUser = async () => {
    await refetch();
  };

  const login = async (email: string, password: string): Promise<User> => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Login failed');
    }

    const userData = await response.json();
    await refetchUser();
    return userData;
  };

  const register = async (username: string, email: string, password: string): Promise<User> => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Registration failed');
    }

    const userData = await response.json();
    await refetchUser();
    return userData;
  };

  const logout = async (): Promise<void> => {
    await fetch('/api/logout', {
      method: 'POST',
    });
    
    queryClient.invalidateQueries();
    await refetchUser();
  };
  
  const loginAsGuest = () => {
    // Guest mode just bypasses authentication
    localStorage.setItem('guest-mode', 'true');
  };

  const value = useMemo<AuthContextType>(() => ({
    user: user as User | null,
    isLoading,
    error: error as Error | null,
    login,
    register,
    loginAsGuest,
    logout,
    refetchUser
  }), [user, isLoading, error, refetch]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}