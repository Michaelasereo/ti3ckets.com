'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';

export default function AdminOrganizerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const organizerId = params.id as string;
  const [organizer, setOrganizer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (organizerId) {
      loadOrganizer();
    }
  }, [organizerId]);

  const loadOrganizer = async () => {
    try {
      setLoading(true);
      const response = await adminApi.organizers.get(organizerId);
      if (response.data.success) {
        setOrganizer(response.data.data);
      } else {
        setError(response.data.error || 'Failed to load organizer');
      }
    } catch (err: any) {
      console.error('Error loading organizer:', err);
      setError(err.response?.data?.error || 'Failed to load organizer');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (status: 'VERIFIED' | 'SUSPENDED') => {
    const action = status === 'SUSPENDED' ? 'suspend' : 'unsuspend';
    if (!confirm(`Are you sure you want to ${action} this organizer?`)) {
      return;
    }
    try {
      await adminApi.organizers.updateVerification(organizerId, { verificationStatus: status });
      loadOrganizer();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update organizer status');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="h-96 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (error || !organizer || !organizer.organizerProfile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error || 'Organizer not found'}</p>
        </div>
      </div>
    );
  }

  const profile = organizer.organizerProfile;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-primary-800 hover:text-primary-600 mb-4"
        >
          ← Back
        </button>
        <h1 className="text-3xl font-bold text-primary-900 mb-2">Organizer Details</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-primary-900 mb-4">Organizer Information</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="text-sm text-gray-900">{organizer.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="text-sm text-gray-900">{organizer.name || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Business Name</dt>
                <dd className="text-sm text-gray-900">{profile.businessName || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Business Type</dt>
                <dd className="text-sm text-gray-900">{profile.businessType || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Tax ID</dt>
                <dd className="text-sm text-gray-900">{profile.taxId || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="text-sm">
                  <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                    profile.verificationStatus === 'VERIFIED' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {profile.verificationStatus === 'VERIFIED' ? 'Active' : 'Suspended'}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          {organizer.events && organizer.events.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-primary-900 mb-4">Events</h2>
              <div className="space-y-2">
                {organizer.events.map((event: any) => (
                  <div key={event.id} className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium text-gray-900">{event.title}</p>
                    <p className="text-sm text-gray-600">
                      {event._count.orders} orders, {event._count.tickets} tickets
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-primary-900 mb-4">Actions</h2>
            <div className="space-y-3">
              {profile.verificationStatus === 'VERIFIED' ? (
                <button
                  onClick={() => handleStatusChange('SUSPENDED')}
                  className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700"
                >
                  Suspend Organizer
                </button>
              ) : (
                <button
                  onClick={() => handleStatusChange('VERIFIED')}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
                >
                  Unsuspend Organizer
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
