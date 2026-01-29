'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usersApi, authApi } from '@/lib/api';
import PageContainer from '@/components/ui/PageContainer';

export default function OrganizerOnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    businessName: '',
    businessType: '',
    businessAddress: '',
    businessCity: '',
    businessCountry: 'Nigeria',
    taxId: '',
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await usersApi.getMe();
      if (!response.data.success) {
        router.push('/auth/login');
        return;
      }

      const user = response.data.data;
      // Check if user has ORGANIZER role
      if (!user.roles?.includes('ORGANIZER')) {
        router.push('/organizer/signup');
        return;
      }

      // Pre-fill form with existing data if available
      if (user.organizerProfile) {
        setFormData({
          businessName: user.organizerProfile.businessName || '',
          businessType: user.organizerProfile.businessType || '',
          businessAddress: user.organizerProfile.businessAddress || '',
          businessCity: user.organizerProfile.businessCity || '',
          businessCountry: user.organizerProfile.businessCountry || 'Nigeria',
          taxId: user.organizerProfile.taxId || '',
        });
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
      // Update organizer profile
      const response = await usersApi.updateProfile({
        organizerProfile: {
          businessName: formData.businessName,
          businessType: formData.businessType,
          businessAddress: formData.businessAddress,
          businessCity: formData.businessCity,
          businessCountry: formData.businessCountry,
          taxId: formData.taxId || undefined,
        },
      });

      if (response.data.success) {
        // Mark onboarding as completed and redirect
        router.push('/organizer/dashboard');
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

  const canProceed = () => {
    if (step === 1) {
      return formData.businessName.trim() && formData.businessType.trim();
    }
    return true;
  };

  return (
    <PageContainer>
      <div className="max-w-2xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-primary-900 mb-2">
              Set Up Your Organizer Profile
            </h1>
            <p className="text-gray-600">
              Complete your business information to start creating and managing events
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
                <span className="ml-2 text-sm font-medium">Business Info</span>
              </div>
              <div className={`flex-1 h-1 mx-4 ${step >= 2 ? 'bg-primary-900' : 'bg-gray-200'}`} />
              <div className={`flex items-center ${step >= 2 ? 'text-primary-900' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 2 ? 'bg-primary-900 text-white' : 'bg-gray-200'
                }`}>
                  2
                </div>
                <span className="ml-2 text-sm font-medium">Location & Tax</span>
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
                <div>
                  <label className="block text-sm font-medium mb-1 text-primary-900">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    required
                    placeholder="Event Organizer Co."
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-primary-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    This will be displayed on your event pages
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-primary-900">
                    Business Type *
                  </label>
                  <select
                    value={formData.businessType}
                    onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-primary-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Select business type</option>
                    <option value="ENTERTAINMENT">Entertainment</option>
                    <option value="SPORTS">Sports</option>
                    <option value="CONFERENCE">Conference</option>
                    <option value="FESTIVAL">Festival</option>
                    <option value="WORKSHOP">Workshop</option>
                    <option value="NETWORKING">Networking</option>
                    <option value="EDUCATION">Education</option>
                    <option value="CHARITY">Charity</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => router.push('/organizer/dashboard')}
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
                    Business Address
                  </label>
                  <input
                    type="text"
                    value={formData.businessAddress}
                    onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                    placeholder="123 Business Street"
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
                      value={formData.businessCity}
                      onChange={(e) => setFormData({ ...formData, businessCity: e.target.value })}
                      placeholder="Lagos"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-primary-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-primary-900">
                      Country
                    </label>
                    <select
                      value={formData.businessCountry}
                      onChange={(e) => setFormData({ ...formData, businessCountry: e.target.value })}
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
                    Tax ID / Registration Number
                  </label>
                  <input
                    type="text"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    placeholder="Optional - for tax reporting"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-primary-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Optional - Required for certain payment processing features
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Your organizer profile will be reviewed for verification. 
                    This process typically takes 1-2 business days. You can still create events 
                    while your profile is being reviewed.
                  </p>
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
                    onClick={() => router.push('/organizer/dashboard')}
                    className="px-6 py-2.5 text-primary-800 bg-gray-200 hover:bg-gray-300 rounded-xl font-medium transition"
                  >
                    Skip for now
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !formData.businessName.trim()}
                    className="flex-1 px-6 py-2.5 bg-primary-900 text-white rounded-xl font-semibold hover:bg-primary-800 disabled:opacity-50 transition"
                  >
                    {loading ? 'Saving...' : 'Complete Setup'}
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
