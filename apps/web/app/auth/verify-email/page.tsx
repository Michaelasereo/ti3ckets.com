'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const emailSent = searchParams.get('emailSent') !== '0';

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [resendCooldown]);

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return; // Only allow single digit
    if (!/^\d*$/.test(value)) return; // Only allow numbers

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (/^\d+$/.test(pastedData)) {
      const newCode = pastedData.split('').concat(Array(6 - pastedData.length).fill(''));
      setCode(newCode.slice(0, 6));
      const nextEmptyIndex = Math.min(pastedData.length, 5);
      document.getElementById(`code-${nextEmptyIndex}`)?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const verificationCode = code.join('');
    
    if (verificationCode.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    if (!email) {
      setError('Email is required');
      setLoading(false);
      return;
    }

    try {
      const response = await authApi.verifyEmail({ email, code: verificationCode });
      
      if (response.data.success) {
        // Store user info if returned
        if (response.data.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.data.user));
        }
        // Redirect to buyer onboarding
        router.push('/onboarding/buyer');
      } else {
        setError(response.data.error || 'Invalid verification code. Please try again.');
        setCode(['', '', '', '', '', '']);
        document.getElementById('code-0')?.focus();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid verification code. Please try again.');
      setCode(['', '', '', '', '', '']);
      document.getElementById('code-0')?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !email) return;

    setLoading(true);
    try {
      const response = await authApi.resendVerification({ email });
      if (response.data.success) {
        setResendCooldown(60); // 60 second cooldown
        setError('');
      } else {
        setError(response.data.error || 'Failed to resend code. Please try again.');
      }
    } catch (err: any) {
      const data = err.response?.data;
      const errorMessage = data?.error || 'Failed to resend code. Please try again.';
      const devCode = data?.devVerificationCode as string | undefined;
      setError(devCode ? `${errorMessage} Code (dev only): ${devCode}` : errorMessage);
      if (devCode && devCode.length === 6) {
        setCode(devCode.split(''));
      }
      if (errorMessage.includes('wait')) {
        const match = errorMessage.match(/(\d+)\s*seconds?/);
        if (match) setResendCooldown(parseInt(match[1], 10));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-gray-800 border border-gray-700 rounded-2xl p-8 shadow-2xl">
        <div className="mb-6">
          <div className="flex items-center justify-center mb-4">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map((step) => (
                <div
                  key={step}
                  className={`w-2 h-2 rounded-full ${
                    step <= 3 ? 'bg-primary-600' : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2 text-center text-white">Verify Your Email</h1>
          <p className="text-center text-gray-400 mb-6">
            {emailSent
              ? "Ok, check your inbox! We sent you a verification code."
              : "We couldn't send the verification email. Use \"Tap to resend\" below to receive the code, or check your server logs in development."}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-6">
          <div>
            <div className="flex justify-center gap-2">
              {code.map((digit, index) => (
                <input
                  key={index}
                  id={`code-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-600 bg-gray-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  autoFocus={index === 0}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-6 py-3.5 bg-gray-700 text-white rounded-xl font-semibold hover:bg-gray-600 transition"
            >
              Previous
            </button>
            <button
              type="submit"
              disabled={loading || code.join('').length !== 6}
              className="flex-1 px-6 py-3.5 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Verifying...' : 'Continue'}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            Didn&apos;t receive it?{' '}
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || loading}
              className="text-primary-400 hover:text-primary-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Tap to resend'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
