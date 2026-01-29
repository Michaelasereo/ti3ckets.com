'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { Role } from '@prisma/client';

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (userId) {
      loadUser();
    }
  }, [userId]);

  const loadUser = async () => {
    try {
      setLoading(true);
      const response = await adminApi.users.get(userId);
      if (response.data.success) {
        setUser(response.data.data);
      } else {
        setError(response.data.error || 'Failed to load user');
      }
    } catch (err: any) {
      console.error('Error loading user:', err);
      setError(err.response?.data?.error || 'Failed to load user');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async (suspended: boolean) => {
    if (!confirm(`Are you sure you want to ${suspended ? 'suspend' : 'unsuspend'} this user?`)) {
      return;
    }
    try {
      await adminApi.users.updateStatus(userId, { suspended });
      loadUser();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update user status');
    }
  };

  const handleGrantRole = async (role: Role) => {
    if (!confirm(`Grant ${role} role to this user?`)) {
      return;
    }
    try {
      await adminApi.users.grantRole(userId, { role });
      loadUser();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to grant role');
    }
  };

  const handleRevokeRole = async (role: Role) => {
    if (!confirm(`Revoke ${role} role from this user?`)) {
      return;
    }
    try {
      await adminApi.users.revokeRole(userId, role);
      loadUser();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to revoke role');
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

  if (error || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error || 'User not found'}</p>
        </div>
      </div>
    );
  }

  const isSuspended = user.accountLockedUntil && new Date(user.accountLockedUntil) > new Date();
  const roles = user.roles.map((r: any) => r.role);
  const availableRoles = Object.values(Role).filter((r) => !roles.includes(r));

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-primary-800 hover:text-primary-600 mb-4"
        >
          ← Back
        </button>
        <h1 className="text-3xl font-bold text-primary-900 mb-2">User Details</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-primary-900 mb-4">User Information</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="text-sm text-gray-900">{user.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="text-sm text-gray-900">{user.name || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                <dd className="text-sm text-gray-900">{user.phone || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="text-sm">
                  {isSuspended ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800">
                      Suspended
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Created At</dt>
                <dd className="text-sm text-gray-900">{new Date(user.createdAt).toLocaleString()}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-primary-900 mb-4">Roles</h2>
            <div className="space-y-3">
              {roles.map((role: Role) => (
                <div key={role} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-900">{role}</span>
                  <button
                    onClick={() => handleRevokeRole(role)}
                    className="text-red-600 hover:text-red-900 text-sm"
                  >
                    Revoke
                  </button>
                </div>
              ))}
              {availableRoles.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Grant Role:</p>
                  <div className="flex flex-wrap gap-2">
                    {availableRoles.map((role) => (
                      <button
                        key={role}
                        onClick={() => handleGrantRole(role)}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Grant {role}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {user.orders && user.orders.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-primary-900 mb-4">Recent Orders</h2>
              <div className="space-y-2">
                {user.orders.map((order: any) => (
                  <div key={order.id} className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium text-gray-900">{order.orderNumber}</p>
                    <p className="text-sm text-gray-600">{order.event.title}</p>
                    <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {user.events && user.events.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-primary-900 mb-4">Created Events</h2>
              <div className="space-y-2">
                {user.events.map((event: any) => (
                  <div key={event.id} className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium text-gray-900">{event.title}</p>
                    <p className="text-sm text-gray-600">Status: {event.status}</p>
                    <p className="text-xs text-gray-500">{new Date(event.createdAt).toLocaleDateString()}</p>
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
              <button
                onClick={() => handleSuspend(!isSuspended)}
                className={`w-full px-4 py-2 rounded-lg font-medium ${
                  isSuspended
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {isSuspended ? 'Unsuspend User' : 'Suspend User'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
