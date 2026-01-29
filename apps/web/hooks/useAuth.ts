'use client';

import { useState, useEffect } from 'react';
import { usersApi } from '@/lib/api';

interface AuthState {
  isAuthenticated: boolean;
  loading: boolean;
  user: any | null;
}

export function useAuth(): AuthState {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const response = await usersApi.getMe();
      
      if (response.data.success) {
        setIsAuthenticated(true);
        setUser(response.data.data);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      // User is not authenticated
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  return { isAuthenticated, loading, user };
}
