'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect, Fragment } from 'react';
import type { CurrentUser } from '@/lib/auth/server';
import RoleSwitcher from './RoleSwitcher';
import OrganizerSettingsMenu from './OrganizerSettingsMenu';

function getStoredUser(): { id: string; email?: string; name?: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('user') ?? sessionStorage.getItem('user');
    if (!raw) return null;
    return JSON.parse(raw) as { id: string; email?: string; name?: string };
  } catch {
    return null;
  }
}

interface NavItem {
  href: string;
  label: string;
  role?: 'buyer' | 'organizer' | 'common';
}

function getNavItems(activeRole?: string, isLoggedIn: boolean = false, pathname?: string): NavItem[] {
  const commonItems: NavItem[] = [
    { href: '/events', label: 'Browse events', role: 'common' }
  ];
  
  const buyerItems: NavItem[] = [
    { href: '/dashboard/tickets', label: 'My Tickets', role: 'buyer' },
    { href: '/dashboard/orders', label: 'My Orders', role: 'buyer' }
  ];
  
  const organizerItems: NavItem[] = [
    { href: '/organizer/dashboard', label: 'Dashboard', role: 'organizer' },
    { href: '/organizer/promo-codes', label: 'Promo Codes', role: 'organizer' },
    { href: '/organizer/settings', label: 'Settings', role: 'organizer' },
  ];

  let items: NavItem[];
  if (!isLoggedIn) {
    items = [...commonItems, { href: '/organizer/signup', label: 'Sell Tickets', role: 'common' }];
  } else {
    const isOnOrganizerRoute = pathname?.startsWith('/organizer');
    const effectiveRole = activeRole || (isOnOrganizerRoute ? 'organizer' : 'buyer');
    if (effectiveRole === 'organizer' || isOnOrganizerRoute) {
      items = [...commonItems, ...organizerItems];
    } else {
      items = [...commonItems, ...buyerItems];
    }
  }

  // FAQ and Support only on home page
  if (pathname === '/') {
    items = [...items, { href: '/faqs', label: 'FAQ', role: 'common' }, { href: '/support', label: 'Support', role: 'common' }];
  }
  return items;
}

export default function Header({ initialUser }: { initialUser: CurrentUser } = { initialUser: null }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string; name?: string; roles?: string[] } | null>(
    initialUser
      ? {
          id: initialUser.id,
          email: initialUser.email,
          name: initialUser.name,
          roles: initialUser.roles,
        }
      : null,
  );
  const [activeRole, setActiveRole] = useState<string | undefined>(initialUser?.activeRole);

  useEffect(() => {
    checkAuth();
    const onStorage = () => checkAuth();
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    // When user was loaded on the server, skip re-fetching on every pathname change.
    if (initialUser != null) return;
    checkAuth();
  }, [pathname, initialUser]);

  const checkAuth = async () => {
    try {
      const { usersApi, authApi } = await import('@/lib/api');
      const [userResponse, sessionResponse] = await Promise.all([
        usersApi.getMe(),
        authApi.getSession().catch(() => ({ data: { success: false } })),
      ]);
      
      if (userResponse.data.success) {
        setUser(userResponse.data.data);
      } else {
        setUser(null);
      }

      // Get active role from session
      if (sessionResponse.data.success) {
        setActiveRole(sessionResponse.data.data.activeRole);
      }
    } catch {
      // Fallback to stored user for UI (session might be expired)
      setUser(getStoredUser());
    }
  };

  const handleLogout = async () => {
    try {
      // Call logout API to delete session and clear cookie
      const { authApi } = await import('@/lib/api');
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage (user info for UI)
      localStorage.removeItem('user');
      sessionStorage.removeItem('user');
      setUser(null);
      setIsMenuOpen(false);
      router.push('/');
    }
  };

  const isLoggedIn = !!user;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <nav className="container mx-auto px-4 py-4 relative">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            {!logoError ? (
              <Image
                src="/Logo.png"
                alt="getiickets"
                width={140}
                height={36}
                className="h-9 w-auto object-contain"
                priority
                unoptimized
                onError={() => setLogoError(true)}
              />
            ) : (
              <span className="text-xl font-bold text-primary-900">getiickets</span>
            )}
          </Link>

          {/* Desktop Navigation - Centered */}
          <div className="hidden md:flex items-center gap-6 absolute left-1/2 transform -translate-x-1/2">
            {getNavItems(activeRole, isLoggedIn, pathname).map((item, index, array) => {
              const prevItem = array[index - 1];
              const shouldShowDivider = 
                index > 0 && 
                item.role !== 'common' && 
                prevItem?.role === 'common' && 
                prevItem?.href === '/events';
              
              return (
                <Fragment key={item.href}>
                  {shouldShowDivider && (
                    <span className="w-px h-4 bg-gray-300" aria-hidden="true" />
                  )}
                  <Link 
                    href={item.href} 
                    className="text-primary-800 hover:text-primary-600 transition text-[15px]"
                  >
                    {item.label}
                  </Link>
                </Fragment>
              );
            })}
            {/* Settings menu for organizers */}
            {isLoggedIn && (activeRole === 'organizer' || pathname?.startsWith('/organizer')) && (
              <>
                <span className="w-px h-4 bg-gray-300" aria-hidden="true" />
                <OrganizerSettingsMenu />
              </>
            )}
          </div>

          {/* Auth Buttons - Right Side */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            {isLoggedIn ? (
                <>
                  <RoleSwitcher 
                    userRoles={user?.roles || []} 
                    activeRole={activeRole}
                  />
                  <div className="w-px h-6 bg-gray-300" aria-hidden="true" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="px-4 py-2.5 text-primary-800 bg-gray-200 hover:bg-gray-300 rounded-xl font-medium transition text-[15px]"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="px-4 py-2.5 text-primary-800 bg-gray-200 hover:bg-gray-300 rounded-xl font-medium transition text-[15px]"
                  >
                    Login
                  </Link>
                  <Link
                    href="/auth/register"
                    className="px-4 py-2.5 bg-primary-900 text-white rounded-xl font-medium hover:bg-primary-800 transition text-[15px]"
                  >
                    Sign Up
                  </Link>
                </>
              )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6 text-primary-800"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-gray-200 space-y-2">
            {isLoggedIn && (
              <div className="py-3 px-2 bg-primary-50 rounded-lg border border-primary-200 mb-3">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 px-2">Switch Mode</p>
                <RoleSwitcher 
                  userRoles={user?.roles || []} 
                  activeRole={activeRole}
                />
                <p className="text-xs text-gray-500 mt-2 px-2">Change mode to see different navigation options</p>
              </div>
            )}
            {getNavItems(activeRole, isLoggedIn, pathname).map((item, index, array) => {
              const isRoleDivider = 
                index > 0 && 
                item.role !== 'common' && 
                array[index - 1]?.role === 'common' && 
                array[index - 1]?.href === '/events';
              
              return (
                <div key={item.href}>
                  {isRoleDivider && (
                    <div className="my-2 border-t border-gray-200" />
                  )}
                  <Link 
                    href={item.href} 
                    className="block py-2 text-primary-800 hover:text-primary-600"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                </div>
              );
            })}
            {/* Settings menu for organizers */}
            {isLoggedIn && (activeRole === 'organizer' || pathname?.startsWith('/organizer')) && (
              <>
                <div className="my-2 border-t border-gray-200" />
                <div className="py-2">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 px-2">Settings</p>
                  <OrganizerSettingsMenu />
                </div>
              </>
            )}
            {isLoggedIn ? (
              <button
                type="button"
                onClick={handleLogout}
                className="block py-2 text-primary-800 text-left w-full"
              >
                Logout
              </button>
            ) : (
              <>
                <Link href="/auth/login" className="block py-2 text-primary-800">
                  Login
                </Link>
                <Link href="/auth/register" className="block py-2 text-primary-800">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
