'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const response = await adminApi.orders.get(orderId);
      if (response.data.success) {
        setOrder(response.data.data);
      } else {
        setError(response.data.error || 'Failed to load order');
      }
    } catch (err: any) {
      console.error('Error loading order:', err);
      setError(err.response?.data?.error || 'Failed to load order');
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
          <div className="h-96 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error || 'Order not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-primary-800 hover:text-primary-600 mb-4"
        >
          ← Back
        </button>
        <h1 className="text-3xl font-bold text-primary-900 mb-2">Order Details</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-primary-900 mb-4">Order Information</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Order Number</dt>
                <dd className="text-sm text-gray-900">{order.orderNumber}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="text-sm">
                  <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                    order.status === 'PAID' ? 'bg-green-100 text-green-800' :
                    order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                    order.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {order.status}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Total Amount</dt>
                <dd className="text-sm text-gray-900 font-semibold">
                  {formatCurrency(Number(order.totalAmount))}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Created At</dt>
                <dd className="text-sm text-gray-900">{new Date(order.createdAt).toLocaleString()}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-primary-900 mb-4">Customer</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="text-sm text-gray-900">{order.customerName || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="text-sm text-gray-900">{order.customerEmail}</dd>
              </div>
              {order.customerPhone && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Phone</dt>
                  <dd className="text-sm text-gray-900">{order.customerPhone}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-primary-900 mb-4">Event</h2>
            <p className="text-sm font-medium text-gray-900">{order.event.title}</p>
            <p className="text-sm text-gray-600">{order.event.venueName}, {order.event.city}</p>
            <p className="text-sm text-gray-600">
              Organizer: {order.event.organizer.name || order.event.organizer.email}
            </p>
          </div>

          {order.tickets && order.tickets.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-primary-900 mb-4">Tickets</h2>
              <div className="space-y-3">
                {order.tickets.map((ticket: any) => (
                  <div key={ticket.id} className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium text-gray-900">{ticket.ticketNumber}</p>
                    <p className="text-sm text-gray-600">{ticket.ticketType.name}</p>
                    <p className="text-sm text-gray-600">
                      {formatCurrency(Number(ticket.ticketType.price))}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
