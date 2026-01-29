'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { organizerApi } from '@/lib/api';
import OrganizerEventNav from '@/components/organizer/OrganizerEventNav';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';

export default function EventAnalyticsPage() {
  const params = useParams();
  const eventId = params.id as string;
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnalytics();
  }, [eventId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Performance monitoring
      const startTime = performance.now();
      console.time('analytics-fetch');
      
      const response = await organizerApi.getEventAnalytics(eventId);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      console.timeEnd('analytics-fetch');
      
      // Log slow requests
      if (duration > 1000) {
        console.warn(`⚠️ Slow analytics fetch: ${duration.toFixed(2)}ms`);
      } else {
        console.log(`✅ Analytics fetched in ${duration.toFixed(2)}ms`);
      }
      
      if (response.data.success) {
        setAnalytics(response.data.data);
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

  const formatCurrency = (amount: number, currency: string = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <OrganizerEventNav eventId={eventId} active="analytics" />
        <LoadingSkeleton variant="lines" count={6} className="mt-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <OrganizerEventNav eventId={eventId} active="analytics" />
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-600">{error}</p>
          <Link
            href="/organizer/dashboard"
            className="mt-4 text-primary-800 hover:underline"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="container mx-auto px-4 py-8">
        <OrganizerEventNav eventId={eventId} active="analytics" />
        <p>No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <OrganizerEventNav eventId={eventId} eventTitle={analytics.event?.title} active="analytics" showSeats={!!analytics?.event?.isSeated} />

      <h1 className="text-3xl font-bold text-primary-900 mb-8">
        Analytics: {analytics.event?.title}
      </h1>

      <div className="mb-4">
        <span
          className={`inline-block px-3 py-1 rounded text-sm font-semibold ${
            analytics.event?.status === 'PUBLISHED'
              ? 'bg-green-100 text-green-800'
              : analytics.event?.status === 'LIVE'
              ? 'bg-blue-100 text-blue-800'
              : analytics.event?.status === 'DRAFT'
              ? 'bg-gray-100 text-gray-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {analytics.event?.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Revenue Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Total Revenue</h3>
          <p className="text-3xl font-bold text-primary-800">
            {formatCurrency(analytics.revenue?.total || 0, analytics.revenue?.currency)}
          </p>
        </div>

        {/* Tickets Sold Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Tickets Sold</h3>
          <p className="text-3xl font-bold text-green-600">
            {analytics.tickets?.sold || 0}
          </p>
        </div>

        {/* Tickets Available Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Tickets Available</h3>
          <p className="text-3xl font-bold text-blue-600">
            {analytics.tickets?.available || 0}
          </p>
        </div>

        {/* Orders Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Total Orders</h3>
          <p className="text-3xl font-bold text-purple-600">
            {analytics.orders?.total || 0}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {analytics.orders?.paid || 0} paid
          </p>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-primary-900 mb-4">Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-600">Total Tickets</p>
            <p className="text-2xl font-bold">
              {(analytics.tickets?.sold || 0) + (analytics.tickets?.available || 0)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Sold Out Percentage</p>
            <p className="text-2xl font-bold">
              {analytics.tickets?.sold && analytics.tickets?.available
                ? Math.round(
                    (analytics.tickets.sold /
                      (analytics.tickets.sold + analytics.tickets.available)) *
                      100
                  )
                : 0}
              %
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Average Order Value</p>
            <p className="text-2xl font-bold">
              {analytics.orders?.total > 0
                ? formatCurrency(
                    (analytics.revenue?.total || 0) / analytics.orders.total,
                    analytics.revenue?.currency
                  )
                : formatCurrency(0, analytics.revenue?.currency)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
