'use client';

import { useState } from 'react';
import { organizerApi } from '@/lib/api';

interface EventStatusControlsProps {
  eventId: string;
  currentStatus: string;
  onStatusChange: (newStatus: string) => void;
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['PUBLISHED', 'CANCELLED'],
  PUBLISHED: ['LIVE', 'CANCELLED', 'DRAFT'],
  LIVE: ['SOLD_OUT', 'COMPLETED', 'CANCELLED'],
  SOLD_OUT: ['COMPLETED', 'CANCELLED'],
  CANCELLED: [],
  COMPLETED: [],
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  LIVE: 'Live',
  SOLD_OUT: 'Sold Out',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PUBLISHED: 'bg-green-100 text-green-800',
  LIVE: 'bg-blue-100 text-blue-800',
  SOLD_OUT: 'bg-yellow-100 text-yellow-800',
  CANCELLED: 'bg-red-100 text-red-800',
  COMPLETED: 'bg-purple-100 text-purple-800',
};

export default function EventStatusControls({ eventId, currentStatus, onStatusChange }: EventStatusControlsProps) {
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState('');

  const validTransitions = STATUS_TRANSITIONS[currentStatus] || [];
  const isTerminal = validTransitions.length === 0;

  const handleStatusChange = async (newStatus: string) => {
    // Confirm irreversible actions
    if (['CANCELLED', 'COMPLETED'].includes(newStatus)) {
      if (!confirm(`Are you sure you want to ${newStatus === 'CANCELLED' ? 'cancel' : 'complete'} this event? This action cannot be undone.`)) {
        return;
      }
    }

    setError('');
    setChanging(true);

    try {
      const response = await organizerApi.updateEventStatus(eventId, newStatus);
      if (response.data.success) {
        onStatusChange(newStatus);
      } else {
        setError(response.data.error || 'Failed to update status');
      }
    } catch (err: any) {
      console.error('Error updating status:', err);
      setError(err.response?.data?.error || 'Failed to update status');
    } finally {
      setChanging(false);
    }
  };

  if (isTerminal) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Event Status</h3>
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${STATUS_COLORS[currentStatus]}`}>
              {STATUS_LABELS[currentStatus]}
            </span>
          </div>
          <p className="text-sm text-gray-500">
            This event is in a terminal state and cannot be changed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Event Status</h3>
          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${STATUS_COLORS[currentStatus]}`}>
            {STATUS_LABELS[currentStatus]}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        <p className="text-sm text-gray-600 mb-3">Change status:</p>
        <div className="flex flex-wrap gap-2">
          {validTransitions.map((transition) => (
            <button
              key={transition}
              onClick={() => handleStatusChange(transition)}
              disabled={changing}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                ['CANCELLED', 'COMPLETED'].includes(transition)
                  ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                  : 'bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {changing ? 'Updating...' : `Mark as ${STATUS_LABELS[transition]}`}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <details className="text-sm">
          <summary className="text-gray-600 cursor-pointer hover:text-gray-900">
            Status transition rules
          </summary>
          <div className="mt-2 text-xs text-gray-500 space-y-1">
            <p>• Draft → Published, Cancelled</p>
            <p>• Published → Live, Cancelled, Draft</p>
            <p>• Live → Sold Out, Completed, Cancelled</p>
            <p>• Sold Out → Completed, Cancelled</p>
            <p>• Cancelled/Completed → (terminal states)</p>
          </div>
        </details>
      </div>
    </div>
  );
}
