'use client';

import { useAuthContext } from '@/components/providers/AuthProvider';

export interface AuthState {
  isAuthenticated: boolean;
  loading: boolean;
  user: { id: string; email?: string; name?: string; roles?: string[] } | null;
  refreshUser?: () => Promise<void>;
}

/**
 * Auth state from AuthProvider (single source of truth; no duplicate GET /users/me).
 * Must be used within AuthProvider (root layout wraps the app with it).
 */
export function useAuth(): AuthState {
  const { user, isLoading, refreshUser } = useAuthContext();
  return {
    isAuthenticated: !!user,
    loading: isLoading,
    user: user
      ? {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.roles,
        }
      : null,
    refreshUser,
  };
}
