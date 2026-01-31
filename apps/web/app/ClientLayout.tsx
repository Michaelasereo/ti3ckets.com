'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import ConsoleErrorDisplay from '@/components/debug/ConsoleErrorDisplay';
import type { CurrentUser } from '@/lib/auth/server';

export default function ClientLayout({
  children,
  initialUser,
}: {
  children: ReactNode;
  initialUser: CurrentUser;
}) {
  useEffect(() => {
    console.log('[DEBUG] ClientLayout mounted in browser', { user: initialUser ? initialUser.id : null });
  }, [initialUser]);

  return (
    <AuthProvider initialUser={initialUser}>
      <Header />
      <main className="min-h-screen bg-white">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
      <Footer />
      <ConsoleErrorDisplay />
    </AuthProvider>
  );
}

