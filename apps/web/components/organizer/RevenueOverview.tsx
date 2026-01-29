'use client';

import { useEffect, useState } from 'react';
import { organizerRevenueApi } from '@/lib/api';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import Link from 'next/link';

export type RevenueOverviewProps = {
  showTitle?: boolean;
};

function formatCurrency(amount: number, currency: string = 'NGN') {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function RevenueOverview({ showTitle = true }: RevenueOverviewProps) {
  const [revenue, setRevenue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRevenue();
  }, []);

  const fetchRevenue = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await organizerRevenueApi.get();
      if (response.data.success) {
        setRevenue(response.data.data);
      } else {
        setError('Failed to fetch revenue data');
      }
    } catch (err: any) {
      console.error('Error fetching revenue:', err);
      setError(err.response?.data?.error || 'Failed to fetch revenue data');
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

  if (!revenue) {
    return <p className="text-gray-500">No revenue data available</p>;
  }

  const summary = revenue.summary || {};
  const events = revenue.events || [];

  return (
    <>
      {showTitle && (
        <h2 className="text-2xl font-bold text-primary-900 mb-6">Revenue Dashboard</h2>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Total Revenue</h3>
          <p className="text-3xl font-bold text-primary-800">
            {formatCurrency(Number(summary.totalRevenue || 0), 'NGN')}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Available Balance</h3>
          <p className="text-3xl font-bold text-green-600">
            {formatCurrency(Number(summary.availableBalance || 0), 'NGN')}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Platform Fee</h3>
          <p className="text-3xl font-bold text-orange-600">
            {formatCurrency(Number(summary.platformFee || 0), 'NGN')}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Total Events</h3>
          <p className="text-3xl font-bold text-blue-600">{events.length}</p>
        </div>
      </div>

      {/* Events Revenue Table */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-primary-900 mb-4">Revenue by Event</h2>
        {events.length === 0 ? (
          <p className="text-gray-500">No events with revenue yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Event</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Revenue</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Tickets Sold</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event: any) => (
                  <tr key={event.eventId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <Link
                        href={`/organizer/events/${event.eventId}`}
                        className="text-primary-800 hover:text-primary-600 hover:underline"
                      >
                        {event.eventTitle}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold">
                      {formatCurrency(Number(event.revenue || 0), 'NGN')}
                    </td>
                    <td className="py-3 px-4 text-right">{event.ticketsSold || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
