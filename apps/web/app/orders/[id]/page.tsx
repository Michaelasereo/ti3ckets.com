'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ordersApi } from '@/lib/api';
import { formatCurrency } from '@getiickets/shared';
import TicketCard from '@/components/tickets/TicketCard';
import PageContainer from '@/components/ui/PageContainer';
import Card from '@/components/ui/Card';
import LoginModal from '@/components/auth/LoginModal';
import { useAuth } from '@/hooks/useAuth';

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { isAuthenticated, loading: authLoading } = useAuth();

  useEffect(() => {
    // Wait for auth check to complete
    if (!authLoading) {
      if (!isAuthenticated) {
        // Try to fetch order first to get email for pre-fill
        fetchOrderForEmail();
        setShowLoginModal(true);
      } else {
        // User is authenticated, fetch order normally
        fetchOrder();
      }
    }
  }, [orderId, isAuthenticated, authLoading]);

  const fetchOrderForEmail = async () => {
    try {
      const response = await ordersApi.get(orderId);
      if (response.data.success) {
        setOrder(response.data.data);
        setLoading(false);
      } else {
        setError('Order not found');
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Error fetching order:', err);
      setError(err.response?.data?.error || 'Failed to load order details');
      setLoading(false);
    }
  };

  const fetchOrder = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await ordersApi.get(orderId);
      if (response.data.success) {
        setOrder(response.data.data);
      } else {
        setError('Order not found');
      }
    } catch (err: any) {
      console.error('Error fetching order:', err);
      setError(err.response?.data?.error || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    // Refresh auth state and fetch order
    window.location.reload();
  };

  const handleCloseModal = () => {
    setShowLoginModal(false);
    router.push('/');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (authLoading || loading) {
    return (
      <PageContainer maxWidth="4xl">
        <p className="text-gray-600">Loading order details...</p>
      </PageContainer>
    );
  }

  // Show login modal if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <PageContainer maxWidth="4xl">
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <h1 className="text-2xl font-bold text-primary-900 mb-4">Please Sign In</h1>
            <p className="text-gray-600 mb-6">
              Please sign in to view your order details.
              {order?.customerEmail && (
                <span className="block mt-2 text-sm">
                  Sign in with the email used for this order: <strong>{order.customerEmail}</strong>
                </span>
              )}
            </p>
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-6 py-3 bg-primary-900 text-white rounded-xl font-semibold hover:bg-primary-800 transition"
            >
              Sign In
            </button>
          </div>
        </PageContainer>
        <LoginModal
          isOpen={showLoginModal}
          onClose={handleCloseModal}
          onSuccess={handleLoginSuccess}
          prefillEmail={order?.customerEmail}
          message={
            order?.customerEmail
              ? `Sign in with the email used for this order: ${order.customerEmail}`
              : 'Please sign in to view your order details'
          }
        />
      </>
    );
  }

  if (error || !order) {
    return (
      <PageContainer maxWidth="4xl">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-600 mb-4">{error || 'Order not found'}</p>
          <Link href="/dashboard/orders" className="text-primary-800 hover:text-primary-600">
            Back to Orders
          </Link>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="4xl">
      <div className="mb-6">
        <Link href="/dashboard/orders" className="text-primary-800 hover:text-primary-600 text-[15px]">
          ← Back to Orders
        </Link>
      </div>

      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary-900 mb-2">Order Details</h1>
          <p className="text-gray-600">Order #{order.orderNumber}</p>
        </div>
        <span
          className={`px-3 py-1 rounded-lg text-sm font-semibold ${getStatusColor(order.status)}`}
        >
          {order.status}
        </span>
      </div>

      {/* Order Summary */}
      <Card padding="lg" className="mb-6">
        <h2 className="text-xl font-semibold text-primary-900 mb-4">Order Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Order Date</p>
            <p className="font-semibold">
              {new Date(order.createdAt).toLocaleDateString('en-NG', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="font-semibold text-lg text-primary-800">
              {formatCurrency(Number(order.totalAmount), order.currency)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Tickets</p>
            <p className="font-semibold">{order.tickets?.length || 0}</p>
          </div>
          {order.paidAt && (
            <div>
              <p className="text-sm text-gray-600">Paid On</p>
              <p className="font-semibold">
                {new Date(order.paidAt).toLocaleDateString('en-NG', {
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
          )}
        </div>

        {order.promoCode && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-600">Promo Code</p>
            <p className="font-semibold">{order.promoCode}</p>
            {order.discountAmount && (
              <p className="text-sm text-green-600">
                Discount: {formatCurrency(Number(order.discountAmount), order.currency)}
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Customer Information */}
      <Card padding="lg" className="mb-6">
        <h2 className="text-xl font-semibold text-primary-900 mb-4">Customer Information</h2>
        <div className="space-y-2">
          <p>
            <strong>Email:</strong> {order.customerEmail}
          </p>
          {order.customerName && (
            <p>
              <strong>Name:</strong> {order.customerName}
            </p>
          )}
          {order.customerPhone && (
            <p>
              <strong>Phone:</strong> {order.customerPhone}
            </p>
          )}
        </div>
      </Card>

      {/* Event Details */}
      {order.event && (
        <Card padding="lg" className="mb-6">
          <h2 className="text-xl font-semibold text-primary-900 mb-4">Event Details</h2>
          {order.event.bannerUrl && (
            <img
              src={order.event.bannerUrl}
              alt={order.event.title}
              className="w-full h-48 object-cover rounded-lg mb-4"
            />
          )}
          <h3 className="text-2xl font-bold mb-2">{order.event.title}</h3>
          <div className="space-y-2 text-gray-600 mb-4">
            <p>
              <strong>Date:</strong>{' '}
              {new Date(order.event.startDateTime).toLocaleDateString('en-NG', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
            <p>
              <strong>Time:</strong>{' '}
              {new Date(order.event.startDateTime).toLocaleTimeString('en-NG', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            <p>
              <strong>Venue:</strong> {order.event.venueName}
            </p>
            <p>
              <strong>Address:</strong> {order.event.venueAddress}, {order.event.city}
            </p>
          </div>
          <Link
            href={`/events/${order.event.slug || order.event.id}`}
            className="text-primary-800 hover:text-primary-600 font-semibold"
          >
            View Event Page →
          </Link>
        </Card>
      )}

      {/* Tickets */}
      {order.tickets && order.tickets.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-primary-900 mb-6">Tickets ({order.tickets.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {order.tickets.map((ticket: any) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        </div>
      )}

      {/* Payment Reference */}
      {order.paystackRef && (
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-600">Payment Reference</p>
          <p className="font-mono text-sm">{order.paystackRef}</p>
        </div>
      )}
    </PageContainer>
  );
}
