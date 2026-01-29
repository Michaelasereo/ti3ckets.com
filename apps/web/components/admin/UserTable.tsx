'use client';

import Link from 'next/link';
import { Role } from '@prisma/client';

interface User {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  createdAt: string;
  accountLockedUntil: string | null;
  roles: Array<{ role: Role }>;
  buyerProfile: { id: string } | null;
  organizerProfile: { id: string; verificationStatus: string; businessName: string | null } | null;
  _count: {
    orders: number;
    events: number;
  };
}

interface UserTableProps {
  users: User[];
  loading?: boolean;
  onSuspend?: (userId: string, suspended: boolean) => void;
  onGrantRole?: (userId: string, role: Role) => void;
  onRevokeRole?: (userId: string, role: Role) => void;
}

export default function UserTable({
  users,
  loading = false,
  onSuspend,
  onGrantRole,
  onRevokeRole,
}: UserTableProps) {
  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="animate-pulse p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
        <p className="text-gray-600">No users found</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Roles
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Activity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => {
              const isSuspended = user.accountLockedUntil && new Date(user.accountLockedUntil) > new Date();
              const roles = user.roles.map((r) => r.role);

              return (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="text-sm font-medium text-primary-900 hover:text-primary-700"
                      >
                        {user.name || user.email}
                      </Link>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      {user.phone && (
                        <p className="text-xs text-gray-400">{user.phone}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {roles.map((role) => (
                        <span
                          key={role}
                          className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isSuspended ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800">
                        Suspended
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      <p>{user._count.orders} orders</p>
                      <p>{user._count.events} events</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        View
                      </Link>
                      {onSuspend && (
                        <button
                          onClick={() => onSuspend(user.id, !isSuspended)}
                          className={`${
                            isSuspended
                              ? 'text-green-600 hover:text-green-900'
                              : 'text-red-600 hover:text-red-900'
                          }`}
                        >
                          {isSuspended ? 'Unsuspend' : 'Suspend'}
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
  );
}
