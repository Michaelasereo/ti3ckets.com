'use client';

import { useState } from 'react';
import Link from 'next/link';

interface LaunchWaitlistContentProps {
  /** When true, show "Back to home" in success modal. When false (e.g. on homepage), only show Done. */
  showBackToHome?: boolean;
}

export default function LaunchWaitlistContent({ showBackToHome = true }: LaunchWaitlistContentProps) {
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [successFirstName, setSuccessFirstName] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/launch-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: firstName.trim(), email: email.trim() }),
      });

      let data: { success?: boolean; error?: string };
      try {
        data = await res.json();
      } catch {
        setError(res.ok ? 'Invalid response from server.' : `Request failed (${res.status}). Please try again.`);
        return;
      }

      if (res.ok && data.success) {
        setSuccessFirstName(firstName.trim() || '');
        setSuccess(true);
        setFirstName('');
        setEmail('');
        return;
      }

      setError(data.error ?? 'Something went wrong. Please try again.');
    } catch (err) {
      console.error('[LaunchWaitlist] submit error', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const closeSuccessModal = () => {
    setSuccess(false);
    setSuccessFirstName('');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <div className="bg-white border border-gray-200 rounded-xl p-8">
        <h1 className="text-3xl font-bold text-primary-900 mb-2 text-center">
          Get Early Access to Ti3ckets.com
        </h1>
        <p className="text-gray-600 text-center mb-6">
          Join our exclusive waitlist and get early access to the platform that&apos;s revolutionizing how events connect with audiences.
        </p>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            {error}
          </div>
        )}

        {!success && (
          <form
            id="launch-waitlist-form"
            action="#"
            method="post"
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium mb-1 text-primary-900">
                First name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                placeholder="Your first name"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-primary-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-primary-900">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-primary-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              form="launch-waitlist-form"
              disabled={loading}
              aria-busy={loading}
              className="w-full px-6 py-3.5 text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition"
              style={{
                background: 'linear-gradient(90deg, #192030 0%, #C74576 100%)',
              }}
            >
              {loading ? 'Joining...' : 'Join waitlist'}
            </button>
          </form>
        )}
      </div>

      {success && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="waitlist-success-title"
        >
          <div className="bg-white rounded-xl p-8 max-w-md w-full text-center shadow-xl">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 id="waitlist-success-title" className="text-2xl font-bold text-primary-900 mb-2">
              You&apos;re on the list!
            </h2>
            <p className="text-gray-600 mb-3">
              {successFirstName
                ? `Thank you for joining our waitlist, ${successFirstName}.`
                : 'Thank you for joining our waitlist.'}
            </p>
            <p className="text-gray-600 text-sm mb-2">As a waitlist member, you&apos;ll receive:</p>
            <ul className="text-gray-600 text-sm text-left list-none space-y-1.5 mb-6 mx-auto max-w-xs">
              <li>📅 Launch dates — Know when tickets go live</li>
              <li>🎁 Early-bird pricing — Get the best rates</li>
              <li>✨ New event features — See updates first</li>
            </ul>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={closeSuccessModal}
                className="px-6 py-3.5 text-white rounded-xl font-semibold hover:opacity-90 transition"
                style={{
                  background: 'linear-gradient(90deg, #192030 0%, #C74576 100%)',
                }}
              >
                Done
              </button>
              {showBackToHome && (
                <Link
                  href="/"
                  onClick={closeSuccessModal}
                  className="px-6 py-3.5 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition inline-block"
                >
                  Back to home
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
