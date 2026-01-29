'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { organizerApi } from '@/lib/api';
import PageContainer from '@/components/ui/PageContainer';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import { useProfileCheck } from '@/hooks/useProfileCheck';
import Link from 'next/link';

function formatCurrency(amount: number, currency: string = 'NGN') {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function OrderDetailsByTicketTypePage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const ticketTypeId = params.ticketTypeId as string;
  const [event, setEvent] = useState<{ title: string; slug?: string } | null>(null);
  const [ticketTypeName, setTicketTypeName] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { loading: profileLoading } = useProfileCheck('organizer');

  useEffect(() => {
    if (!eventId || !ticketTypeId) return;
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const [eventRes, ordersRes] = await Promise.all([
          organizerApi.getEvent(eventId),
          organizerApi.getEventOrders(eventId, { ticketTypeId, limit: 500 }),
        ]);
        if (eventRes.data.success && eventRes.data.data) {
          setEvent(eventRes.data.data);
          const tt = (eventRes.data.data as any).ticketTypes?.find((t: any) => t.id === ticketTypeId);
          if (tt) setTicketTypeName(tt.name || '');
        }
        if (ordersRes.data.success && ordersRes.data.data?.length) {
          setOrders(ordersRes.data.data);
          if (!ticketTypeName && ordersRes.data.data[0]?.tickets?.length) {
            const first = ordersRes.data.data[0].tickets.find((t: any) => t.ticketTypeId === ticketTypeId);
            if (first?.ticketType?.name) setTicketTypeName(first.ticketType.name);
          }
        } else if (ordersRes.data.success) {
          setOrders([]);
        }
      } catch (err: any) {
        console.error('Error loading orders:', err);
        setError(err.response?.data?.error || 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [eventId, ticketTypeId]);

  useEffect(() => {
    if (orders.length > 0 && !ticketTypeName) {
      const first = orders[0].tickets?.find((t: any) => t.ticketTypeId === ticketTypeId);
      if (first?.ticketType?.name) setTicketTypeName(first.ticketType.name);
    }
  }, [orders, ticketTypeId, ticketTypeName]);

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
  const handleExportEmails = () => {
    const emails = [...new Set(orders.map((o) => o.customerEmail))];
    const safeName = (ticketTypeName || 'ticket-type').replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const slug = (event as any)?.slug || eventId;
    const csvContent = ['Email', ...emails].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-emails-${slug}-${safeName}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (profileLoading || loading) {
    return (
      <PageContainer>
        <LoadingSkeleton variant="lines" count={6} />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-600">{error}</p>
          <Link href="/organizer/settings?tab=orders" className="mt-4 inline-block text-primary-600 hover:underline">
            Back to Orders
          </Link>
        </div>
      </PageContainer>
    );
  }

  const displayTicketTypeName = ticketTypeName || 'Ticket type';

  return (
    <PageContainer>
      <div className="mb-6">
        <Link
          href="/organizer/settings?tab=orders"
          className="text-sm text-primary-600 hover:text-primary-800 hover:underline"
        >
          Back to Orders
        </Link>
      </div>
      <h1 className="text-3xl font-bold text-primary-900 mb-2">
        {event?.title} — {displayTicketTypeName}
      </h1>
      <p className="text-gray-600 mb-6">Orders for this ticket type</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Total orders</h3>
          <p className="text-3xl font-bold text-primary-800">{orders.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Total revenue</h3>
          <p className="text-3xl font-bold text-green-600">{formatCurrency(totalRevenue, 'NGN')}</p>
        </div>
      </div>

      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={handleExportEmails}
          disabled={orders.length === 0}
          className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
        >
          Export emails
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <p className="text-gray-500">No orders for this ticket type yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-900">
                      {order.orderNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {order.customerEmail}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(order.createdAt).toLocaleDateString('en-NG', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-right">
                      {formatCurrency(Number(order.totalAmount || 0), order.currency || 'NGN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
