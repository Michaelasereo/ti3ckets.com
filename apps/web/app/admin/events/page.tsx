'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import Link from 'next/link';
import { EventStatus } from '@prisma/client';

export default function AdminEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
  });

  useEffect(() => {
    loadEvents();
  }, [page, filters]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 20 };
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;

      const response = await adminApi.events.list(params);
      if (response.data.success) {
        setEvents(response.data.data.events);
        setTotalPages(response.data.data.pagination.totalPages);
      } else {
        setError(response.data.error || 'Failed to load events');
      }
    } catch (err: any) {
      console.error('Error loading events:', err);
      setError(err.response?.data?.error || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (eventId: string, status: EventStatus) => {
    try {
      await adminApi.events.updateStatus(eventId, { status });
      loadEvents();
    } catch (err: any) {
      console.error('Error updating event status:', err);
      alert(err.response?.data?.error || 'Failed to update event status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'LIVE':
        return 'bg-green-100 text-green-800';
      case 'PUBLISHED':
        return 'bg-blue-100 text-blue-800';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'COMPLETED':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary-900 mb-2">Event Moderation</h1>
        <p className="text-gray-600">Review and moderate all platform events</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">All Statuses</option>
              <option value={EventStatus.DRAFT}>Draft</option>
              <option value={EventStatus.PUBLISHED}>Published</option>
              <option value={EventStatus.LIVE}>Live</option>
              <option value={EventStatus.CANCELLED}>Cancelled</option>
              <option value={EventStatus.COMPLETED}>Completed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search events..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-600">Loading events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-600">No events found</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organizer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Activity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/events/${event.id}`}
                        className="text-sm font-medium text-primary-900 hover:text-primary-700"
                      >
                        {event.title}
                      </Link>
                      <p className="text-sm text-gray-500">{event.city}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{event.organizer.name || event.organizer.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(event.status)}`}>
                        {event.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <p>{event._count.orders} orders</p>
                      <p>{event._count.tickets} tickets</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/events/${event.id}`}
                          className="text-primary-600 hover:text-primary-900 text-sm"
                        >
                          View
                        </Link>
                        {event.status !== 'CANCELLED' && (
                          <button
                            onClick={() => handleStatusChange(event.id, EventStatus.CANCELLED)}
                            className="text-red-600 hover:text-red-900 text-sm"
                          >
                            Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-600">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
