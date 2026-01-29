'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ordersApi, paymentsApi } from '@/lib/api';
import { formatCurrency } from '@getiickets/shared';
import TicketCard from '@/components/tickets/TicketCard';
import PageContainer from '@/components/ui/PageContainer';
import LoginModal from '@/components/auth/LoginModal';
import { useAuth } from '@/hooks/useAuth';

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reference = searchParams.get('reference');
  const orderId = searchParams.get('orderId');
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'order' | 'tickets' | null>(null);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (reference || orderId) {
      fetchOrder();
    } else {
      setLoading(false);
    }
  }, [reference, orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      setError('');

      // When we have a payment reference, verify payment first so the backend generates
      // tickets and sends the confirmation email (e.g. after Paystack redirect).
      if (reference) {
        try {
          await paymentsApi.verify(reference);
        } catch (verifyErr: any) {
          // Verify can fail if already verified (popup flow) or network; still load order
          console.warn('Payment verify on success page:', verifyErr?.response?.data || verifyErr?.message);
        }
      }

      let response;
      if (orderId) {
        response = await ordersApi.get(orderId);
      } else if (reference) {
        response = await ordersApi.getByReference(reference);
      } else {
        setLoading(false);
        return;
      }

      if (response.data.success) {
        setOrder(response.data.data);
      } else {
        setError('Failed to load order details');
      }
    } catch (err: any) {
      console.error('Error fetching order:', err);
      setError(err.response?.data?.error || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrderDetails = (orderId: string) => {
    if (isAuthenticated) {
      router.push(`/orders/${orderId}`);
    } else {
      setPendingAction('order');
      setShowLoginModal(true);
    }
  };

  const handleViewMyTickets = () => {
    if (isAuthenticated) {
      router.push('/dashboard/tickets');
    } else {
      setPendingAction('tickets');
      setShowLoginModal(true);
    }
  };

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    if (pendingAction === 'order' && order) {
      router.push(`/orders/${order.id}`);
    } else if (pendingAction === 'tickets') {
      router.push('/dashboard/tickets');
    }
    setPendingAction(null);
  };

  const handleCloseModal = () => {
    setShowLoginModal(false);
    setPendingAction(null);
  };

  if (loading) {
    return (
      <PageContainer maxWidth="4xl" py="lg">
        <p className="text-center text-gray-600">Loading order details...</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="4xl" py="lg">
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center mb-8">
        <div className="mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-primary-900 mb-2">Payment Successful!</h1>
          <p className="text-gray-600">
            Your tickets have been sent to your email. You can also view them below.
          </p>
        </div>

        {reference && (
          <div className="mb-6 p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-600">Payment Reference</p>
            <p className="font-mono text-sm">{reference}</p>
          </div>
        )}

        {order && (
          <div className="mb-6 text-left bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-600">Order Number</p>
            <p className="font-semibold text-lg">{order.orderNumber}</p>
            <p className="text-sm text-gray-600 mt-2">Total Amount</p>
            <p className="font-semibold text-lg text-primary-900">
              {Number(order.totalAmount) === 0 ? 'Free' : formatCurrency(Number(order.totalAmount), order.currency)}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-4 justify-center">
          {order && (
            <button
              onClick={() => handleViewOrderDetails(order.id)}
              className="px-6 py-3.5 bg-primary-900 text-white rounded-xl font-semibold hover:bg-primary-800 transition"
            >
              View Order Details
            </button>
          )}
          <button
            onClick={() => handleViewMyTickets()}
            className="px-6 py-3.5 bg-primary-900 text-white rounded-xl font-semibold hover:bg-primary-800 transition"
          >
            View My Tickets
          </button>
          <Link
            href="/events"
            className="px-6 py-3.5 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition"
          >
            Browse More Events
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {order && order.tickets && order.tickets.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-primary-900 mb-6">Your Tickets</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {order.tickets.map((ticket: any) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        </div>
      )}

      {order && order.event && (
        <div className="mt-8 bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-primary-900 mb-4">Event Details</h2>
          <div className="space-y-2">
            <p className="font-semibold text-lg">{order.event.title}</p>
            <p className="text-gray-600">
              {new Date(order.event.startDateTime).toLocaleDateString('en-NG', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
            <p className="text-gray-600">{order.event.venueName}</p>
            <p className="text-gray-600">{order.event.venueAddress}, {order.event.city}</p>
            <Link
              href={`/events/${order.event.slug}`}
              className="text-primary-800 hover:text-primary-600 inline-block mt-4 font-medium"
            >
              View Event Page →
            </Link>
          </div>
        </div>
      )}

      <LoginModal
        isOpen={showLoginModal}
        onClose={handleCloseModal}
        onSuccess={handleLoginSuccess}
        prefillEmail={order?.customerEmail}
        message={
          pendingAction === 'order'
            ? 'Sign in to access your tickets and order history'
            : pendingAction === 'tickets'
            ? 'Sign in to access your tickets and order history'
            : 'Sign in to access your tickets and order history'
        }
      />
    </PageContainer>
  );
}
