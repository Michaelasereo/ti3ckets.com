'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import PasswordInput from '@/components/forms/PasswordInput';
import PasswordStrength from '@/components/forms/PasswordStrength';

const TOTAL_STEPS = 6;

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    intent: 'buyer' as 'buyer' | 'organizer',
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    location: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill email from query parameter
  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setFormData((prev) => ({ ...prev, email: emailParam }));
    }
  }, [searchParams]);

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1: // Intent
        return !!formData.intent;
      case 2: // Email
        if (!formData.email) {
          setError('Email is required');
          return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
          setError('Please enter a valid email address');
          return false;
        }
        return true;
      case 3: // Password
        if (!formData.password) {
          setError('Password is required');
          return false;
        }
        if (formData.password.length < 8) {
          setError('Password must be at least 8 characters');
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          return false;
        }
        return true;
      case 4: // Name
        if (!formData.name || formData.name.trim().length < 2) {
          setError('Name must be at least 2 characters');
          return false;
        }
        return true;
      case 5: // Location
        // Location is optional, so always valid
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < TOTAL_STEPS) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError('');
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await authApi.register({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        phone: formData.phone || undefined,
      });

      if (response.data.success) {
        const emailSent = (response.data as { data?: { emailSent?: boolean } }).data?.emailSent ?? true;
        router.push(
          `/auth/verify-email?email=${encodeURIComponent(formData.email)}&emailSent=${emailSent ? '1' : '0'}`
        );
      } else {
        setError(response.data.error || 'Registration failed');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1: // Intent
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#192030' }}>What brings you here?</h2>
            <p className="text-gray-600 mb-6">Choose how you&apos;ll use Getiickets</p>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => updateFormData('intent', 'buyer')}
                className={`w-full p-6 text-left rounded-xl border-2 transition ${
                  formData.intent === 'buyer'
                    ? 'border-[#C74576] bg-gradient-to-r from-[#192030]/5 to-[#C74576]/5'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-6 h-6 rounded-full border-2 flex items-center justify-center"
                    style={{
                      borderColor: formData.intent === 'buyer' ? '#C74576' : '#9CA3AF',
                    }}
                  >
                    {formData.intent === 'buyer' && (
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#C74576' }} />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-lg" style={{ color: '#192030' }}>I want to buy tickets</div>
                    <div className="text-gray-600 text-sm">Discover and attend amazing events</div>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => updateFormData('intent', 'organizer')}
                className={`w-full p-6 text-left rounded-xl border-2 transition ${
                  formData.intent === 'organizer'
                    ? 'border-[#C74576] bg-gradient-to-r from-[#192030]/5 to-[#C74576]/5'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-6 h-6 rounded-full border-2 flex items-center justify-center"
                    style={{
                      borderColor: formData.intent === 'organizer' ? '#C74576' : '#9CA3AF',
                    }}
                  >
                    {formData.intent === 'organizer' && (
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#C74576' }} />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-lg" style={{ color: '#192030' }}>I want to sell tickets</div>
                    <div className="text-gray-600 text-sm">Create and manage your events</div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        );

      case 2: // Email
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#192030' }}>What&apos;s your email?</h2>
            <p className="text-gray-600 mb-6">We&apos;ll use this to verify your account</p>
            <div>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => updateFormData('email', e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3.5 border border-gray-300 rounded-xl placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ color: '#192030' }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#C74576';
                  e.target.style.boxShadow = '0 0 0 2px rgba(199, 69, 118, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '';
                  e.target.style.boxShadow = '';
                }}
                autoFocus
              />
            </div>
          </div>
        );

      case 3: // Password
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#192030' }}>Create a password</h2>
            <p className="text-gray-600 mb-6">Make it strong and secure</p>
            <div className="space-y-4">
              <div>
                <PasswordInput
                  value={formData.password}
                  onChange={(e) => updateFormData('password', e.target.value)}
                  placeholder="Enter your password"
                  required
                  minLength={8}
                />
                <PasswordStrength password={formData.password} />
              </div>
              <div>
                <PasswordInput
                  value={formData.confirmPassword}
                  onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                  placeholder="Confirm your password"
                  required
                  name="confirmPassword"
                />
                {formData.password && formData.confirmPassword && (
                  <p className={`mt-2 text-sm ${
                    formData.password === formData.confirmPassword
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    {formData.password === formData.confirmPassword
                      ? '✓ Passwords match'
                      : '✗ Passwords do not match'}
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      case 4: // Name
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#192030' }}>What should we call you?</h2>
            <p className="text-gray-600 mb-6">This is how you&apos;ll appear on your profile</p>
            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateFormData('name', e.target.value)}
                  placeholder="Your full name"
                  className="w-full px-4 py-3.5 border border-gray-300 rounded-xl placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ color: '#192030' }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#C74576';
                    e.target.style.boxShadow = '0 0 0 2px rgba(199, 69, 118, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '';
                    e.target.style.boxShadow = '';
                  }}
                  autoFocus
                />
              </div>
              <div>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateFormData('phone', e.target.value)}
                  placeholder="Phone number (optional)"
                  className="w-full px-4 py-3.5 border border-gray-300 rounded-xl placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ color: '#192030' }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#C74576';
                    e.target.style.boxShadow = '0 0 0 2px rgba(199, 69, 118, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '';
                    e.target.style.boxShadow = '';
                  }}
                />
              </div>
            </div>
          </div>
        );

      case 5: // Location
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#192030' }}>Where are you located?</h2>
            <p className="text-gray-600 mb-6">Help us show you relevant events nearby</p>
            <div>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => updateFormData('location', e.target.value)}
                placeholder="City, Country (optional)"
                className="w-full px-4 py-3.5 border border-gray-300 rounded-xl placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ color: '#192030' }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#C74576';
                  e.target.style.boxShadow = '0 0 0 2px rgba(199, 69, 118, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '';
                  e.target.style.boxShadow = '';
                }}
                autoFocus
              />
            </div>
            <div className="text-sm text-gray-600">
              <p>This helps us personalize your experience. You can skip this step.</p>
            </div>
          </div>
        );

      case 6: // Review
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#192030' }}>Review your details</h2>
            <p className="text-gray-600 mb-6">Everything looks good? Let&apos;s create your account</p>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-600">Intent</span>
                <span className="font-medium capitalize" style={{ color: '#192030' }}>{formData.intent}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b border-gray-200 gap-2">
                <span className="text-gray-600 text-sm sm:text-base flex-shrink-0">Email</span>
                <span 
                  className="font-medium break-words text-right ml-auto sm:ml-0" 
                  style={{ 
                    color: '#192030', 
                    wordBreak: 'break-word', 
                    overflowWrap: 'break-word',
                    maxWidth: '19ch',
                    minWidth: 0
                  }}
                >
                  {formData.email}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-600">Name</span>
                <span className="font-medium" style={{ color: '#192030' }}>{formData.name}</span>
              </div>
              {formData.phone && (
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-600">Phone</span>
                  <span className="font-medium" style={{ color: '#192030' }}>{formData.phone}</span>
                </div>
              )}
              {formData.location && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Location</span>
                  <span className="font-medium" style={{ color: '#192030' }}>{formData.location}</span>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <div className="bg-white border border-gray-200 rounded-xl p-8">
        <div className="mb-6">
          <div className="flex items-center justify-center mb-4">
            <div className="flex gap-2">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => (
                <div
                  key={step}
                  className="w-2 h-2 rounded-full transition"
                  style={{
                    backgroundColor: step <= currentStep ? '#C74576' : '#E5E7EB',
                  }}
                />
              ))}
            </div>
          </div>
          <div className="text-center mb-2">
            <span className="text-sm text-gray-600">Step {currentStep} of {TOTAL_STEPS}</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="space-y-6">
          {renderStep()}

          <div className="flex gap-3 pt-4">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="flex-1 px-6 py-3.5 bg-gray-100 rounded-xl font-semibold hover:bg-gray-200 transition disabled:opacity-50"
                style={{ color: '#192030' }}
              >
                Previous
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className={`px-6 py-3.5 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition ${
                currentStep === 1 ? 'w-full' : 'flex-1'
              }`}
              style={{
                background: loading
                  ? 'linear-gradient(90deg, #192030 0%, #C74576 100%)'
                  : 'linear-gradient(90deg, #192030 0%, #C74576 100%)',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading
                ? 'Creating account...'
                : currentStep === TOTAL_STEPS
                ? 'Create Account'
                : 'Continue'}
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link
            href="/auth/login"
            className="font-semibold hover:opacity-80 transition"
            style={{ color: '#C74576' }}
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
