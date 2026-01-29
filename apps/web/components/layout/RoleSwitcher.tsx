'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authApi, usersApi } from '@/lib/api';

interface RoleSwitcherProps {
  userRoles?: string[];
  activeRole?: string;
}

export default function RoleSwitcher({ userRoles = [], activeRole }: RoleSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<string>(activeRole || 'buyer');
  const [loading, setLoading] = useState(false);
  const previousRoleRef = useRef<string>(activeRole || 'buyer');

  // Update current role when activeRole prop changes or pathname changes
  useEffect(() => {
    // Auto-detect organizer mode from URL path
    const isOnOrganizerRoute = pathname?.startsWith('/organizer');
    
    if (activeRole) {
      setCurrentRole(activeRole);
    } else if (isOnOrganizerRoute) {
      // If on organizer route but activeRole not set, infer organizer mode
      setCurrentRole('organizer');
    } else {
      // Default to buyer mode if activeRole is undefined
      setCurrentRole('buyer');
    }
  }, [activeRole, pathname]);

  // Check if user has ORGANIZER role
  const hasOrganizerRole = userRoles.includes('ORGANIZER');

  const handleRoleSwitch = async (role: 'buyer' | 'organizer') => {
    if (role === currentRole || loading) return;

    // If user doesn't have ORGANIZER role and tries to switch to organizer,
    // request organizer access inline and start onboarding without a second login
    if (role === 'organizer' && !hasOrganizerRole) {
      setLoading(true);
      setIsOpen(false);
      try {
        await authApi.requestOrganizer();
        // After granting organizer role, send user straight into organizer onboarding
        router.push('/onboarding/organizer');
      } catch (error) {
        console.error('Failed to request organizer access:', error);
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setIsOpen(false);
    previousRoleRef.current = currentRole;
    setCurrentRole(role); // Optimistic: button updates first

    try {
      await authApi.switchRole(role);

      // Redirect to appropriate dashboard based on selected role
      if (role === 'organizer') {
        router.push('/organizer/dashboard');
      } else {
        router.push('/dashboard/tickets');
      }
    } catch (error) {
      console.error('Failed to switch role:', error);
      setCurrentRole(previousRoleRef.current);
      // Reload user data to get current state
      try {
        const response = await usersApi.getMe();
        if (response.data.success) {
          const sessionResponse = await authApi.getSession();
          if (sessionResponse.data.success) {
            setCurrentRole(sessionResponse.data.data.activeRole || 'buyer');
          }
        }
      } catch (err) {
        console.error('Failed to refresh user data:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    return role === 'organizer' ? 'Organizer Mode' : 'Buyer Mode';
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2.5 text-[15px] font-medium text-primary-900 bg-primary-100 hover:bg-primary-200 border border-primary-300 rounded-xl transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Switch role"
        title={`Current mode: ${getRoleLabel(currentRole)}. Click to switch.`}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        <span className="font-semibold">{getRoleLabel(currentRole)}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-300 rounded-xl shadow-xl z-20 overflow-hidden">
            <div className="py-1">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Switch Mode</p>
                <p className="text-xs text-gray-500 mt-0.5">Changes navigation and features</p>
              </div>
              <button
                type="button"
                onClick={() => handleRoleSwitch('buyer')}
                disabled={loading || currentRole === 'buyer'}
                className={`w-full text-left px-4 py-3 text-sm transition ${
                  currentRole === 'buyer'
                    ? 'bg-primary-50 text-primary-900 font-semibold border-l-4 border-primary-600'
                    : 'text-gray-700 hover:bg-gray-50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                    <span className="font-medium">Buyer Mode</span>
                  </div>
                  {currentRole === 'buyer' && (
                    <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1 ml-6">View tickets & orders</p>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSwitch('organizer')}
                disabled={loading || (currentRole === 'organizer' && hasOrganizerRole)}
                className={`w-full text-left px-4 py-3 text-sm transition ${
                  currentRole === 'organizer'
                    ? 'bg-primary-50 text-primary-900 font-semibold border-l-4 border-primary-600'
                    : 'text-gray-700 hover:bg-gray-50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="font-medium">Organizer Mode</span>
                    {!hasOrganizerRole && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded">
                        Get Started
                      </span>
                    )}
                  </div>
                  {currentRole === 'organizer' && hasOrganizerRole && (
                    <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  {!hasOrganizerRole 
                    ? 'Sign up to start selling tickets' 
                    : 'Manage events & sales'}
                </p>
              </button>
              {loading && (
                <div className="px-4 py-2 text-xs text-gray-500 text-center">
                  <span className="inline-flex items-center gap-1">
                    <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Switching...
                  </span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
