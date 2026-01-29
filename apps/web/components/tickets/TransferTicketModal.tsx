'use client';

import { useState } from 'react';
import { ticketsApi } from '@/lib/api';

interface TransferTicketModalProps {
  ticket: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TransferTicketModal({
  ticket,
  isOpen,
  onClose,
  onSuccess,
}: TransferTicketModalProps) {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate email
    if (!recipientEmail || !recipientEmail.includes('@')) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      const response = await ticketsApi.transfer(ticket.id, {
        recipientEmail,
        recipientName: recipientName || undefined,
      });

      if (response.data.success) {
        onSuccess();
        onClose();
        setRecipientEmail('');
        setRecipientName('');
      } else {
        setError(response.data.error || 'Failed to transfer ticket');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to transfer ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-primary-900">Transfer Ticket</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="mb-4 p-4 bg-gray-50 rounded-xl">
          <p className="text-sm text-gray-600 mb-1">
            <strong>Event:</strong> {ticket.event?.title}
          </p>
          <p className="text-sm text-gray-600 mb-1">
            <strong>Ticket #:</strong> {ticket.ticketNumber}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Type:</strong> {ticket.ticketType?.name}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Recipient Email *
            </label>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              required
              placeholder="Enter recipient email"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Recipient Name (Optional)
            </label>
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="Enter recipient name"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3.5 bg-primary-900 text-white rounded-xl font-semibold hover:bg-primary-800 transition disabled:opacity-50"
            >
              {loading ? 'Transferring...' : 'Transfer Ticket'}
            </button>
          </div>
        </form>

        <p className="mt-4 text-xs text-gray-500">
          The recipient will receive an email with the ticket details.
        </p>
      </div>
    </div>
  );
}
