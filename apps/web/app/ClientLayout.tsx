'use client';

import type { ReactNode } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import type { CurrentUser } from '@/lib/auth/server';

export default function ClientLayout({
  children,
  initialUser,
}: {
  children: ReactNode;
  initialUser: CurrentUser;
}) {
  return (
    <>
      <Header initialUser={initialUser} />
      <main className="min-h-screen bg-white">{children}</main>
      <Footer />
    </>
  );
}

