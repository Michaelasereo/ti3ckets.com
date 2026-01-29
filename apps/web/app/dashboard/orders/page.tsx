'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usersApi } from '@/lib/api';
import PageContainer from '@/components/ui/PageContainer';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSkeleton, { SkeletonLines } from '@/components/ui/LoadingSkeleton';

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await usersApi.getOrders();
      if (response.data.success) {
        setOrders(response.data.data || []);
      } else {
        setError('Failed to fetch orders');
      }
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      const errorMessage = error.response?.data?.error || 'Failed to fetch orders';
      setError(errorMessage);
      
      // If authentication error, redirect to login
      if (error.response?.status === 401) {
        // Clear any stale auth data
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          sessionStorage.removeItem('auth_token');
          sessionStorage.removeItem('refresh_token');
          sessionStorage.removeItem('user');
        }
        
        // Redirect to login after a short delay
        setTimeout(() => {
          router.push('/auth/login?redirect=/dashboard/orders');
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <SkeletonLines lines={6} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="mb-6">
        <Link href="/dashboard/tickets" className="text-primary-800 hover:text-primary-600 text-[15px]">
          ← Back to Tickets
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-primary-900 mb-8">Order History</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600 mb-2">{error}</p>
          {error.includes('token') || error.includes('expired') || error.includes('Unauthorized') ? (
            <p className="text-sm text-red-500">
              Your session has expired. Please log in again. Redirecting to login page...
            </p>
          ) : null}
        </div>
      )}

      {orders.length === 0 ? (
        <EmptyState
          description="You don't have any orders yet."
          actionLabel="Browse Events"
          actionHref="/events"
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    {order.event?.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Order #{order.orderNumber}
                  </p>
                  <p className="text-sm text-gray-600">
                    {new Date(order.createdAt).toLocaleDateString('en-NG', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary-800 mb-2">
                    {formatCurrency(Number(order.totalAmount), order.currency)}
                  </p>
                  <span
                    className={`inline-block px-3 py-1 rounded text-sm font-semibold ${getStatusColor(
                      order.status
                    )}`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                <div>
                  <p className="text-gray-600">Tickets</p>
                  <p className="font-semibold">{order._count?.tickets || 0}</p>
                </div>
                <div>
                  <p className="text-gray-600">Event Date</p>
                  <p className="font-semibold">
                    {order.event?.startDateTime
                      ? new Date(order.event.startDateTime).toLocaleDateString(
                          'en-NG',
                          {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          }
                        )
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Venue</p>
                  <p className="font-semibold">{order.event?.venueName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-600">City</p>
                  <p className="font-semibold">{order.event?.city || 'N/A'}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Link
                  href={`/events/${order.event?.slug || order.event?.id}`}
                  className="px-4 py-2.5 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition font-medium"
                >
                  View Event
                </Link>
                <Link
                  href={`/orders/${order.id}`}
                  className="px-4 py-2.5 bg-primary-900 text-white rounded-xl font-semibold hover:bg-primary-800 transition"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
