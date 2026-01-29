'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import PasswordInput from '@/components/forms/PasswordInput';

function isSafeRedirect(next: string | null): boolean {
  if (!next || typeof next !== 'string') return false;
  const path = next.startsWith('/') ? next : `/${next}`;
  return path.startsWith('/') && !path.startsWith('//') && !path.includes('://');
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get('next');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        
        const roles = user.roles || [];
        const hasMultipleRoles = roles.includes('BUYER') && roles.includes('ORGANIZER');
        const redirectTo = isSafeRedirect(nextUrl) ? nextUrl : null;

        if (hasMultipleRoles) {
          router.push(redirectTo ? `/auth/select-role?next=${encodeURIComponent(redirectTo)}` : '/auth/select-role');
        } else if (roles.includes('ORGANIZER')) {
          router.push(redirectTo || '/organizer/dashboard');
        } else {
          router.push(redirectTo || '/dashboard/tickets');
        }
      } else {
        setError(response.data.error || 'Login failed');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <div className="bg-white border border-gray-200 rounded-xl p-8">
        <h1 className="text-3xl font-bold text-primary-900 mb-6 text-center">Login</h1>

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
            className="w-full px-6 py-3.5 bg-primary-900 text-white rounded-xl font-semibold hover:bg-primary-800 disabled:opacity-50 transition"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="text-primary-800 hover:text-primary-600 font-semibold">
            Sign up
          </Link>
        </p>
        <p className="mt-2 text-center text-sm">
          <Link href="/auth/forgot-password" className="text-primary-800 hover:text-primary-600">
            Forgot password?
          </Link>
        </p>
      </div>
    </div>
  );
}
