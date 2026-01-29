'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usersApi } from '@/lib/api';
import PageContainer from '@/components/ui/PageContainer';

export default function BuyerOnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    address: '',
    city: '',
    country: 'Nigeria',
    preferredPaymentMethod: '',
  });

  useEffect(() => {
    // Check if user is logged in
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await usersApi.getMe();
      if (!response.data.success) {
        router.push('/auth/login');
      } else {
        // Pre-fill form with existing data if available
        const user = response.data.data;
        if (user.buyerProfile) {
          setFormData({
            firstName: user.buyerProfile.firstName || '',
            lastName: user.buyerProfile.lastName || '',
            dateOfBirth: user.buyerProfile.dateOfBirth 
              ? new Date(user.buyerProfile.dateOfBirth).toISOString().split('T')[0]
              : '',
            address: user.buyerProfile.address || '',
            city: user.buyerProfile.city || '',
            country: user.buyerProfile.country || 'Nigeria',
            preferredPaymentMethod: user.buyerProfile.preferredPaymentMethod || '',
          });
        }
      }
    } catch (err) {
      router.push('/auth/login');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Update buyer profile
      const response = await usersApi.updateProfile({
        buyerProfile: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString() : null,
          address: formData.address,
          city: formData.city,
          country: formData.country,
          preferredPaymentMethod: formData.preferredPaymentMethod || null,
        },
      });

      if (response.data.success) {
        // Redirect to dashboard
        router.push('/dashboard/tickets');
      } else {
        setError(response.data.error || 'Failed to update profile');
      }
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.error || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.push('/dashboard/tickets');
  };

  const canProceed = () => {
    if (step === 1) {
      return formData.firstName.trim() && formData.lastName.trim();
    }
    return true;
  };

  return (
    <PageContainer>
      <div className="max-w-2xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-primary-900 mb-2">
              Complete Your Profile
            </h1>
            <p className="text-gray-600">
              Help us personalize your experience by completing your profile
            </p>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className={`flex items-center ${step >= 1 ? 'text-primary-900' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 1 ? 'bg-primary-900 text-white' : 'bg-gray-200'
                }`}>
                  {step > 1 ? '✓' : '1'}
                </div>
                <span className="ml-2 text-sm font-medium">Basic Info</span>
              </div>
              <div className={`flex-1 h-1 mx-4 ${step >= 2 ? 'bg-primary-900' : 'bg-gray-200'}`} />
              <div className={`flex items-center ${step >= 2 ? 'text-primary-900' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 2 ? 'bg-primary-900 text-white' : 'bg-gray-200'
                }`}>
                  2
                </div>
                <span className="ml-2 text-sm font-medium">Location</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-primary-900">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      required
                      placeholder="John"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-primary-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-primary-900">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      required
                      placeholder="Doe"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-primary-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-primary-900">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-primary-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Optional - helps us provide age-appropriate event recommendations
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="px-6 py-2.5 text-primary-800 bg-gray-200 hover:bg-gray-300 rounded-xl font-medium transition"
                  >
                    Skip for now
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={!canProceed()}
                    className="flex-1 px-6 py-2.5 bg-primary-900 text-white rounded-xl font-semibold hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-primary-900">
                    Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="123 Main Street"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-primary-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-primary-900">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Lagos"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-primary-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-primary-900">
                      Country
                    </label>
                    <select
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-primary-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="Nigeria">Nigeria</option>
                      <option value="Ghana">Ghana</option>
                      <option value="Kenya">Kenya</option>
                      <option value="South Africa">South Africa</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-primary-900">
                    Preferred Payment Method
                  </label>
                  <select
                    value={formData.preferredPaymentMethod}
                    onChange={(e) => setFormData({ ...formData, preferredPaymentMethod: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-primary-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Select payment method</option>
                    <option value="card">Credit/Debit Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-6 py-2.5 text-primary-800 bg-gray-200 hover:bg-gray-300 rounded-xl font-medium transition"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="px-6 py-2.5 text-primary-800 bg-gray-200 hover:bg-gray-300 rounded-xl font-medium transition"
                  >
                    Skip for now
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-2.5 bg-primary-900 text-white rounded-xl font-semibold hover:bg-primary-800 disabled:opacity-50 transition"
                  >
                    {loading ? 'Saving...' : 'Complete Profile'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </PageContainer>
  );
}
