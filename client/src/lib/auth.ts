import * as React from "react";
import { User } from "@shared/schema";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const { createContext, useContext } = React;
type ReactNode = React.ReactNode;

// Define the auth context type
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  login: (email: string, password: string) => Promise<User>;
  register: (username: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

// Create the context with undefined as default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to create user from auth endpoints
async function authenticateUser(endpoint: string, data: any): Promise<User> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Authentication failed");
  }

  return await response.json();
}

// Auth Provider Component
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  // Fetch current user
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

  // Refetch user data
  const refetchUser = async () => {
    await refetch();
  };

  // Login function
  const login = async (email: string, password: string) => {
    const userData = await authenticateUser("/api/auth/login", { email, password });
    await refetchUser();
    return userData;
  };

  // Register function
  const register = async (username: string, email: string, password: string) => {
    const userData = await authenticateUser("/api/auth/register", { username, email, password });
    await refetchUser();
    return userData;
  };

  // Logout function
  const logout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    queryClient.invalidateQueries();
    await refetchUser();
  };

  // Prepare context value
  const value = {
    user: user || null,
    isLoading,
    error: error as Error | null,
    login,
    register,
    logout,
    refetchUser
  };

  // Return the provider
  return React.createElement(AuthContext.Provider, { value }, children);
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
