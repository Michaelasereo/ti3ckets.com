'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { organizerApi } from '@/lib/api';
import OrganizerEventNav from '@/components/organizer/OrganizerEventNav';

export default function WaitlistPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchWaitlist();
    fetchEvent();
  }, [eventId]);

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

  const fetchWaitlist = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await organizerApi.getEventWaitlist(eventId);
      if (response.data.success) {
        setWaitlist(response.data.data || []);
      } else {
        setError('Failed to fetch waitlist');
      }
    } catch (err: any) {
      console.error('Error fetching waitlist:', err);
      setError(err.response?.data?.error || 'Failed to fetch waitlist');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Email', 'Phone', 'Ticket Type', 'Quantity', 'Notified', 'Date Added'];
    const rows = waitlist.map((entry) => [
      entry.email,
      entry.phone || 'N/A',
      entry.ticketType?.name || 'Any',
      entry.quantity,
      entry.notified ? 'Yes' : 'No',
      new Date(entry.createdAt).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waitlist-${eventId}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <OrganizerEventNav eventId={eventId} active="waitlist" showSeats={!!event?.isSeated} />
        <p>Loading waitlist...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <OrganizerEventNav eventId={eventId} eventTitle={event?.title} active="waitlist" showSeats={!!event?.isSeated} />

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Waitlist</h1>
          {event && <p className="text-gray-600 mt-1">{event.title}</p>}
        </div>
        {waitlist.length > 0 && (
          <div className="flex gap-3">
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
            >
              Export CSV
            </button>
            <button
              onClick={() => {
                // TODO: Implement notification sending API
                alert('Notification feature coming soon. This will send emails to all waitlist members when tickets become available.');
              }}
              className="px-4 py-2 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition"
            >
              Notify All
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {waitlist.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">No one has joined the waitlist yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ticket Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notified
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date Added
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {waitlist.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {entry.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.phone || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.ticketType?.name || 'Any'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          entry.notified
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {entry.notified ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(entry.createdAt).toLocaleDateString('en-NG', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6 text-sm text-gray-600">
        <p>Total entries: {waitlist.length}</p>
        <p>Notified: {waitlist.filter((e) => e.notified).length}</p>
      </div>
    </div>
  );
}
