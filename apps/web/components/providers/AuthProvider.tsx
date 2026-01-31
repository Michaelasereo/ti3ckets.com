'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { CurrentUser } from '@/lib/auth/server';

interface AuthContextValue {
  user: CurrentUser;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  initialUser: CurrentUser;
}

export function AuthProvider({ children, initialUser }: AuthProviderProps) {
  const [user, setUser] = useState<CurrentUser>(initialUser);
  const [isLoading, setIsLoading] = useState(!initialUser);

  const refreshUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const { usersApi, authApi } = await import('@/lib/api');
      const [userRes, sessionRes] = await Promise.all([
        usersApi.getMe(),
        authApi.getSession().catch(() => ({ data: { success: false } })),
      ]);
      if (userRes.data.success && userRes.data.data) {
        const u = userRes.data.data as {
          id: string;
          email?: string;
          name?: string;
          roles?: string[];
          activeRole?: string;
        };
        setUser({
          id: u.id,
          email: u.email,
          name: u.name,
          roles: u.roles,
          activeRole: sessionRes.data.success
            ? (sessionRes.data.data as { activeRole?: string })?.activeRole
            : u.activeRole,
        });
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Only fetch client-side when we have no server-provided user
  useEffect(() => {
    if (initialUser != null) {
      setUser(initialUser);
      setIsLoading(false);
      return;
    }
    refreshUser();
  }, [initialUser, refreshUser]);

  const value: AuthContextValue = {
    user,
    isLoading,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return ctx;
}
