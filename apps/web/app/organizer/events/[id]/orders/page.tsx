'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { organizerApi } from '@/lib/api';
import OrganizerEventNav from '@/components/organizer/OrganizerEventNav';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonLines } from '@/components/ui/LoadingSkeleton';

export default function OrdersPage() {
  const params = useParams();
  const eventId = params.id as string;
  const [orders, setOrders] = useState<any[]>([]);
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  useEffect(() => {
    fetchOrders();
  }, [eventId, statusFilter, pagination.page]);

  const fetchEvent = async () => {
    try {
      const response = await organizerApi.getEvent(eventId);
      if (response.data.success) {
        setEvent(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching event:', err);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await organizerApi.getEventOrders(eventId, {
        status: statusFilter || undefined,
        page: pagination.page,
        limit: pagination.limit,
      });
      if (response.data.success) {
        setOrders(response.data.data || []);
        if (response.data.pagination) {
          setPagination((prev) => ({
            ...prev,
            ...response.data.pagination,
          }));
        }
      } else {
        setError('Failed to fetch orders');
      }
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      setError(err.response?.data?.error || 'Failed to fetch orders');
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

  const exportToCSV = () => {
    const headers = ['Order Number', 'Customer Email', 'Customer Name', 'Date', 'Amount', 'Status', 'Tickets'];
    const rows = orders.map((order) => [
      order.orderNumber,
      order.customerEmail,
      order.customerName || 'N/A',
      new Date(order.createdAt).toLocaleDateString(),
      Number(order.totalAmount).toFixed(2),
      order.status,
      order._count?.tickets || 0,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${eventId}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <OrganizerEventNav eventId={eventId} active="orders" showSeats={!!event?.isSeated} />
        <SkeletonLines lines={8} />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <OrganizerEventNav eventId={eventId} eventTitle={event?.title} active="orders" showSeats={!!event?.isSeated} />

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary-900">Orders</h1>
          {event && <p className="text-gray-600 mt-1">{event.title}</p>}
        </div>
        {orders.length > 0 && (
          <button
            onClick={exportToCSV}
            className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
          >
            Export CSV
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-3">
        <input
          type="text"
          placeholder="Search by email, name, or order number..."
          onChange={(e) => {
            // Client-side search - in production, this could be server-side
            const searchTerm = e.target.value.toLowerCase();
            // This is a simple implementation - for production, implement proper search
          }}
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPagination({ ...pagination, page: 1 });
          }}
          className="px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="PAID">Paid</option>
          <option value="FAILED">Failed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {orders.length === 0 ? (
        <EmptyState description="No orders found." />
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tickets
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {order.orderNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>{order.customerEmail}</div>
                        {order.customerName && (
                          <div className="text-xs text-gray-400">{order.customerName}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString('en-NG', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                        {formatCurrency(Number(order.totalAmount), order.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order._count?.tickets || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded font-semibold ${getStatusColor(
                            order.status
                          )}`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="text-primary-800 hover:underline"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-6 flex justify-center gap-2">
              <button
                onClick={() => {
                  if (pagination.page > 1) {
                    setPagination({ ...pagination, page: pagination.page - 1 });
                  }
                }}
                disabled={pagination.page === 1}
                className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
              >
                Previous
              </button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setPagination({ ...pagination, page })}
                  className={`px-4 py-2.5 rounded-xl ${
                    page === pagination.page
                      ? 'bg-primary-900 text-white font-semibold'
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  } transition`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => {
                  if (pagination.page < pagination.totalPages) {
                    setPagination({ ...pagination, page: pagination.page + 1 });
                  }
                }}
                disabled={pagination.page === pagination.totalPages}
                className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Order Details</h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <strong>Order Number:</strong> {selectedOrder.orderNumber}
              </div>
              <div>
                <strong>Status:</strong>{' '}
                <span className={`px-2 py-1 rounded text-sm ${getStatusColor(selectedOrder.status)}`}>
                  {selectedOrder.status}
                </span>
              </div>
              <div>
                <strong>Customer Email:</strong> {selectedOrder.customerEmail}
              </div>
              {selectedOrder.customerName && (
                <div>
                  <strong>Customer Name:</strong> {selectedOrder.customerName}
                </div>
              )}
              {selectedOrder.customerPhone && (
                <div>
                  <strong>Customer Phone:</strong> {selectedOrder.customerPhone}
                </div>
              )}
              <div>
                <strong>Date:</strong>{' '}
                {new Date(selectedOrder.createdAt).toLocaleString('en-NG')}
              </div>
              <div>
                <strong>Total Amount:</strong>{' '}
                {formatCurrency(Number(selectedOrder.totalAmount), selectedOrder.currency)}
              </div>
              {selectedOrder.promoCode && (
                <div>
                  <strong>Promo Code:</strong> {selectedOrder.promoCode}
                </div>
              )}
              {selectedOrder.discountAmount && (
                <div>
                  <strong>Discount:</strong>{' '}
                  {formatCurrency(Number(selectedOrder.discountAmount), selectedOrder.currency)}
                </div>
              )}
              <div>
                <strong>Tickets ({selectedOrder.tickets?.length || 0}):</strong>
                <div className="mt-2 space-y-2">
                  {selectedOrder.tickets?.map((ticket: any) => (
                    <div key={ticket.id} className="bg-gray-50 p-3 rounded">
                      <p className="text-sm">
                        <strong>Ticket #:</strong> {ticket.ticketNumber}
                      </p>
                      <p className="text-sm">
                        <strong>Status:</strong> {ticket.status}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
