'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import PasswordInput from '@/components/forms/PasswordInput';
import PasswordStrength from '@/components/forms/PasswordStrength';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      // TODO: Implement API endpoint for reset password
      // await authApi.resetPassword({ token, password });
      
      // Simulate success
      setTimeout(() => {
        setSuccess(true);
        setLoading(false);
        setTimeout(() => {
          router.push('/auth/login?reset=success');
        }, 2000);
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password. The link may have expired.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md">
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-primary-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-primary-800"
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
          <h1 className="text-2xl font-bold mb-2 text-primary-900">Password Reset Successful</h1>
          <p className="text-gray-600 mb-6">
            Your password has been reset successfully. Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md">
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <h1 className="text-2xl font-bold mb-2 text-primary-900">Invalid Reset Link</h1>
          <p className="text-gray-600 mb-6">
            This password reset link is invalid or has expired.
          </p>
          <Link
            href="/auth/forgot-password"
            className="inline-block px-6 py-3.5 bg-primary-900 text-white rounded-xl font-semibold hover:bg-primary-800 transition"
          >
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <div className="bg-white border border-gray-200 rounded-xl p-8">
        <h1 className="text-3xl font-bold mb-2 text-center text-primary-900">Reset Password</h1>
        <p className="text-center text-gray-600 mb-6">
          Enter your new password below.
        </p>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-primary-900">New Password *</label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Enter new password"
              name="password"
            />
            <PasswordStrength password={password} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-primary-900">Confirm New Password *</label>
            <PasswordInput
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm new password"
              name="confirmPassword"
            />
            {password && confirmPassword && (
              <p className={`mt-1 text-xs ${
                password === confirmPassword
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}>
                {password === confirmPassword
                  ? '✓ Passwords match'
                  : '✗ Passwords do not match'}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || password !== confirmPassword || password.length < 8}
            className="w-full px-6 py-3.5 bg-primary-900 text-white rounded-xl font-semibold hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          <Link href="/auth/login" className="text-primary-800 hover:text-primary-600">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
