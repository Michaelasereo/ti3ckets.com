'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import PlatformStatsCard from '@/components/admin/PlatformStatsCard';

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await adminApi.dashboard.getAnalytics();
      if (response.data.success) {
        setAnalytics(response.data.data);
      } else {
        setError(response.data.error || 'Failed to load analytics');
      }
    } catch (err: any) {
      console.error('Error loading analytics:', err);
      setError(err.response?.data?.error || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary-900 mb-2">Platform Analytics</h1>
        <p className="text-gray-600">Detailed analytics and revenue insights</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <PlatformStatsCard
          title="Total Revenue"
          value={formatCurrency(analytics.totalRevenue)}
          subtitle="From all paid orders"
        />
        <PlatformStatsCard
          title="Total Fees Collected"
          value={formatCurrency(analytics.totalFees)}
          subtitle={`Platform: ${formatCurrency(analytics.totalPlatformFees)}, Paystack: ${formatCurrency(analytics.totalPaystackFees)}`}
        />
        <PlatformStatsCard
          title="Tickets Sold"
          value={analytics.totalTicketsSold.toLocaleString()}
          subtitle={`${analytics.totalOrders} orders`}
        />
        <PlatformStatsCard
          title="Average Order Value"
          value={formatCurrency(analytics.averageOrderValue)}
          subtitle="Per order"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-primary-900 mb-4">Top Events</h2>
          {analytics.topEvents.length === 0 ? (
            <p className="text-gray-600">No events with revenue yet</p>
          ) : (
            <div className="space-y-3">
              {analytics.topEvents.slice(0, 10).map((event: any, index: number) => (
                <div key={event.eventId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{index + 1}. {event.eventTitle}</p>
                    <p className="text-sm text-gray-500">{event.ticketsSold} tickets sold</p>
                  </div>
                  <p className="font-semibold text-primary-900">{formatCurrency(event.revenue)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-primary-900 mb-4">Top Organizers</h2>
          {analytics.topOrganizers.length === 0 ? (
            <p className="text-gray-600">No organizers with revenue yet</p>
          ) : (
            <div className="space-y-3">
              {analytics.topOrganizers.slice(0, 10).map((org: any, index: number) => (
                <div key={org.organizerId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{index + 1}. {org.organizerName || org.organizerEmail}</p>
                    <p className="text-sm text-gray-500">{org.eventCount} events</p>
                  </div>
                  <p className="font-semibold text-primary-900">{formatCurrency(org.revenue)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-primary-900 mb-4">Revenue by Month</h2>
        {Object.keys(analytics.revenueByMonth).length === 0 ? (
          <p className="text-gray-600">No revenue data available</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(analytics.revenueByMonth)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([month, revenue]: [string, any]) => (
                <div key={month} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-900">{month}</p>
                  <p className="font-semibold text-primary-900">{formatCurrency(revenue)}</p>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
