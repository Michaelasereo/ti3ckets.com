import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getCurrentUser } from '@/lib/auth/server';

export default async function OrganizerLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth/login');
  }

  const hasOrganizerRole = user.roles?.includes('ORGANIZER');
  if (!hasOrganizerRole) {
    redirect('/organizer/signup');
  }

  return <>{children}</>;
}

