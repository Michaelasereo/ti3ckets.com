'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import PlatformStatsCard from '@/components/admin/PlatformStatsCard';

interface PlatformStats {
  totalUsers: number;
  totalBuyers: number;
  totalOrganizers: number;
  totalAdmins: number;
  totalEvents: number;
  publishedEvents: number;
  totalOrders: number;
  paidOrders: number;
  totalTicketsSold: number;
  totalRevenue: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await adminApi.dashboard.getStats();
      if (response.data.success) {
        setStats(response.data.data);
      } else {
        setError(response.data.error || 'Failed to load statistics');
      }
    } catch (err: any) {
      console.error('Error loading stats:', err);
      setError(err.response?.data?.error || 'Failed to load statistics');
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

  if (!stats) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary-900 mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Platform overview and statistics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <PlatformStatsCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          subtitle="From all paid orders"
        />
        <PlatformStatsCard
          title="Total Users"
          value={stats.totalUsers.toLocaleString()}
          subtitle={`${stats.totalBuyers} buyers, ${stats.totalOrganizers} organizers, ${stats.totalAdmins} admins`}
        />
        <PlatformStatsCard
          title="Total Events"
          value={stats.totalEvents.toLocaleString()}
          subtitle={`${stats.publishedEvents} published/live`}
        />
        <PlatformStatsCard
          title="Total Orders"
          value={stats.totalOrders.toLocaleString()}
          subtitle={`${stats.paidOrders} paid orders`}
        />
        <PlatformStatsCard
          title="Tickets Sold"
          value={stats.totalTicketsSold.toLocaleString()}
          subtitle="Across all events"
        />
        <PlatformStatsCard
          title="Buyers"
          value={stats.totalBuyers.toLocaleString()}
          subtitle="Registered buyers"
        />
        <PlatformStatsCard
          title="Organizers"
          value={stats.totalOrganizers.toLocaleString()}
          subtitle="Registered organizers"
        />
        <PlatformStatsCard
          title="Published Events"
          value={stats.publishedEvents.toLocaleString()}
          subtitle={`${stats.totalEvents - stats.publishedEvents} draft/other`}
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-primary-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/admin/users"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            <h3 className="font-semibold text-primary-900 mb-1">Manage Users</h3>
            <p className="text-sm text-gray-600">View and manage user accounts</p>
          </a>
          <a
            href="/admin/organizers"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            <h3 className="font-semibold text-primary-900 mb-1">Verify Organizers</h3>
            <p className="text-sm text-gray-600">Review and verify organizer accounts</p>
          </a>
          <a
            href="/admin/events"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            <h3 className="font-semibold text-primary-900 mb-1">Moderate Events</h3>
            <p className="text-sm text-gray-600">Review and moderate events</p>
          </a>
          <a
            href="/admin/orders"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            <h3 className="font-semibold text-primary-900 mb-1">View Orders</h3>
            <p className="text-sm text-gray-600">View all platform orders</p>
          </a>
          <a
            href="/admin/analytics"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            <h3 className="font-semibold text-primary-900 mb-1">Platform Analytics</h3>
            <p className="text-sm text-gray-600">Detailed analytics and reports</p>
          </a>
          <a
            href="/admin/settings"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            <h3 className="font-semibold text-primary-900 mb-1">System Settings</h3>
            <p className="text-sm text-gray-600">Configure platform settings</p>
          </a>
        </div>
      </div>
    </div>
  );
}
