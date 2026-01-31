'use client';

import { useEffect, useState } from 'react';
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

interface LandingEventGridProps {
  /** Events loaded on the server (from DB); shown immediately so home works without the API. */
  initialEvents?: any[];
}

export default function LandingEventGrid({ initialEvents = [] }: LandingEventGridProps) {
  const [events, setEvents] = useState<any[]>(initialEvents);
  const [loading, setLoading] = useState(initialEvents.length === 0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If we already have server-loaded events, show them and skip client refetch to avoid timeout/duplicate load
    if (initialEvents.length > 0) {
      setLoading(false);
      return;
    }
    async function fetchEvents() {
      setError(null);
      try {
        const { eventsApi } = await import('@/lib/api');
        const res = await eventsApi.list({ limit: 8 });
        setEvents(res.data?.data || []);
      } catch (err: unknown) {
        setEvents([]);
        let message = 'Request failed';
        if (err && typeof err === 'object') {
          const ax = err as { message?: string; response?: { status?: number; statusText?: string } };
          if (ax.response?.status) message = `API ${ax.response.status} ${ax.response.statusText || ''}`.trim();
          else if (ax.message) message = String(ax.message);
        }
        setError(message);
        if (typeof window !== 'undefined') {
          console.error('[LandingEventGrid] Events API error:', err);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, [initialEvents.length]);

  if (loading) {
    return (
      <section className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-xl overflow-hidden animate-pulse">
              <div className="aspect-[4/3] bg-gray-200" />
              <div className="p-4 space-y-3">
                <div className="h-5 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
                <div className="h-5 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (events.length === 0) {
    return (
      <section className="container mx-auto px-4 py-12">
        <div className="text-center py-16 bg-gray-50 rounded-xl">
          {error ? (
            <>
              <p className="text-gray-700 font-medium mb-1">Couldn&apos;t load events</p>
              <p className="text-gray-500 text-sm mb-4">
                Make sure the API is running (e.g. <code className="bg-gray-200 px-1 rounded">./scripts/start-dev.sh</code> or API on port 8080).
              </p>
              <p className="text-gray-400 text-xs mb-4 max-w-md mx-auto">{error}</p>
            </>
          ) : (
            <p className="text-gray-500 mb-4">No events yet. Check back soon.</p>
          )}
          <Link
            href="/events"
            className="inline-block px-6 py-3 bg-primary-900 text-white rounded-lg font-semibold hover:bg-primary-800 transition"
          >
            Browse events
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="container mx-auto px-4 py-12">
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
                {event.imageUrl ? (
                  <img
                    src={event.imageUrl}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
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
      <div className="text-center mt-10">
        <Link
          href="/events"
          className="inline-block px-8 py-3.5 bg-primary-900 text-white rounded-xl font-semibold hover:bg-primary-800 transition"
        >
          Discover more events
        </Link>
      </div>
    </section>
  );
}
