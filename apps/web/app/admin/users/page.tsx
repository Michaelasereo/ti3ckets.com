'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import UserTable from '@/components/admin/UserTable';
import { Role } from '@prisma/client';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    role: '',
    search: '',
  });

  useEffect(() => {
    loadUsers();
  }, [page, filters]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 20 };
      if (filters.role) params.role = filters.role;
      if (filters.search) params.search = filters.search;

      const response = await adminApi.users.list(params);
      if (response.data.success) {
        setUsers(response.data.data.users);
        setTotalPages(response.data.data.pagination.totalPages);
      } else {
        setError(response.data.error || 'Failed to load users');
      }
    } catch (err: any) {
      console.error('Error loading users:', err);
      setError(err.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async (userId: string, suspended: boolean) => {
    try {
      await adminApi.users.updateStatus(userId, { suspended });
      loadUsers();
    } catch (err: any) {
      console.error('Error updating user status:', err);
      alert(err.response?.data?.error || 'Failed to update user status');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary-900 mb-2">User Management</h1>
        <p className="text-gray-600">View and manage all platform users</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Role
            </label>
            <select
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Roles</option>
              <option value={Role.BUYER}>Buyer</option>
              <option value={Role.ORGANIZER}>Organizer</option>
              <option value={Role.ADMIN}>Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search by email, name, or phone"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      </div>

      <UserTable
        users={users}
        loading={loading}
        onSuspend={handleSuspend}
      />

      {totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
