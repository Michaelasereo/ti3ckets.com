'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi, usersApi } from '@/lib/api';

export default function OrganizerSignupPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ roles?: string[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await usersApi.getMe();
      if (response.data.success) {
        const userData = response.data.data;
        setUser(userData);
        
        // If user already has ORGANIZER role, redirect to dashboard
        if (userData.roles?.includes('ORGANIZER')) {
          router.push('/organizer/dashboard');
        }
      }
    } catch (err) {
      // User not logged in, that's okay - show signup form
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOrganizer = async () => {
    setRequesting(true);
    setError('');
    setSuccess(false);

    try {
      const response = await authApi.requestOrganizer();
      if (response.data.success) {
        setSuccess(true);
        // Refresh user data
        const userResponse = await usersApi.getMe();
        if (userResponse.data.success) {
          setUser(userResponse.data.data);
        }
        // Redirect to onboarding after a short delay
        setTimeout(() => {
          router.push('/onboarding/organizer');
        }, 2000);
      } else {
        setError(response.data.error || 'Failed to request organizer access');
      }
    } catch (err: any) {
      console.error('Error requesting organizer access:', err);
      setError(err.response?.data?.error || 'Failed to request organizer access. Please try again.');
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-700 to-primary-900 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Sell Tickets for Your Events
          </h1>
          <p className="text-xl mb-8 text-primary-200 max-w-2xl mx-auto">
            Join thousands of organizers who trust getiickets to manage their events, sell tickets, and grow their audience.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-16">
        {/* Benefits Section */}
        <div className="max-w-4xl mx-auto mb-12">
          <h2 className="text-3xl font-bold text-center mb-12 text-primary-900">
            Everything you need to sell tickets
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-primary-800"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-primary-900">Easy Event Management</h3>
              <p className="text-gray-600">
                Create and manage your events with our intuitive dashboard. Set up ticket types, pricing, and availability in minutes.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-primary-800"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-primary-900">Real-time Analytics</h3>
              <p className="text-gray-600">
                Track ticket sales, revenue, and attendee data in real-time. Make informed decisions with comprehensive insights.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-primary-800"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-primary-900">Secure Payments</h3>
              <p className="text-gray-600">
                Accept payments securely with Paystack integration. Get paid quickly and reliably with industry-leading security.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-3 text-primary-900 flex items-center">
                <svg
                  className="w-6 h-6 text-primary-800 mr-2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                QR Code Check-in
              </h3>
              <p className="text-gray-600">
                Streamline event entry with QR code tickets. Easy check-in process for both organizers and attendees.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-3 text-primary-900 flex items-center">
                <svg
                  className="w-6 h-6 text-primary-800 mr-2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Waitlist Management
              </h3>
              <p className="text-gray-600">
                Manage waitlists for sold-out events. Automatically notify attendees when tickets become available.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-3 text-primary-900 flex items-center">
                <svg
                  className="w-6 h-6 text-primary-800 mr-2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Promo Codes & Discounts
              </h3>
              <p className="text-gray-600">
                Create promotional codes and discounts to boost ticket sales. Set percentage or fixed amount discounts.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-3 text-primary-900 flex items-center">
                <svg
                  className="w-6 h-6 text-primary-800 mr-2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Seated Events Support
              </h3>
              <p className="text-gray-600">
                Manage seat maps and assigned seating for your events. Perfect for concerts, theaters, and sports venues.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-xl p-8">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-900 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          ) : user ? (
            // User is logged in - show request organizer form
            <div>
              <h2 className="text-3xl font-bold mb-4 text-primary-900 text-center">
                Request Organizer Access
              </h2>
              <p className="text-gray-600 mb-8 text-center">
                Get access to create and manage events. You&apos;ll be able to sell tickets, track sales, and manage your events.
              </p>

              {success && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
                  <p className="font-semibold">Success! Organizer access granted.</p>
                  <p className="text-sm mt-1">Redirecting to onboarding...</p>
                </div>
              )}

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
                  {error}
                </div>
              )}

              {!success && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>What happens next?</strong>
                    </p>
                    <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
                      <li>You&apos;ll gain ORGANIZER role access</li>
                      <li>Complete your business profile setup</li>
                      <li>Start creating and managing events</li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={handleRequestOrganizer}
                    disabled={requesting}
                    className="w-full px-8 py-4 bg-primary-900 text-white rounded-xl font-semibold hover:bg-primary-800 disabled:opacity-50 transition text-lg"
                  >
                    {requesting ? 'Requesting Access...' : 'Request Organizer Access'}
                  </button>

                  <p className="text-center text-sm text-gray-500 mt-4">
                    Already have organizer access?{' '}
                    <Link href="/organizer/dashboard" className="text-primary-800 hover:underline font-semibold">
                      Go to Dashboard
                    </Link>
                  </p>
                </div>
              )}
            </div>
          ) : (
            // User not logged in - show signup/login options
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4 text-primary-900">
                Ready to get started?
              </h2>
              <p className="text-gray-600 mb-8">
                Create your account and start selling tickets in minutes. No credit card required to get started.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/auth/register"
                  className="px-8 py-4 bg-primary-900 text-white rounded-xl font-semibold hover:bg-primary-800 transition text-lg"
                >
                  Sign Up Free
                </Link>
                <Link
                  href="/auth/login"
                  className="px-8 py-4 bg-white text-primary-800 border-2 border-primary-800 rounded-xl font-semibold hover:bg-primary-50 transition text-lg"
                >
                  Login
                </Link>
              </div>

              <p className="mt-6 text-sm text-gray-500">
                Already have an account?{' '}
                <Link href="/auth/login" className="text-primary-800 hover:underline font-semibold">
                  Login to your dashboard
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
