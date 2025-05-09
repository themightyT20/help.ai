import * as React from 'react';
import { User } from '@shared/schema';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Auth context type definition
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  login: (email: string, password: string) => Promise<User>;
  register: (username: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

// Create the auth context
const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

// Auth provider props
interface AuthProviderProps {
  children: React.ReactNode;
}

// Auth provider component
export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  
  // Get current user
  const { 
    data: user, 
    isLoading, 
    error,
    refetch
  } = useQuery({ 
    queryKey: ['/api/me'],
    retry: false,
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  // Function to refresh user data
  const refetchUser = React.useCallback(async () => {
    await refetch();
  }, [refetch]);

  // Login function
  const login = React.useCallback(async (email: string, password: string): Promise<User> => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const userData = await response.json();
    await refetchUser();
    return userData;
  }, [refetchUser]);

  // Register function
  const register = React.useCallback(async (username: string, email: string, password: string): Promise<User> => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }

    const userData = await response.json();
    await refetchUser();
    return userData;
  }, [refetchUser]);

  // Logout function
  const logout = React.useCallback(async (): Promise<void> => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // Invalidate and refetch
    queryClient.invalidateQueries();
    await refetchUser();
  }, [queryClient, refetchUser]);

  // Create the auth value
  const value = React.useMemo(() => ({
    user: user || null,
    isLoading,
    error: error as Error | null,
    login,
    register,
    logout,
    refetchUser,
  }), [user, isLoading, error, login, register, logout, refetchUser]);

  // Return the provider
  return React.createElement(
    AuthContext.Provider, 
    { value },
    children
  );
}

// Hook to use the auth context
export function useAuth(): AuthContextType {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}