'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { organizerApi } from '@/lib/api';
import OrganizerEventNav from '@/components/organizer/OrganizerEventNav';

export default function CheckInPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const [event, setEvent] = useState<any>(null);
  const [ticketNumber, setTicketNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [checkedInTickets, setCheckedInTickets] = useState<any[]>([]);
  const [totalTickets, setTotalTickets] = useState(0);

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const [eventResponse, analyticsResponse] = await Promise.all([
        organizerApi.getEvent(eventId),
        organizerApi.getEventAnalytics(eventId).catch(() => ({ data: { success: false } })),
      ]);
      
      if (eventResponse.data.success) {
        setEvent(eventResponse.data.data);
      }
      
      // Get total tickets from analytics
      if (analyticsResponse.data.success) {
        const analytics = analyticsResponse.data.data;
        const totalSold = analytics.tickets?.sold || 0;
        const totalAvailable = analytics.tickets?.available || 0;
        setTotalTickets(totalSold + totalAvailable);
      }
    } catch (err) {
      console.error('Error fetching event:', err);
    }
  };

  const handleCheckIn = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (!ticketNumber.trim()) {
      setError('Please enter a ticket number');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await organizerApi.checkInTicket(eventId, {
        ticketNumber: ticketNumber.trim(),
      });

      if (response.data.success) {
        setSuccess(`Ticket ${ticketNumber} checked in successfully!`);
        setTicketNumber('');
        
        // Add to checked in list
        setCheckedInTickets([response.data.data.ticket, ...checkedInTickets]);
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.data.error || 'Failed to check in ticket');
      }
    } catch (err: any) {
      console.error('Error checking in:', err);
      setError(err.response?.data?.error || 'Failed to check in ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleQRScan = async (qrData: string) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await organizerApi.checkInTicket(eventId, {
        qrCodeData: qrData,
      });

      if (response.data.success) {
        setSuccess(`Ticket checked in successfully!`);
        setCheckedInTickets([response.data.data.ticket, ...checkedInTickets]);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.data.error || 'Failed to check in ticket');
      }
    } catch (err: any) {
      console.error('Error checking in:', err);
      setError(err.response?.data?.error || 'Failed to check in ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleCameraScan = () => {
    // Prompt for QR code data (can be pasted from scanner or entered manually)
    const qrData = prompt('Enter QR code data (scan with your device camera or paste the code):');
    if (qrData && qrData.trim()) {
      handleQRScan(qrData.trim());
    }
  };

  const handlePasteQR = () => {
    // Allow pasting QR code data from clipboard
    navigator.clipboard.readText().then((text) => {
      if (text && text.trim()) {
        handleQRScan(text.trim());
      } else {
        setError('No QR code data found in clipboard');
      }
    }).catch(() => {
      // Fallback to prompt if clipboard access fails
      handleCameraScan();
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <OrganizerEventNav eventId={eventId} eventTitle={event?.title} active="check-in" showSeats={!!event?.isSeated} />

      <h1 className="text-3xl font-bold text-primary-900 mb-8">Check-In</h1>
      {event && <p className="text-gray-600 mb-6">{event.title}</p>}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-600">Checked In</p>
          <p className="text-2xl font-bold text-green-600">{checkedInTickets.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-600">Total Tickets</p>
          <p className="text-2xl font-bold">{totalTickets || 'N/A'}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-600">Remaining</p>
          <p className="text-2xl font-bold">
            {totalTickets ? totalTickets - checkedInTickets.length : 'N/A'}
          </p>
        </div>
      </div>

      {/* Check-in Form */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Check In Ticket</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            {success}
          </div>
        )}

        <form onSubmit={handleCheckIn} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Ticket Number</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={ticketNumber}
                onChange={(e) => setTicketNumber(e.target.value.toUpperCase())}
                placeholder="Enter ticket number"
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                autoFocus
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3.5 bg-primary-900 text-white rounded-xl font-semibold hover:bg-primary-800 transition disabled:opacity-50"
              >
                {loading ? 'Checking...' : 'Check In'}
              </button>
            </div>
          </div>

          <div className="text-center">
            <span className="text-gray-500">or</span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCameraScan}
              className="flex-1 px-6 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
            >
              Enter QR Code
            </button>
            <button
              type="button"
              onClick={handlePasteQR}
              className="flex-1 px-6 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
            >
              Paste QR Code
            </button>
          </div>
          <p className="text-xs text-gray-500 text-center">
            Tip: Use your device camera to scan QR codes, then paste the result here
          </p>
        </form>
      </div>

      {/* Recently Checked In */}
      {checkedInTickets.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Recently Checked In</h2>
          <div className="space-y-2">
            {checkedInTickets.slice(0, 10).map((ticket) => (
              <div
                key={ticket.id}
                className="flex justify-between items-center p-3 bg-green-50 rounded"
              >
                <div>
                  <p className="font-semibold">Ticket #{ticket.ticketNumber}</p>
                  <p className="text-sm text-gray-600">
                    {ticket.order?.customerName || ticket.order?.customerEmail}
                  </p>
                </div>
                <div className="text-sm text-gray-600">
                  {ticket.checkedInAt
                    ? new Date(ticket.checkedInAt).toLocaleTimeString('en-NG', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Just now'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
