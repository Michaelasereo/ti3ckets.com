'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { organizerPromoCodeApi, organizerApi } from '@/lib/api';

export default function PromoCodesPage() {
  const router = useRouter();
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPromoCodes();
  }, []);

  const fetchPromoCodes = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await organizerPromoCodeApi.list();
      if (response.data.success) {
        setPromoCodes(response.data.data || []);
      } else {
        setError('Failed to fetch promo codes');
      }
    } catch (err: any) {
      console.error('Error fetching promo codes:', err);
      setError(err.response?.data?.error || 'Failed to fetch promo codes');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promo code?')) {
      return;
    }

    try {
      const response = await organizerPromoCodeApi.delete(id);
      if (response.data.success) {
        fetchPromoCodes();
      } else {
        alert('Failed to delete promo code');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete promo code');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading promo codes...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Promo Codes</h1>
        <Link
          href="/organizer/promo-codes/create"
          className="px-6 py-3 bg-primary-800 text-white rounded-lg font-semibold hover:bg-primary-900 transition"
        >
          Create Promo Code
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {promoCodes.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500 mb-4">You haven't created any promo codes yet.</p>
          <Link
            href="/organizer/promo-codes/create"
            className="text-primary-800 hover:underline font-semibold"
          >
            Create Your First Promo Code
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {promoCodes.map((promoCode) => {
            const now = new Date();
            const validFrom = new Date(promoCode.validFrom);
            const validUntil = new Date(promoCode.validUntil);
            const isActive = promoCode.isActive && now >= validFrom && now <= validUntil;
            const isExpired = now > validUntil;

            return (
              <div
                key={promoCode.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-1">{promoCode.code}</h3>
                    {promoCode.event ? (
                      <p className="text-sm text-gray-600">{promoCode.event.title}</p>
                    ) : (
                      <p className="text-sm text-gray-600">Global</p>
                    )}
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      isActive
                        ? 'bg-green-100 text-green-800'
                        : isExpired
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {isActive ? 'Active' : isExpired ? 'Expired' : 'Inactive'}
                  </span>
                </div>

                {promoCode.description && (
                  <p className="text-sm text-gray-600 mb-4">{promoCode.description}</p>
                )}

                <div className="space-y-2 mb-4">
                  <p className="text-sm">
                    <strong>Discount:</strong>{' '}
                    {promoCode.discountType === 'PERCENTAGE'
                      ? `${promoCode.discountValue}%`
                      : `₦${Number(promoCode.discountValue).toLocaleString()}`}
                  </p>
                  <p className="text-sm">
                    <strong>Usage:</strong> {promoCode.currentUses}
                    {promoCode.maxUses ? ` / ${promoCode.maxUses}` : ''}
                  </p>
                  <p className="text-sm">
                    <strong>Valid:</strong>{' '}
                    {new Date(promoCode.validFrom).toLocaleDateString()} -{' '}
                    {new Date(promoCode.validUntil).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/organizer/promo-codes/${promoCode.id}`}
                    className="flex-1 text-center px-4 py-2 bg-primary-800 text-white rounded hover:bg-primary-900 transition"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(promoCode.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
