'use client';

import Link from 'next/link';
import { formatCurrency } from '@getiickets/shared';

function formatDateLabel(date: Date | string): string {
  const d = new Date(date);
  const day = d.getDate();
  const month = d.toLocaleString('en', { month: 'short' }).toUpperCase();
  return `${day}-${month}`;
}

function formatEventDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString('en-NG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

interface EventGridProps {
  events: any[];
}

export default function EventGrid({ events }: EventGridProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No events found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {events.map((event) => {
        const minPrice =
          event.ticketTypes?.length > 0
            ? Math.min(...event.ticketTypes.map((tt: any) => Number(tt.price)))
            : 0;
        const currency = event.ticketTypes?.[0]?.currency || 'NGN';
        const slug = event.slug || event.id;
        const href = `/events/${slug}`;

        return (
          <Link
            key={event.id}
            href={href}
            className="group bg-white rounded-xl overflow-hidden border border-gray-200 hover:shadow-lg hover:border-gray-300 transition"
          >
            <div className="relative aspect-[4/3] bg-gray-200 overflow-hidden">
              {event.imageUrl || event.bannerUrl ? (
                <img
                  src={event.imageUrl || event.bannerUrl}
                  alt={event.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                  <span className="text-white/80 font-mono text-sm uppercase tracking-wider">
                    {event.city || 'Event'}
                  </span>
                </div>
              )}
              <div
                className="absolute bottom-2 right-2 px-2.5 py-1 bg-white rounded-md font-mono text-sm font-semibold text-primary-900 shadow"
                aria-hidden
              >
                {formatDateLabel(event.startDateTime)}
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-primary-900 mb-1.5 line-clamp-2 group-hover:text-primary-700">
                {event.title}
              </h3>
              <p className="text-sm text-gray-600 mb-1 line-clamp-1">
                {formatEventDateTime(event.startDateTime)}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                {event.city}
                {event.venueName ? ` | ${event.venueName}` : ''}
              </p>
              {minPrice > 0 ? (
                <p className="font-semibold text-primary-900">
                  {formatCurrency(minPrice, currency)}
                </p>
              ) : (
                <p className="font-semibold text-green-600">Free</p>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
