'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { EventStatus } from '@prisma/client';

export default function AdminEventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (eventId) {
      loadEvent();
    }
  }, [eventId]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      const response = await adminApi.events.get(eventId);
      if (response.data.success) {
        setEvent(response.data.data);
      } else {
        setError(response.data.error || 'Failed to load event');
      }
    } catch (err: any) {
      console.error('Error loading event:', err);
      setError(err.response?.data?.error || 'Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (status: EventStatus) => {
    if (!confirm(`Change event status to ${status}?`)) {
      return;
    }
    try {
      await adminApi.events.updateStatus(eventId, { status });
      loadEvent();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update event status');
    }
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

  if (error || !event) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error || 'Event not found'}</p>
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
        <h1 className="text-3xl font-bold text-primary-900 mb-2">Event Details</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-primary-900 mb-4">Event Information</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Title</dt>
                <dd className="text-sm text-gray-900">{event.title}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="text-sm text-gray-900">{event.description || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Category</dt>
                <dd className="text-sm text-gray-900">{event.category}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Venue</dt>
                <dd className="text-sm text-gray-900">{event.venueName}, {event.city}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="text-sm">
                  <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                    event.status === 'LIVE' ? 'bg-green-100 text-green-800' :
                    event.status === 'PUBLISHED' ? 'bg-blue-100 text-blue-800' :
                    event.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' :
                    event.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {event.status}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Start Date</dt>
                <dd className="text-sm text-gray-900">{new Date(event.startDateTime).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">End Date</dt>
                <dd className="text-sm text-gray-900">{new Date(event.endDateTime).toLocaleString()}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-primary-900 mb-4">Organizer</h2>
            <p className="text-sm text-gray-900">{event.organizer.name || event.organizer.email}</p>
            {event.organizer.organizerProfile && (
              <p className="text-sm text-gray-600">
                {event.organizer.organizerProfile.businessName} - {event.organizer.organizerProfile.verificationStatus}
              </p>
            )}
          </div>

          {event.orders && event.orders.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-primary-900 mb-4">Recent Orders</h2>
              <div className="space-y-2">
                {event.orders.map((order: any) => (
                  <div key={order.id} className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium text-gray-900">{order.orderNumber}</p>
                    <p className="text-sm text-gray-600">{order.tickets.length} tickets</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-primary-900 mb-4">Event Statistics</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Total Orders</dt>
                <dd className="text-2xl font-bold text-primary-900">{event._count.orders}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Total Tickets</dt>
                <dd className="text-2xl font-bold text-primary-900">{event._count.tickets}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-primary-900 mb-4">Status Actions</h2>
            <div className="space-y-3">
              {event.status !== 'CANCELLED' && (
                <button
                  onClick={() => handleStatusChange(EventStatus.CANCELLED)}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
                >
                  Cancel Event
                </button>
              )}
              {event.status === 'CANCELLED' && (
                <button
                  onClick={() => handleStatusChange(EventStatus.DRAFT)}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700"
                >
                  Restore to Draft
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
