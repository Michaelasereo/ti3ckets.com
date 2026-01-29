'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import Link from 'next/link';
import { OrganizerVerificationStatus } from '@prisma/client';

export default function AdminOrganizersPage() {
  const [organizers, setOrganizers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState<OrganizerVerificationStatus | ''>('');

  useEffect(() => {
    loadOrganizers();
  }, [page, filterStatus]);

  const loadOrganizers = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 20 };
      if (filterStatus) params.verificationStatus = filterStatus;

      const response = await adminApi.organizers.list(params);
      if (response.data.success) {
        setOrganizers(response.data.data.organizers);
        setTotalPages(response.data.data.pagination.totalPages);
      } else {
        setError(response.data.error || 'Failed to load organizers');
      }
    } catch (err: any) {
      console.error('Error loading organizers:', err);
      setError(err.response?.data?.error || 'Failed to load organizers');
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async (organizerId: string, status: OrganizerVerificationStatus) => {
    try {
      await adminApi.organizers.updateVerification(organizerId, { verificationStatus: status });
      loadOrganizers();
    } catch (err: any) {
      console.error('Error updating verification:', err);
      alert(err.response?.data?.error || 'Failed to update verification status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return 'bg-green-100 text-green-800';
      case 'SUSPENDED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-green-100 text-green-800'; // Default to active
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return 'Active';
      case 'SUSPENDED':
        return 'Suspended';
      default:
        return 'Active'; // Default to active
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary-900 mb-2">Manage Organizers</h1>
        <p className="text-gray-600">View and manage organizer accounts</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filter by Status
        </label>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as OrganizerVerificationStatus | '')}
          className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">All Statuses</option>
          <option value={OrganizerVerificationStatus.VERIFIED}>Active</option>
          <option value={OrganizerVerificationStatus.SUSPENDED}>Suspended</option>
        </select>
      </div>

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-600">Loading organizers...</p>
        </div>
      ) : organizers.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-600">No organizers found</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organizer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Activity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {organizers.map((user) => {
                  const profile = user.organizerProfile;
                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <Link
                            href={`/admin/organizers/${user.id}`}
                            className="text-sm font-medium text-primary-900 hover:text-primary-700"
                          >
                            {user.name || user.email}
                          </Link>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{profile?.businessName || 'N/A'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(profile?.verificationStatus || 'VERIFIED')}`}>
                          {getStatusLabel(profile?.verificationStatus || 'VERIFIED')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <p>{user._count.events} events</p>
                        <p>{user._count.orders} orders</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/organizers/${user.id}`}
                            className="text-primary-600 hover:text-primary-900 text-sm"
                          >
                            View
                          </Link>
                          {profile?.verificationStatus === 'VERIFIED' ? (
                            <button
                              onClick={() => handleVerification(user.id, 'SUSPENDED')}
                              className="text-yellow-600 hover:text-yellow-900 text-sm"
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() => handleVerification(user.id, 'VERIFIED')}
                              className="text-green-600 hover:text-green-900 text-sm"
                            >
                              Unsuspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-600">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
