import type { Metadata } from 'next';
import './globals.css';
import ClientLayout from './ClientLayout';
import { getCurrentUser } from '@/lib/auth/server';

export const metadata: Metadata = {
  title: 'getiickets - Discover Amazing Events',
  description: 'Find and purchase tickets for concerts, sports, conferences, festivals and more',
};

export const viewport = { width: 'device-width', initialScale: 1 };

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body className="font-sans antialiased bg-white">
        <ClientLayout initialUser={user}>{children}</ClientLayout>
      </body>
    </html>
  );
}
