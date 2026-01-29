'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { organizerPromoCodeApi, organizerApi } from '@/lib/api';

export default function CreatePromoCodePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [events, setEvents] = useState<any[]>([]);

  // Form state
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState(0);
  const [maxUses, setMaxUses] = useState('');
  const [maxUsesPerUser, setMaxUsesPerUser] = useState(1);
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [eventId, setEventId] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await organizerApi.getEvents();
      if (response.data.success) {
        setEvents(response.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!code.trim()) {
      setError('Promo code is required');
      return;
    }

    if (!validFrom || !validUntil) {
      setError('Valid from and until dates are required');
      return;
    }

    if (new Date(validFrom) >= new Date(validUntil)) {
      setError('Valid until must be after valid from');
      return;
    }

    if (discountValue <= 0) {
      setError('Discount value must be greater than 0');
      return;
    }

    if (discountType === 'PERCENTAGE' && discountValue > 100) {
      setError('Percentage discount cannot exceed 100%');
      return;
    }

    setLoading(true);

    try {
      const response = await organizerPromoCodeApi.create({
        code: code.toUpperCase(),
        description: description || undefined,
        discountType,
        discountValue,
        maxUses: maxUses ? parseInt(maxUses) : undefined,
        maxUsesPerUser,
        validFrom,
        validUntil,
        eventId: eventId || undefined,
        minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : undefined,
        isActive,
      });

      if (response.data.success) {
        router.push('/organizer/promo-codes');
      } else {
        setError(response.data.error || 'Failed to create promo code');
      }
    } catch (err: any) {
      console.error('Error creating promo code:', err);
      setError(err.response?.data?.error || 'Failed to create promo code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <Link href="/organizer/promo-codes" className="text-primary-800 hover:underline">
          ← Back to Promo Codes
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-8">Create Promo Code</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">Promo Code *</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
            placeholder="SUMMER2024"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
            placeholder="Optional description"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Discount Type *</label>
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as 'PERCENTAGE' | 'FIXED')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
            >
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED">Fixed Amount</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Discount Value * ({discountType === 'PERCENTAGE' ? '%' : 'NGN'})
            </label>
            <input
              type="number"
              min="0"
              step={discountType === 'PERCENTAGE' ? '1' : '0.01'}
              max={discountType === 'PERCENTAGE' ? '100' : undefined}
              value={discountValue}
              onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Max Uses (Optional)</label>
            <input
              type="number"
              min="1"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
              placeholder="Unlimited if empty"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Max Uses Per User</label>
            <input
              type="number"
              min="1"
              value={maxUsesPerUser}
              onChange={(e) => setMaxUsesPerUser(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Valid From *</label>
            <input
              type="datetime-local"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Valid Until *</label>
            <input
              type="datetime-local"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Event (Optional - leave empty for global)</label>
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
          >
            <option value="">Global (All Events)</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Minimum Order Amount (Optional)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={minOrderAmount}
            onChange={(e) => setMinOrderAmount(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
            placeholder="No minimum"
          />
        </div>

        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="mr-2"
            />
            <span>Active</span>
          </label>
        </div>

        <div className="flex gap-3 pt-4">
          <Link
            href="/organizer/promo-codes"
            className="flex-1 text-center px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-2 bg-primary-800 text-white rounded-lg hover:bg-primary-900 transition disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Promo Code'}
          </button>
        </div>
      </form>
    </div>
  );
}
