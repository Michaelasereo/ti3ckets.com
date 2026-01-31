import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import ClientLayout from './ClientLayout';
import { getCurrentUser } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'getiickets - Discover Amazing Events',
  description: 'Find and purchase tickets for concerts, sports, conferences, festivals and more',
};

export const viewport = { width: 'device-width', initialScale: 1 };

async function AuthWrapper({ children }: { children: React.ReactNode }) {
  let user = null;
  try {
    user = await getCurrentUser();
  } catch {
    user = null;
  }
  return <ClientLayout initialUser={user}>{children}</ClientLayout>;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-white">
        <Suspense
          fallback={
            <ClientLayout initialUser={null}>
              {children}
            </ClientLayout>
          }
        >
          <AuthWrapper>{children}</AuthWrapper>
        </Suspense>
      </body>
    </html>
  );
}
