'use client';

import { useEffect, useState } from 'react';
import { organizerApi } from '@/lib/api';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import Link from 'next/link';

function formatCurrency(amount: number, currency: string = 'NGN') {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export type OrderSummaryRow = {
  eventId: string;
  eventTitle: string;
  ticketTypeId: string;
  ticketTypeName: string;
  orderCount: number;
  revenue: number;
};

export default function OrdersOverview() {
  const [rows, setRows] = useState<OrderSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportingId, setExportingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await organizerApi.getOrdersSummaryByTicketType();
      if (response.data.success) {
        setRows(response.data.data || []);
      } else {
        setError('Failed to fetch orders summary');
      }
    } catch (err: any) {
      console.error('Error fetching orders summary:', err);
      setError(err.response?.data?.error || 'Failed to fetch orders summary');
    } finally {
      setLoading(false);
    }
  };

  const handleExportEmails = async (eventId: string, ticketTypeId: string, ticketTypeName: string) => {
    const key = `${eventId}-${ticketTypeId}`;
    setExportingId(key);
    try {
      const response = await organizerApi.getEventOrders(eventId, {
        ticketTypeId,
        limit: 500,
      });
      if (!response.data.success || !response.data.data?.length) {
        return;
      }
      const orders = response.data.data as { customerEmail: string }[];
      const emails = [...new Set(orders.map((o) => o.customerEmail))];
      const safeName = ticketTypeName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      const csvContent = ['Email', ...emails].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders-emails-${safeName}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setExportingId(null);
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

  if (rows.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <p className="text-gray-500">No ticket types with orders yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Event
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ticket type
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Orders
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Revenue
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.map((row) => {
              const key = `${row.eventId}-${row.ticketTypeId}`;
              const isExporting = exportingId === key;
              return (
                <tr key={key} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-900">
                    {row.eventTitle}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {row.ticketTypeName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                    {row.orderCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                    {formatCurrency(row.revenue, 'NGN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right space-x-2">
                    <Link
                      href={`/organizer/settings/orders/events/${row.eventId}/ticket-types/${row.ticketTypeId}`}
                      className="text-primary-600 hover:text-primary-800 hover:underline"
                    >
                      View details
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleExportEmails(row.eventId, row.ticketTypeId, row.ticketTypeName)}
                      disabled={isExporting}
                      className="text-primary-600 hover:text-primary-800 hover:underline disabled:opacity-50"
                    >
                      {isExporting ? 'Exporting...' : 'Export emails'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
