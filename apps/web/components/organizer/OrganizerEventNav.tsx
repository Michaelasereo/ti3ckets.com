'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface OrganizerEventNavProps {
  eventId: string;
  eventTitle?: string;
  active?: 'edit' | 'analytics' | 'orders' | 'check-in' | 'seats' | 'waitlist';
  showSeats?: boolean;
}

const tabs: { key: OrganizerEventNavProps['active']; label: string; href: (id: string) => string }[] = [
  { key: 'edit', label: 'Edit', href: (id) => `/organizer/events/${id}` },
  { key: 'analytics', label: 'Analytics', href: (id) => `/organizer/events/${id}/analytics` },
  { key: 'orders', label: 'Orders', href: (id) => `/organizer/events/${id}/orders` },
  { key: 'check-in', label: 'Check-in', href: (id) => `/organizer/events/${id}/check-in` },
  { key: 'seats', label: 'Seats', href: (id) => `/organizer/events/${id}/seats` },
  { key: 'waitlist', label: 'Waitlist', href: (id) => `/organizer/events/${id}/waitlist` },
];

function getActiveFromPath(pathname: string): OrganizerEventNavProps['active'] {
  if (pathname.endsWith('/analytics')) return 'analytics';
  if (pathname.endsWith('/orders')) return 'orders';
  if (pathname.endsWith('/check-in')) return 'check-in';
  if (pathname.endsWith('/seats')) return 'seats';
  if (pathname.endsWith('/waitlist')) return 'waitlist';
  return 'edit';
}

export default function OrganizerEventNav({
  eventId,
  eventTitle,
  active: activeProp,
  showSeats = false,
}: OrganizerEventNavProps) {
  const pathname = usePathname();
  const active = activeProp ?? getActiveFromPath(pathname);

  const visibleTabs = showSeats ? tabs : tabs.filter((t) => t.key !== 'seats');

  return (
    <div className="border-b border-gray-200 mb-6 pb-1">
      <Link
        href="/organizer/dashboard"
        className="inline-block text-sm text-primary-800 hover:text-primary-600 mb-4"
      >
        ← Back to Dashboard
      </Link>
      {eventTitle && (
        <h2 className="text-lg font-semibold text-primary-900 mb-2">{eventTitle}</h2>
      )}
      <nav className="flex flex-wrap gap-x-6 gap-y-2 -mb-px">
        {visibleTabs.map(({ key, label, href }) => {
          const isActive = active === key;
          return (
            <Link
              key={key}
              href={href(eventId)}
              className={`pb-3 text-[15px] transition ${
                isActive
                  ? 'border-b-2 border-primary-900 font-semibold text-primary-900'
                  : 'text-gray-600 hover:text-primary-800'
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
