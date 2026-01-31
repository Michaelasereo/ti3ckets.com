'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';

interface LaunchWaitlistEntry {
  id: string;
  firstName: string;
  email: string;
  createdAt: string;
}

export default function AdminWaitlistPage() {
  const [entries, setEntries] = useState<LaunchWaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [exporting, setExporting] = useState(false);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const response = await adminApi.launchWaitlist.list({ page, limit: 20 });
      if (response.data.success) {
        setEntries(response.data.data.entries);
        setTotalPages(response.data.data.pagination.totalPages);
      } else {
        setError(response.data.error || 'Failed to load waitlist');
      }
    } catch (err: any) {
      console.error('Error loading waitlist:', err);
      setError(err.response?.data?.error || 'Failed to load waitlist');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, [page]);

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const response = await adminApi.launchWaitlist.exportCsv();
      const blob = response.data as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'launch-waitlist.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Export failed:', err);
      setError(err.response?.data?.error || 'Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary-900 mb-2">Launch waitlist</h1>
          <p className="text-gray-600">People who signed up to be notified at launch</p>
        </div>
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={exporting}
          className="px-4 py-2.5 bg-primary-900 text-white rounded-xl font-medium hover:bg-primary-800 disabled:opacity-50 transition shrink-0"
        >
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No signups yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-primary-900">
                    First name
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-primary-900">
                    Email
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-primary-900">
                    Signed up at
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-primary-900">{entry.firstName}</td>
                    <td className="px-6 py-4 text-primary-900">{entry.email}</td>
                    <td className="px-6 py-4 text-gray-600">{formatDate(entry.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <button
            type="button"
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
            type="button"
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
