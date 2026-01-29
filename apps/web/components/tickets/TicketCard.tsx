'use client';

import { useState } from 'react';
import { formatDate } from '@getiickets/shared';
import Image from 'next/image';
import TransferTicketModal from './TransferTicketModal';

interface TicketCardProps {
  ticket: any;
}

export default function TicketCard({ ticket }: TicketCardProps) {
  const [showTransferModal, setShowTransferModal] = useState(false);

  const handleTransferSuccess = () => {
    // Refresh the page or update ticket list
    window.location.reload();
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-gray-300 transition">
        <div className="mb-4">
          <h3 className="text-xl font-semibold mb-2 text-primary-900">{ticket.event?.title}</h3>
          <p className="text-sm text-gray-600">
            {formatDate(ticket.event?.startDateTime)}
          </p>
          <p className="text-sm text-gray-600">{ticket.event?.venueName}</p>
        </div>

        <div className="mb-4">
          <p className="text-sm">
            <strong>Ticket #:</strong> {ticket.ticketNumber}
          </p>
          <p className="text-sm">
            <strong>Type:</strong> {ticket.ticketType?.name}
          </p>
          <p className="text-sm">
            <strong>Status:</strong>{' '}
            <span
              className={`px-2 py-1 rounded text-xs ${
                ticket.status === 'VALID'
                  ? 'bg-primary-200 text-primary-800'
                  : ticket.status === 'USED'
                  ? 'bg-gray-100 text-gray-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {ticket.status}
            </span>
          </p>
        </div>

        {ticket.qrCodeUrl && (
          <div className="mb-4">
            <img
              src={ticket.qrCodeUrl}
              alt="QR Code"
              className="w-32 h-32 mx-auto"
            />
          </div>
        )}

        <div className="flex gap-2">
          {ticket.pdfUrl && (
            <a
              href={ticket.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center px-4 py-2.5 bg-primary-900 text-white rounded-xl font-semibold hover:bg-primary-800 transition"
            >
              Download PDF
            </a>
          )}
          {ticket.status === 'VALID' && (
            <button
              onClick={() => setShowTransferModal(true)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
            >
              Transfer
            </button>
          )}
        </div>
      </div>

      <TransferTicketModal
        ticket={ticket}
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        onSuccess={handleTransferSuccess}
      />
    </>
  );
}
