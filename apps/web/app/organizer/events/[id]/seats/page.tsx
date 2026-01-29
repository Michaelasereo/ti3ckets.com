'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { organizerApi } from '@/lib/api';
import OrganizerEventNav from '@/components/organizer/OrganizerEventNav';
import { SkeletonLines } from '@/components/ui/LoadingSkeleton';

export default function SeatsPage() {
  const params = useParams();
  const eventId = params.id as string;
  const [seats, setSeats] = useState<any[]>([]);
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [creating, setCreating] = useState(false);

  // Single seat form
  const [section, setSection] = useState('');
  const [row, setRow] = useState('');
  const [number, setNumber] = useState('');
  const [tier, setTier] = useState('');

  useEffect(() => {
    fetchEvent();
    fetchSeats();
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

  const fetchSeats = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await organizerApi.getEventSeats(eventId);
      if (response.data.success) {
        setSeats(response.data.data || []);
      } else {
        setError('Failed to fetch seats');
      }
    } catch (err: any) {
      console.error('Error fetching seats:', err);
      setError(err.response?.data?.error || 'Failed to fetch seats');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkCreate = async () => {
    if (!bulkInput.trim()) {
      setError('Please enter seat data');
      return;
    }

    setCreating(true);
    setError('');

    try {
      // Parse CSV or JSON format
      // Format: section,row,number,tier (one per line)
      const lines = bulkInput.trim().split('\n');
      const seatData = lines
        .map((line) => {
          const parts = line.split(',').map((p) => p.trim());
          if (parts.length < 3) return null;
          return {
            section: parts[0],
            row: parts[1] || undefined,
            number: parts[2],
            tier: parts[3] || undefined,
          };
        })
        .filter((s): s is { section: string; row?: string; number: string; tier?: string } => s !== null);

      if (seatData.length === 0) {
        setError('No valid seat data found');
        setCreating(false);
        return;
      }

      const response = await organizerApi.createSeats(eventId, seatData);
      if (response.data.success) {
        setBulkInput('');
        setShowBulkForm(false);
        fetchSeats();
      } else {
        setError(response.data.error || 'Failed to create seats');
      }
    } catch (err: any) {
      console.error('Error creating seats:', err);
      setError(err.response?.data?.error || 'Failed to create seats');
    } finally {
      setCreating(false);
    }
  };

  const handleSingleCreate = async () => {
    if (!section || !number) {
      setError('Section and number are required');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const response = await organizerApi.createSeats(eventId, [
        {
          section,
          row: row || undefined,
          number,
          tier: tier || undefined,
        },
      ]);

      if (response.data.success) {
        setSection('');
        setRow('');
        setNumber('');
        setTier('');
        fetchSeats();
      } else {
        setError(response.data.error || 'Failed to create seat');
      }
    } catch (err: any) {
      console.error('Error creating seat:', err);
      setError(err.response?.data?.error || 'Failed to create seat');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleSeat = async (seatId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'BLOCKED' ? 'AVAILABLE' : 'BLOCKED';
      const response = await organizerApi.updateSeat(eventId, seatId, newStatus);
      if (response.data.success) {
        fetchSeats();
      } else {
        alert('Failed to update seat');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update seat');
    }
  };

  const handleDeleteSeat = async (seatId: string) => {
    if (!confirm('Are you sure you want to delete this seat?')) {
      return;
    }

    try {
      const response = await organizerApi.deleteSeat(eventId, seatId);
      if (response.data.success) {
        fetchSeats();
      } else {
        alert('Failed to delete seat');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete seat');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-green-100 text-green-800';
      case 'RESERVED':
        return 'bg-yellow-100 text-yellow-800';
      case 'SOLD':
        return 'bg-blue-100 text-blue-800';
      case 'BLOCKED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Group seats by section
  const groupedSeats = seats.reduce((acc, seat) => {
    const key = seat.section;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(seat);
    return acc;
  }, {} as Record<string, any[]>);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <OrganizerEventNav eventId={eventId} active="seats" showSeats={!!event?.isSeated} />
        <SkeletonLines lines={8} />
      </div>
    );
  }

  if (!event || !event.isSeated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <OrganizerEventNav eventId={eventId} active="seats" showSeats={!!event?.isSeated} />
        <p className="text-gray-600 mb-4">This event is not configured for seated tickets.</p>
        <Link
          href={`/organizer/events/${eventId}`}
          className="text-primary-800 hover:text-primary-600"
        >
          Back to Event
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <OrganizerEventNav eventId={eventId} eventTitle={event?.title} active="seats" showSeats={!!event?.isSeated} />

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary-900">Manage Seats</h1>
          {event && <p className="text-gray-600 mt-1">{event.title}</p>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBulkForm(!showBulkForm)}
            className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
          >
            {showBulkForm ? 'Hide' : 'Show'} Bulk Import
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Bulk Import Form */}
      {showBulkForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Bulk Import Seats</h2>
          <p className="text-sm text-gray-600 mb-4">
            Enter seats in CSV format (one per line): section,row,number,tier
            <br />
            Example: Section A,A1,1,Premium
          </p>
          <textarea
            value={bulkInput}
            onChange={(e) => setBulkInput(e.target.value)}
            rows={10}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
            placeholder="Section A,A1,1,Premium&#10;Section A,A1,2,Premium&#10;Section B,B1,1,Standard"
          />
          <button
            onClick={handleBulkCreate}
            disabled={creating}
            className="mt-4 px-6 py-3.5 bg-primary-900 text-white rounded-xl font-semibold hover:bg-primary-800 transition disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Seats'}
          </button>
        </div>
      )}

      {/* Single Seat Form */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Add Single Seat</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Section *</label>
            <input
              type="text"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Section A"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Row</label>
            <input
              type="text"
              value={row}
              onChange={(e) => setRow(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="A1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Number *</label>
            <input
              type="text"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tier</label>
            <input
              type="text"
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Premium"
            />
          </div>
        </div>
        <button
          onClick={handleSingleCreate}
          disabled={creating}
          className="mt-4 px-6 py-3.5 bg-primary-900 text-white rounded-xl font-semibold hover:bg-primary-800 transition disabled:opacity-50"
        >
          {creating ? 'Creating...' : 'Add Seat'}
        </button>
      </div>

      {/* Seats List */}
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Total Seats: {seats.length} | Available: {seats.filter((s) => s.status === 'AVAILABLE').length} | Sold:{' '}
          {seats.filter((s) => s.status === 'SOLD').length} | Blocked:{' '}
          {seats.filter((s) => s.status === 'BLOCKED').length}
        </p>
      </div>

      {seats.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">No seats created yet. Add seats using the form above.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedSeats).map(([sectionName, sectionSeats]) => (
            <div key={sectionName} className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Section {sectionName}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {sectionSeats.map((seat) => (
                  <div
                    key={seat.id}
                    className={`p-3 rounded border ${
                      seat.status === 'AVAILABLE'
                        ? 'bg-green-50 border-green-200'
                        : seat.status === 'SOLD'
                        ? 'bg-blue-50 border-blue-200'
                        : seat.status === 'BLOCKED'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-yellow-50 border-yellow-200'
                    }`}
                  >
                    <div className="text-xs font-semibold mb-1">
                      {seat.row ? `${seat.row}-` : ''}
                      {seat.number}
                    </div>
                    <div className="text-xs text-gray-600 mb-2">
                      <span className={`px-1 py-0.5 rounded ${getStatusColor(seat.status)}`}>
                        {seat.status}
                      </span>
                    </div>
                    {seat.tier && <div className="text-xs text-gray-500">{seat.tier}</div>}
                    <div className="mt-2 flex gap-1">
                      {seat.status !== 'SOLD' && (
                        <button
                          onClick={() => handleToggleSeat(seat.id, seat.status)}
                          className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                        >
                          {seat.status === 'BLOCKED' ? 'Unblock' : 'Block'}
                        </button>
                      )}
                      {seat.status !== 'SOLD' && (
                        <button
                          onClick={() => handleDeleteSeat(seat.id)}
                          className="text-xs px-2 py-1 bg-red-200 text-red-800 rounded hover:bg-red-300"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
