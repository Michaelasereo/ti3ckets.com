'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { organizerApi } from '@/lib/api';
import PageContainer from '@/components/ui/PageContainer';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import { useProfileCheck } from '@/hooks/useProfileCheck';

export default function OrganizerDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { loading: profileLoading } = useProfileCheck('organizer');
  const justCreated = searchParams.get('created') === '1';

  useEffect(() => {
    if (!profileLoading) {
      fetchEvents();
    }
  }, [profileLoading]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await organizerApi.getEvents();
      if (response.data.success) {
        setEvents(response.data.data || []);
      } else {
        setError('Failed to fetch events');
      }
    } catch (error: any) {
      console.error('Error fetching events:', error);
      setError(error.response?.data?.error || 'Failed to fetch events');
    } finally {
      setLoading(false);
    }
  };

  // Clear ?created=1 from URL without full reload
  useEffect(() => {
    if (justCreated && window.history.replaceState) {
      window.history.replaceState({}, '', '/organizer/dashboard');
    }
  }, [justCreated]);

  return (
    <PageContainer>
      {justCreated && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm">
          Event created. It is saved as <strong>Draft</strong>. Open the event and set status to <strong>Publish</strong> so it appears on the Browse events page.
        </div>
      )}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-primary-900">Organizer Dashboard</h1>
        <Link
          href="/organizer/events/create"
          className="px-6 py-3.5 bg-primary-900 text-white rounded-xl font-semibold hover:bg-primary-800 transition"
        >
          Create Event
        </Link>
      </div>

      {profileLoading || loading ? (
        <LoadingSkeleton variant="eventCard" count={6} />
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchEvents}
            className="px-6 py-3.5 bg-primary-900 text-white rounded-xl font-semibold hover:bg-primary-800 transition"
          >
            Retry
          </button>
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          description="You haven't created any events yet."
          actionLabel="Create Your First Event"
          actionHref="/organizer/events/create"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div key={event.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-gray-300 transition">
              <div className="mb-4">
                <span className={`inline-block px-2 py-1 text-xs rounded ${
                  event.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' :
                  event.status === 'LIVE' ? 'bg-blue-100 text-blue-800' :
                  event.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {event.status}
                </span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-primary-900">{event.title}</h3>
              <p className="text-sm text-gray-600 mb-2">
                {new Date(event.startDateTime).toLocaleDateString('en-NG', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
              <p className="text-sm text-gray-500 mb-4">{event.city}</p>
              {event._count && (
                <div className="text-sm text-gray-600 mb-4 space-y-1">
                  <p>Tickets Sold: {event._count.tickets || 0}</p>
                  <p>Orders: {event._count.orders || 0}</p>
                </div>
              )}
              <div className="flex gap-2">
                <Link
                  href={`/events/${event.slug || event.id}`}
                  className="flex-1 text-center px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                >
                  View Public
                </Link>
                <Link
                  href={`/organizer/events/${event.id}`}
                  className="flex-1 text-center px-4 py-2.5 bg-primary-900 text-white rounded-xl font-semibold hover:bg-primary-800 transition"
                >
                  Manage
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
