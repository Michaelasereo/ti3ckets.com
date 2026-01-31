'use client';

import { useState, useEffect } from 'react';
import { authApi } from '@/lib/api';
import PasswordInput from '@/components/forms/PasswordInput';
import Link from 'next/link';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  prefillEmail?: string;
  message?: string;
}

export default function LoginModal({
  isOpen,
  onClose,
  onSuccess,
  prefillEmail,
  message,
}: LoginModalProps) {
  const [email, setEmail] = useState(prefillEmail || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Update email when prefillEmail changes
  useEffect(() => {
    if (prefillEmail) {
      setEmail(prefillEmail);
    }
  }, [prefillEmail]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setPassword('');
      setError('');
      setRememberMe(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authApi.login({
        email,
        password,
      });

      if (response.data.success) {
        const { user } = response.data.data;
        
        // Store user info in localStorage/sessionStorage for UI (not for auth)
        // Session cookie is set automatically by browser
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem('user', JSON.stringify(user));
        
        // Call success callback
        onSuccess();
      } else {
        setError(response.data.error || 'Login failed');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const status = err.response?.status;
      const msg = err.response?.data?.error;
      if (err.code === 'ECONNREFUSED' || err.message === 'Network Error' || !err.response) {
        setError('Cannot reach server. Is the API running? (cd apps/api && npm run dev)');
      } else if (status === 502 || status === 503 || status === 504) {
        setError('Server unavailable. Make sure the API is running on port 8080.');
      } else if (status === 401) {
        setError(msg || 'Invalid email or password.');
      } else if (status >= 500) {
        setError(msg || 'Server error. Try again later.');
      } else {
        setError(msg || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-xl p-8 w-full max-w-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-primary-900">Sign In</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
            aria-label="Close"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {message && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-primary-900">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-primary-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-primary-900">Password</label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              name="password"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-600"
              />
              <span className="text-sm text-primary-900">Remember me</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3.5 bg-primary-900 text-white rounded-xl font-semibold hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <Link
            href={email ? `/auth/register?email=${encodeURIComponent(email)}` : '/auth/register'}
            className="text-primary-800 hover:text-primary-600 font-semibold"
            onClick={onClose}
          >
            Sign up
          </Link>
        </p>
        <p className="mt-2 text-center text-sm">
          <Link
            href="/auth/forgot-password"
            className="text-primary-800 hover:text-primary-600"
            onClick={onClose}
          >
            Forgot password?
          </Link>
        </p>
      </div>
    </div>
  );
}
