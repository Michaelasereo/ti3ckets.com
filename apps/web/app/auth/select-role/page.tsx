'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi, usersApi } from '@/lib/api';
import Link from 'next/link';

function isSafeRedirect(next: string | null): boolean {
  if (!next || typeof next !== 'string') return false;
  const path = next.startsWith('/') ? next : `/${next}`;
  return path.startsWith('/') && !path.startsWith('//') && !path.includes('://');
}

export default function SelectRolePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get('next');
  const [user, setUser] = useState<{ roles?: string[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const response = await usersApi.getMe();
      if (response.data.success) {
        const userData = response.data.data;
        setUser(userData);

        // If user has only one role, automatically set it and redirect
        const roles = userData.roles || [];
        if (roles.length === 1) {
          const role = roles[0] === 'ORGANIZER' ? 'organizer' : 'buyer';
          await handleRoleSelect(role);
        } else if (roles.length === 0) {
          // No roles, redirect to buyer dashboard as default
          router.push('/dashboard/tickets');
        }
      } else {
        router.push('/auth/login');
      }
    } catch (err) {
      console.error('Error checking user:', err);
      router.push('/auth/login');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = async (role: 'buyer' | 'organizer') => {
    setSwitching(true);
    setError('');

    try {
      await authApi.switchRole(role);

      const redirectTo = isSafeRedirect(nextUrl)
        ? nextUrl
        : null;
      const matchesRole =
        redirectTo &&
        ((role === 'organizer' && redirectTo.startsWith('/organizer')) ||
          (role === 'buyer' && (redirectTo.startsWith('/dashboard') || redirectTo.startsWith('/orders'))));

      if (matchesRole) {
        router.push(redirectTo);
      } else if (role === 'organizer') {
        router.push('/organizer/dashboard');
      } else {
        router.push('/dashboard/tickets');
      }
    } catch (err: any) {
      console.error('Failed to switch role:', err);
      setError(err.response?.data?.error || 'Failed to switch role. Please try again.');
      setSwitching(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const roles = user?.roles || [];
  const hasBuyer = roles.includes('BUYER');
  const hasOrganizer = roles.includes('ORGANIZER');

  // If somehow we get here with no valid roles, redirect
  if (!hasBuyer && !hasOrganizer) {
    router.push('/dashboard/tickets');
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-primary-900 mb-2 text-center">
            Choose Your Mode
          </h1>
          <p className="text-gray-600 text-center mb-8">
            You have access to multiple roles. Select how you&apos;d like to use getiickets right now.
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {hasBuyer && (
              <button
                type="button"
                onClick={() => handleRoleSelect('buyer')}
                disabled={switching}
                className="w-full p-6 border-2 border-gray-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-primary-800"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-primary-900 mb-1">
                      Buyer Mode
                    </h3>
                    <p className="text-sm text-gray-600">
                      Browse events, purchase tickets, and manage your orders
                    </p>
                  </div>
                  {switching && (
                    <div className="flex-shrink-0">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-900"></div>
                    </div>
                  )}
                </div>
              </button>
            )}

            {hasOrganizer && (
              <button
                type="button"
                onClick={() => handleRoleSelect('organizer')}
                disabled={switching}
                className="w-full p-6 border-2 border-gray-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-primary-800"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-primary-900 mb-1">
                      Organizer Mode
                    </h3>
                    <p className="text-sm text-gray-600">
                      Create and manage events, track sales, and handle check-ins
                    </p>
                  </div>
                  {switching && (
                    <div className="flex-shrink-0">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-900"></div>
                    </div>
                  )}
                </div>
              </button>
            )}
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm text-primary-800 hover:text-primary-600"
            >
              Go to homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
