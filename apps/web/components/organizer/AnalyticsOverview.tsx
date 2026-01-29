'use client';

import { useEffect, useState } from 'react';
import { organizerApi } from '@/lib/api';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import Link from 'next/link';

export type AnalyticsOverviewProps = {
  showTitle?: boolean;
};

export default function AnalyticsOverview({ showTitle = true }: AnalyticsOverviewProps) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await organizerApi.getEvents();
      if (response.data.success) {
        const events = response.data.data || [];
        let totalTicketsSold = 0;
        let totalOrders = 0;
        let totalEvents = events.length;
        let publishedEvents = 0;

        events.forEach((event: any) => {
          if (event.status === 'PUBLISHED' || event.status === 'LIVE') {
            publishedEvents++;
          }
          totalTicketsSold += event._count?.tickets || 0;
          totalOrders += event._count?.orders || 0;
        });

        setAnalytics({
          totalEvents,
          publishedEvents,
          totalTicketsSold,
          totalOrders,
          events,
        });
      } else {
        setError('Failed to fetch analytics');
      }
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
      setError(err.response?.data?.error || 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton variant="lines" count={6} />;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!analytics) {
    return <p className="text-gray-500">No analytics data available</p>;
  }

  return (
    <>
      {showTitle && (
        <h2 className="text-2xl font-bold text-primary-900 mb-6">Analytics Overview</h2>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Total Events</h3>
          <p className="text-3xl font-bold text-primary-800">{analytics.totalEvents || 0}</p>
          <p className="text-sm text-gray-500 mt-1">
            {analytics.publishedEvents || 0} published
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Total Tickets Sold</h3>
          <p className="text-3xl font-bold text-green-600">{analytics.totalTicketsSold || 0}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Total Orders</h3>
          <p className="text-3xl font-bold text-purple-600">{analytics.totalOrders || 0}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Active Events</h3>
          <p className="text-3xl font-bold text-blue-600">{analytics.publishedEvents || 0}</p>
        </div>
      </div>

      {/* Events List */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-primary-900 mb-4">Event Analytics</h2>
        {analytics.events && analytics.events.length === 0 ? (
          <p className="text-gray-500">
            No events yet.{' '}
            <Link href="/organizer/events/create" className="text-primary-600 hover:underline">
              Create your first event
            </Link>
          </p>
        ) : (
          <div className="space-y-4">
            {analytics.events?.map((event: any) => (
              <div
                key={event.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <Link
                      href={`/organizer/events/${event.id}/analytics`}
                      className="text-lg font-semibold text-primary-800 hover:text-primary-600 hover:underline"
                    >
                      {event.title}
                    </Link>
                    <div className="flex gap-4 mt-2 text-sm text-gray-600">
                      <span>{event._count?.tickets || 0} tickets sold</span>
                      <span>{event._count?.orders || 0} orders</span>
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          event.status === 'PUBLISHED'
                            ? 'bg-green-100 text-green-800'
                            : event.status === 'LIVE'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {event.status}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/organizer/events/${event.id}/analytics`}
                    className="px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
